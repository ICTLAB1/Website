/**
 * Where a publisher's logo may be loaded from.
 *
 * An administrator types this value and it lands in an `src` attribute, which
 * makes it the same class of input as a link target: unchecked, it is a place
 * to put `javascript:` or a tracker on somebody else's server. So it is not a
 * URL at all — it is a filename inside one directory this site serves, and
 * anything else is refused rather than sanitised.
 *
 * Local only for a second reason: `next.config.ts` configures no remote image
 * hosts on purpose, so an external logo would not load even if it were allowed.
 *
 * A brand with no artwork on file keeps the styled wordmark it has always had.
 * That is a fallback, not a failure — this business does not hold every
 * publisher's logo, and inventing one is not an option.
 */

/** Artwork committed to the repository, served from `public/brands/`. */
export const BRAND_LOGO_DIR = "/brands/";

/**
 * Artwork uploaded from the admin panel, served by `app/uploads/[name]`.
 *
 * A second directory rather than one, because the two have different
 * guarantees. A file under `/brands/` was put there by someone with repository
 * access and is whatever they named it. A file under `/uploads/` was validated
 * on the way in, is named after a digest of its own contents, and is served
 * with headers that neuter it — so its shape can be checked far more strictly.
 */
export const BRAND_UPLOAD_DIR = "/uploads/";
const UPLOADED_NAME = /^[0-9a-f]{32}\.(png|jpg|webp|avif|svg)$/;

const ALLOWED_EXTENSIONS = [".svg", ".png", ".webp", ".jpg", ".jpeg", ".avif"];

/**
 * Returns the path if it is a safe local brand logo, and null otherwise.
 *
 * Rejects anything with a scheme, a protocol-relative prefix, a parent-directory
 * segment, a query or a fragment — and anything outside `/brands/`. The check is
 * an allowlist on the whole shape rather than a blocklist of bad prefixes,
 * because a blocklist here is a list of the tricks somebody has thought of.
 */
export function safeBrandLogo(value: string | null | undefined): string | null {
  if (!value) return null;

  const path = value.trim();
  if (path.length === 0 || path.length > 200) return null;

  /*
   * An uploaded file is checked against the exact shape the uploader produces.
   * Nothing about that name came from a person, so an exact match is available
   * here and is stronger than any character filter.
   */
  if (path.startsWith(BRAND_UPLOAD_DIR)) {
    const uploaded = path.slice(BRAND_UPLOAD_DIR.length);
    return UPLOADED_NAME.test(uploaded) ? path : null;
  }

  // No scheme, no protocol-relative, no traversal, no query or fragment.
  if (!path.startsWith(BRAND_LOGO_DIR)) return null;
  if (path.includes("..") || path.includes("//") || path.includes("\\")) return null;
  if (path.includes("?") || path.includes("#")) return null;

  const name = path.slice(BRAND_LOGO_DIR.length);
  if (name.length === 0 || name.includes("/")) return null;

  // A conservative filename: letters, digits, dash, underscore, one dot.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) return null;

  const lower = name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((extension) => lower.endsWith(extension))) return null;

  return path;
}
