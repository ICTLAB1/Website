import type { ContentMigration } from "./types";

/**
 * "About Us" is not a title anybody searches for.
 *
 * A live crawl of fifteen pages on 25 August 2026 found exactly one title
 * problem on the site, and this was it: eight characters, rendering as "About
 * Us | TechZoid". Every other page states what it is about — "AutoCAD Licensing
 * & Pricing", "Resource Centre" — and this one, which is the page a buyer reads
 * before deciding whether to trust a supplier, said nothing at all.
 *
 * The replacement deliberately does not begin "About TechZoid". Every title on
 * this site is suffixed with the trading name by the metadata template, so a
 * title that opens with it prints the name twice and spends a third of the
 * space Google shows on saying it. The description was already good and is left
 * alone.
 */
const STALE = "About Us";
const CORRECT = "An enterprise IT procurement partner in India";

export const aboutTitle: ContentMigration = {
  id: "2026-08-about-title",
  describe: "the About page's title says what the page is about",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "about" },
      select: { id: true, title: true },
    });

    if (!page) return "there is no About page — nothing to correct";
    if (page.title === CORRECT) return "the About page already carries the longer title";
    if (page.title !== STALE) return `the About page reads "${page.title}" — left alone`;

    await prisma.page.update({ where: { id: page.id }, data: { title: CORRECT } });
    return "the About page's title now names the business and what it does";
  },
};
