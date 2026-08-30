import type { ContentMigration } from "./types";

/**
 * A homepage headline a buyer would actually search for.
 *
 * It read "Trusted IT & Software Solutions Partner". That is the sentence
 * every competitor in this category also writes, which is precisely why it
 * ranks for nothing: there is no search demand behind "trusted partner", and
 * the H1 is the strongest on-page signal the homepage has.
 *
 * The product titles on this site were written properly — "Autodesk Revit
 * Licence Price India | Named-User Subscription" carries the product, the
 * intent and the geography. The homepage never got the same treatment. This
 * gives it the same three things: the publishers that hold the demand, the
 * market, and the buyer.
 *
 * Every part of it is backed by the catalogue rather than aspirational:
 * nineteen Microsoft products, nine Autodesk, eight Adobe, and a public-sector
 * customer list and GeM registration behind "government".
 *
 * Hardware is not in the headline and belongs in it least — the subheadline
 * already names it, and an H1 that tries to carry both halves of a catalogue
 * carries neither. The demand this line is written for is "microsoft 365 price
 * india" and its neighbours.
 *
 * The eyebrow above it is untouched. It states a partner status and a GeM
 * registration, which are claims about relationships and not something a
 * copy migration should be rewriting.
 *
 * Matched against the exact text it replaces, so a headline somebody has since
 * edited in the admin panel is reported and left alone.
 */

const FROM = "Trusted IT & Software Solutions Partner";
const TO = "Microsoft, Adobe and Autodesk licensing for Indian enterprises and government";

export const homepageHeadline: ContentMigration = {
  id: "2026-08-homepage-headline",
  describe: "a homepage headline with search demand behind it",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { sections: { select: { id: true, type: true, data: true } } },
    });
    if (!page) return "no homepage record to change";

    const hero = page.sections.find(
      (row) =>
        row.type === "HERO" &&
        (row.data as Record<string, unknown> | null)?.headline === FROM,
    );
    if (!hero) {
      const current = page.sections.find((row) => row.type === "HERO");
      const headline = (current?.data as Record<string, unknown> | null)?.headline;
      return headline === TO
        ? "the homepage headline is already the new one"
        : `the homepage headline is "${String(headline ?? "missing")}", not the one this expected — left alone`;
    }

    await prisma.pageSection.update({
      where: { id: hero.id },
      data: { data: { ...(hero.data as Record<string, unknown>), headline: TO } },
    });

    return `homepage headline changed to "${TO}"`;
  },
};
