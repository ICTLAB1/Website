/**
 * What a file's own bytes say it is.
 *
 * Split out of `lib/uploads` so it can be used where that module cannot be:
 * `uploads` is `server-only` and reaches the filesystem, and the hardware
 * importer is a command-line script that needs the same question answered about
 * a manufacturer's photograph before copying it into the repository.
 *
 * The question is worth asking in both places for the same reason. A declared
 * type and a file extension are both things a caller wrote; only the leading
 * bytes are the file.
 */
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
