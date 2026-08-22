import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Files an administrator uploads, and the rules that keep them harmless.
 *
 * Only brand logos use this today. It exists because the alternative was SSH:
 * `public/` is copied into the container image at build time, so a file dropped
 * there on a running server disappears at the next rebuild, and the owner of
 * this site should not need a terminal to put a publisher's logo on a card.
 *
 * ## Where they live
 *
 * A directory outside the application, mounted as a Docker volume, so uploads
 * survive a rebuild the way the database does. `UPLOAD_DIR` names it; in
 * development it defaults to a folder beside the source that git ignores.
 *
 * ## Why the file is re-read rather than trusted
 *
 * An upload arrives with a name, a declared type and a size, and all three are
 * written by whoever is uploading. None are evidence. So the bytes are examined
 * instead: the first few must match one of the image formats this accepts, the
 * stored name is a hash of the content rather than anything supplied, and the
 * type served back is the one detected — never the one claimed.
 *
 * That leaves SVG, which is not really an image so much as a document that can
 * contain script. It is accepted because vector logos are the whole point, and
 * defanged where it is served: see `app/uploads/[name]/route.ts`, which sends a
 * content-security policy that permits nothing at all.
 */

export const MAX_UPLOAD_BYTES = 512 * 1024;

/** Where uploads are kept. A volume in production; ignored by git in dev. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR?.trim() || join(process.cwd(), ".uploads");
}

export type UploadKind = { extension: string; contentType: string };

/**
 * Formats accepted, identified by their leading bytes.
 *
 * A declared `image/png` proves nothing; these signatures are what the file
 * actually is. SVG has no binary signature, so it is matched on its text
 * opening instead and handled separately below.
 */
const SIGNATURES: Array<{ bytes: number[]; offset?: number; kind: UploadKind }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], kind: { extension: "png", contentType: "image/png" } },
  { bytes: [0xff, 0xd8, 0xff], kind: { extension: "jpg", contentType: "image/jpeg" } },
  // RIFF....WEBP — the format tag sits at byte 8, after the size field.
  { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8, kind: { extension: "webp", contentType: "image/webp" } },
  // ftypavif, likewise at byte 4 inside the ISO-BMFF box header.
  { bytes: [0x61, 0x76, 0x69, 0x66], offset: 8, kind: { extension: "avif", contentType: "image/avif" } },
];

function looksLikeSvg(buffer: Buffer): boolean {
  // Only the opening is inspected, and only for a genuine root element. A
  // leading byte-order mark, an XML declaration or a comment may come first.
  const head = buffer.subarray(0, 1024).toString("utf8").trimStart().replace(/^﻿/, "");
  const withoutProlog = head.replace(/^<\?xml[\s\S]*?\?>\s*/i, "").replace(/^<!--[\s\S]*?-->\s*/, "");
  return /^<(!doctype\s+svg|svg[\s>])/i.test(withoutProlog.trimStart());
}

/** The format these bytes actually are, or null if they are not an image. */
export function detectImage(buffer: Buffer): UploadKind | null {
  for (const signature of SIGNATURES) {
    const offset = signature.offset ?? 0;
    if (buffer.length < offset + signature.bytes.length) continue;
    if (signature.bytes.every((byte, index) => buffer[offset + index] === byte)) {
      return signature.kind;
    }
  }
  if (looksLikeSvg(buffer)) return { extension: "svg", contentType: "image/svg+xml" };
  return null;
}

export type StoredUpload = { name: string; url: string; contentType: string };

/**
 * Writes a validated upload and returns the name it was given.
 *
 * The name is a digest of the contents. Two consequences, both wanted: the same
 * logo uploaded twice occupies one file, and no part of a caller's input
 * reaches the filesystem — which is what makes path traversal unrepresentable
 * here rather than merely filtered out.
 */
export async function storeUpload(buffer: Buffer): Promise<StoredUpload | null> {
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) return null;

  const kind = detectImage(buffer);
  if (!kind) return null;

  const digest = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
  const name = `${digest}.${kind.extension}`;

  const directory = uploadDir();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, name), buffer);

  return { name, url: `/uploads/${name}`, contentType: kind.contentType };
}

/**
 * Reads a stored upload by name.
 *
 * The name is matched against the exact shape `storeUpload` produces — 32 hex
 * characters and a known extension — before it is used in a path. Anything else
 * is refused without touching the filesystem, so a request for `../../etc/…`
 * never becomes a read.
 */
const STORED_NAME = /^[0-9a-f]{32}\.(png|jpg|webp|avif|svg)$/;

export async function readUpload(name: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (!STORED_NAME.test(name)) return null;

  let body: Buffer;
  try {
    body = await readFile(join(uploadDir(), name));
  } catch {
    return null;
  }

  // Typed from the bytes on the way out as well as in. A file replaced on disk
  // by any other route than `storeUpload` still cannot choose its own type.
  const kind = detectImage(body);
  if (!kind) return null;

  return { body, contentType: kind.contentType };
}
