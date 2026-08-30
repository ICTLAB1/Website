import type { ContentMigration } from "./types";

/**
 * Artwork for four of the six organisations that had a row and no mark.
 *
 * The rows were created by `2026-08-more-organisations` with `logoUrl` null,
 * because the marks had arrived pasted into a conversation rather than as
 * files. Files followed, in `claude_government_client_logos.zip`, and four of
 * the six are usable: Sardar Patel University, Nagpur Metro, RITES and the
 * Bhabha Atomic Research Centre. Each was prepared by
 * `scripts/prepare-client-logo.mjs` — the uniform border trimmed and the
 * artwork scaled to the common height, the same two operations the first nine
 * emblems had, and nothing else.
 *
 * ## The two that are not here, and one that is here under another name
 *
 *  - **HUDCO.** The supplied file is a marketing banner rather than a mark:
 *    the hudco logo set over a grey cityscape with a captioned bar beneath it,
 *    on an opaque plate. Rendered fourteen pixels tall in a belt it is a grey
 *    smear. Extracting the mark means cropping into the picture, which is the
 *    line the preparation script does not cross, so the row keeps its null and
 *    the file to ask for is the mark on its own.
 *  - **National Security Guard.** Still never supplied as a file.
 *  - **IRCON.** The zip contains `IRCON.png`, and the image inside it is the
 *    RITES mark — the running figure and "THE INFRASTRUCTURE PEOPLE". So the
 *    file is installed as RITES, which is an organisation the business has
 *    already named, and no IRCON row is created: a filename is not evidence of
 *    a customer relationship, and inventing one from a mislabelled file is
 *    exactly the kind of claim that must not appear here.
 *
 * The national emblem was also in the zip and is not installed. It is not an
 * organisation, and the Emblems and Names (Prevention of Improper Use) Act,
 * 1950 names it specifically.
 *
 * Only rows whose `logoUrl` is still null are written, so a mark somebody
 * uploaded from the admin panel in the meantime is not overwritten, and a
 * second run does nothing.
 */

const ARTWORK: Array<{ id: string; name: string; logoUrl: string }> = [
  { id: "org-sardar-patel-university", name: "Sardar Patel University", logoUrl: "/clients/sardar-patel-university.webp" },
  { id: "org-nagpur-metro", name: "Nagpur Metro", logoUrl: "/clients/nagpur-metro.webp" },
  { id: "org-rites", name: "RITES", logoUrl: "/clients/rites.webp" },
  { id: "org-barc", name: "Bhabha Atomic Research Centre", logoUrl: "/clients/barc.webp" },
];

/** Recorded on each row, so the next person can see what was done and to what. */
const SOURCE =
  "Artwork supplied by the business in claude_government_client_logos.zip. " +
  "Border trimmed and scaled to a common height by scripts/prepare-client-logo.mjs; " +
  "nothing recoloured, cropped into or recomposed. " +
  "The authorising person and date still need entering here.";

export const organisationArtworkSecondBatch: ContentMigration = {
  id: "2026-08-organisation-artwork-second-batch",
  describe: "artwork for four organisations that had a row and no mark",

  async apply(prisma) {
    const installed: string[] = [];

    for (const mark of ARTWORK) {
      const row = await prisma.clientLogo.findUnique({
        where: { id: mark.id },
        select: { id: true, logoUrl: true, permissionReference: true },
      });
      if (!row || row.logoUrl) continue;

      await prisma.clientLogo.update({
        where: { id: mark.id },
        data: {
          logoUrl: mark.logoUrl,
          // Kept if somebody has written a real one; filled in only where the
          // field is empty, so this records rather than overwrites.
          permissionReference: row.permissionReference ?? SOURCE,
          published: true,
        },
      });
      installed.push(mark.name);
    }

    if (installed.length === 0) return "the four organisation marks are already installed";

    return `${installed.length} organisation mark(s) installed: ${installed.join(", ")}`;
  },
};
