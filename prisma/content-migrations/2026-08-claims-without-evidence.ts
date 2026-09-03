import type { ContentMigration } from "./types";

/**
 * Two homepage sentences that describe something the page does not show.
 *
 * ## The certifications line
 *
 * It read: "Assessed by accredited certification bodies against international
 * standards. Each certificate number below can be checked with the body that
 * issued it."
 *
 * There are no certificate numbers below. They were taken off the site on the
 * owner's instruction, and the sentence that invited a reader to check them was
 * left behind — so the page now offers verification it cannot support, which is
 * worse than saying nothing. A government buyer is exactly the reader who tries.
 *
 * The first sentence is kept because it is true and unchanged. The second goes.
 * Restoring it is a two-part job: put the numbers back on the cards, then put
 * the invitation back beside them, in that order.
 *
 * ## The "500+" footnote
 *
 * "500+ organisations supplied across India." No count behind it that anybody
 * here can produce, and it sits directly under a list of named organisations,
 * which is the position that makes a reader treat it as the same kind of fact.
 * It is removed rather than softened: a vaguer version of an unevidenced number
 * is still an unevidenced number.
 *
 * It goes back the day somebody runs the count out of the order register and
 * saves the result with a date on it. The field it lived in is untouched and
 * still editable at /admin/pages, so restoring it is typing it back in — no
 * code change, and no migration to reverse.
 *
 * Both are matched against the exact text they replace, so a sentence somebody
 * has since rewritten is reported and left alone.
 */

const CERT_HEADING = "Certifications";
const CERT_FROM =
  "Assessed by accredited certification bodies against international standards. " +
  "Each certificate number below can be checked with the body that issued it.";
const CERT_TO = "Assessed by accredited certification bodies against international standards.";

const CHIP_HEADING = "Organisations we have supplied technology to";
const FOOTNOTE_FROM = "500+ organisations supplied across India.";

export const claimsWithoutEvidence: ContentMigration = {
  id: "2026-08-claims-without-evidence",
  describe: "two homepage sentences pointing at evidence the page does not show",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { sections: { select: { id: true, type: true, data: true } } },
    });
    if (!page) return "no homepage record to change";

    const done: string[] = [];

    const certs = page.sections.find((row) => {
      const data = row.data as Record<string, unknown> | null;
      return data?.heading === CERT_HEADING && data?.description === CERT_FROM;
    });
    if (certs) {
      await prisma.pageSection.update({
        where: { id: certs.id },
        data: { data: { ...(certs.data as Record<string, unknown>), description: CERT_TO } },
      });
      done.push("the certifications line no longer invites a check of numbers that are not shown");
    }

    const chips = page.sections.find((row) => {
      const data = row.data as Record<string, unknown> | null;
      return data?.heading === CHIP_HEADING && data?.footnote === FOOTNOTE_FROM;
    });
    if (chips) {
      // Rebuilt without the key rather than set to null: the block schema
      // treats an absent footnote as "no footnote" and a null as a value that
      // failed to load.
      const { footnote: _removed, ...rest } = chips.data as Record<string, unknown>;
      void _removed;
      await prisma.pageSection.update({
        where: { id: chips.id },
        data: { data: rest as Parameters<typeof prisma.pageSection.update>[0]["data"]["data"] },
      });
      done.push('the unevidenced "500+ organisations" footnote is removed');
    }

    if (done.length === 0) return "both sentences have already been changed — left alone";
    return done.join("; ");
  },
};
