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
 * ## The artwork
 *
 * Three certified-company seals, supplied by the business on 24 August 2026 and
 * replacing the wide tick-style marks that stood here before. Each was flattened
 * to a pure white ground, trimmed to the seal and padded to a square, so all
 * three occupy the same box and a contain-fit renderer draws them at the same
 * diameter — three circles that each began at a different size read as three
 * different certifications however carefully the row is spaced.
 *
 * They are 420 pixels square on a 128-colour palette. The files arrived at half
 * a megabyte each, which is more than the rest of the homepage put together and
 * rode along inside every quotation PDF as well; a flat-colour seal loses
 * nothing to a palette, and 420 is four times the largest size anything here
 * draws them at.
 *
 * They are drawn only on white. A seal is issued as finished artwork on a light
 * ground; the dark footer keeps the standard and the certificate number in type
 * instead, which is the more useful form there anyway.
 *
 * ## The trademark question, recorded rather than decided
 *
 * These seals carry an ISO-style globe device and name no certification body.
 * ISO's published position is that a certified organisation states its
 * certification and uses the mark of the body that issued it, never ISO's own
 * — which is why an earlier version of this directory built its artwork from
 * the one supplied file that carried no such device, and why the file that did
 * was left out.
 *
 * The artwork here is what the business supplied and asked to be shown, and
 * that is the business's call to make. It is written down here so that whoever
 * next opens this file knows the question was asked. Replacing all three with
 * the certification body's own accredited mark is a matter of dropping three
 * files into `public/certifications/` under these names; no code changes.
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

/** The artwork for a standard, or null where none has been supplied. */
export function certificationLogo(standard: string): string | null {
  return LOGOS[standard.trim()] ?? null;
}
