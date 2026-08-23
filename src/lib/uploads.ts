import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { detectImage, type UploadKind } from "@/lib/image-bytes";

// Re-exported so the callers that already ask this module what a file is do not
// all have to learn where the answer moved to.
export { detectImage };
export type { UploadKind };

/**
 * Files an administrator uploads, and the rules that keep them harmless.
 *
 * Brand logos and product photographs. It exists because the alternative was
 * SSH: `public/` is copied into the container image at build time, so a file
 * dropped there on a running server disappears at the next rebuild, and the
 * owner of this site should not need a terminal to put a publisher's logo on a
 * card or a photograph on a catalogue entry.
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

/**
 * The budget for a logo.
 *
 * Small on purpose. A brand mark that does not fit in half a megabyte is
 * almost always a photograph or an uncompressed export rather than a logo, and
 * refusing it says so more usefully than accepting it and serving eight
 * megabytes to every visitor.
 */
export const MAX_UPLOAD_BYTES = 512 * 1024;

/**
 * The budget for a product photograph.
 *
 * Four times the logo limit, because the two are different things: a
 * photograph of a laptop at a usable resolution is a megabyte of JPEG and
 * there is no version of it that is not. Still bounded — the number is a cap
 * on what one careless upload can cost every page that shows the product, not
 * an invitation to put a 12-megapixel original in a catalogue card.
 */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * The formats a product photograph may be. Raster only — no SVG.
 *
 * Vector artwork is the whole reason SVG is accepted for logos, and the reason
 * `app/uploads/[name]/route.ts` has to serve it under a policy that permits
 * nothing: an SVG is a document that can carry script. A photograph has no such
 * reason, so the narrower surface is taken where it costs nothing.
 *
 * Both forms live here rather than beside the action, because a `"use server"`
 * module may only export async functions — and because the list the file input
 * offers and the list the server enforces drifting apart is precisely the bug
 * this arrangement prevents.
 */
export const PHOTO_FORMATS = ["png", "jpg", "webp", "avif"] as const;

/** The same set, as an `accept` attribute for a file input. */
export const PHOTO_ACCEPT = "image/png,image/jpeg,image/webp,image/avif";

/** Where uploads are kept. A volume in production; ignored by git in dev. */
export function uploadDir(): string {
  return process.env.UPLOAD_DIR?.trim() || join(process.cwd(), ".uploads");
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
export async function storeUpload(
  buffer: Buffer,
  options: {
    /** Defaults to the logo budget, so an existing caller is unchanged. */
    maxBytes?: number;
    /**
     * Extensions this caller will accept, if it accepts fewer than all of them.
     *
     * Exists for one case: a product photograph must not be an SVG. A vector
     * logo is the reason SVG is accepted at all, and the reason it needs the
     * defanging in `app/uploads/[name]/route.ts`. A photograph has no such
     * reason, so the narrower surface is simply taken where it is free.
     */
    allow?: readonly string[];
  } = {},
): Promise<StoredUpload | null> {
  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  if (buffer.length === 0 || buffer.length > maxBytes) return null;

  const kind = detectImage(buffer);
  if (!kind) return null;
  if (options.allow && !options.allow.includes(kind.extension)) return null;

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
