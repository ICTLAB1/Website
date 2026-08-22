/**
 * Where an image referenced by a database row may be loaded from.
 *
 * Brand logos and product photographs are the same class of input: a value
 * somebody typed or imported, which ends up in an `src` attribute. Unchecked,
 * that is a place to put `javascript:`, a tracker on somebody else's server, or
 * a path that walks out of the directory it was meant to stay in.
 *
 * So the value is not treated as a URL at all. It is a filename inside one of
 * two directories this site serves, and anything else is refused rather than
 * sanitised — an allowlist on the whole shape, not a blocklist of the tricks
 * somebody has thought of.
 *
 * Local only for a second reason: `next.config.ts` configures no remote image
 * hosts on purpose, so an external image would not load even if it were
 * allowed.
 */

/**
 * Artwork uploaded from the admin panel, served by `app/uploads/[name]`.
 *
 * A separate directory from committed artwork, because the two have different
 * guarantees. A committed file was put there by someone with repository access
 * and is whatever they named it. An uploaded file was validated on the way in,
 * is named after a digest of its own contents, and is served with headers that
 * neuter it — so its shape can be checked far more strictly, and is.
 */
export const UPLOAD_DIR = "/uploads/";
const UPLOADED_NAME = /^[0-9a-f]{32}\.(png|jpg|webp|avif|svg)$/;

const ALLOWED_EXTENSIONS = [".svg", ".png", ".webp", ".jpg", ".jpeg", ".avif"];

/**
 * Returns the path if it is a safe local image in `dir`, and null otherwise.
 *
 * Rejects anything with a scheme, a protocol-relative prefix, a parent-directory
 * segment, a query or a fragment — and anything outside `dir` or the upload
 * directory.
 */
export function safeLocalImage(value: string | null | undefined, dir: string): string | null {
  if (!value) return null;

  const path = value.trim();
  if (path.length === 0 || path.length > 200) return null;

  /*
   * An uploaded file is checked against the exact shape the uploader produces.
   * Nothing about that name came from a person, so an exact match is available
   * here and is stronger than any character filter.
   */
  if (path.startsWith(UPLOAD_DIR)) {
    const uploaded = path.slice(UPLOAD_DIR.length);
    return UPLOADED_NAME.test(uploaded) ? path : null;
  }

  // No scheme, no protocol-relative, no traversal, no query or fragment.
  if (!path.startsWith(dir)) return null;
  if (path.includes("..") || path.includes("//") || path.includes("\\")) return null;
  if (path.includes("?") || path.includes("#")) return null;

  const name = path.slice(dir.length);
  if (name.length === 0 || name.includes("/")) return null;

  // A conservative filename: letters, digits, dash, underscore, one dot.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) return null;

  const lower = name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension))) return null;

  return path;
}
