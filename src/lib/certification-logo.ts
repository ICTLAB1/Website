/**
 * The artwork for a certification, where artwork exists.
 *
 * Keyed on the standard exactly as it is recorded on the certificate, which is
 * also exactly what `Certification.standard` holds and what the site prints.
 * One string, used as the key and as the fallback text, so a lookup that misses
 * cannot leave a certification showing nothing.
 *
 * ## Why a map and not a column
 *
 * The same reasoning as `lib/representative-image`: these three files are in
 * the repository because the business supplied them, and a fourth standard
 * added in the admin panel tomorrow has no file to point at. A `logoUrl` column
 * would ask an administrator for a path that does not exist yet; a map returns
 * null and the standard is set in type instead, which is what the site did
 * before any artwork existed at all and is a perfectly good way to state a
 * certification.
 *
 * Add a file to `public/certifications/` and a line here to switch one on.
 *
 * ## The variants
 *
 * "ISO 27001:2022" and "ISO/IEC 27001:2022" are the same standard written two
 * ways, and both appear in the wild — the seed uses one, a certificate may
 * print the other. Both are listed rather than normalised, because normalising
 * would mean deciding which spelling is canonical for somebody else's
 * certificate.
 */
const LOGOS: Record<string, string> = {
  "ISO 9001:2015": "/certifications/ISO-9001-2015.png",
  "ISO 27001:2022": "/certifications/ISO-27001-2022.png",
  "ISO/IEC 27001:2022": "/certifications/ISO-27001-2022.png",
  "ISO 20000-1:2018": "/certifications/ISO-IEC-20000-1-2018.png",
  "ISO/IEC 20000-1:2018": "/certifications/ISO-IEC-20000-1-2018.png",
};

/**
 * How tall a mark is printed on a document, in points.
 *
 * A height rather than a width, because the files are trimmed to their own ink
 * and so have different widths — see `scripts/rasterise-certification-marks`.
 * One height is what gives a row of them a shared cap height and baseline.
 */
export const CERTIFICATION_MARK_HEIGHT = 30;

/** The artwork for a standard, or null where none has been supplied. */
export function certificationLogo(standard: string): string | null {
  return LOGOS[standard.trim()] ?? null;
}
