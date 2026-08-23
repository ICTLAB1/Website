import type { ContentMigration } from "./types";

/**
 * The company's name in the homepage's title tag.
 *
 * The homepage was the one page on the site whose `<title>` did not name the
 * business. Not an oversight in the copy — a consequence of how Next.js
 * composes titles: `title.template` in the root layout appends the trading name
 * to every *child* segment's title, and `app/page.tsx` is not a child segment,
 * it is the same one. So the suffix that reached all 200 other pages skipped
 * the single page most likely to be returned for a search on the company's own
 * name, where it appeared as a description of an industry with no indication of
 * whose site it was.
 *
 * The homepage's title is a CMS field, so this is where the correction has to
 * land for a database that has already been seeded.
 *
 * ## Why the shorter wording
 *
 * "TechZoid Technologies | Enterprise Software Licensing, Cloud & IT Solutions"
 * is the fuller form and is 75 characters. A search result cuts a title at
 * roughly 60 and shows an ellipsis, so that version arrives truncated mid-word.
 * At 55, this one survives whole. The registered name is in the footer, in the
 * Organization schema and on the legal pages, which is where a search engine
 * reads it properly.
 *
 * ## Why it checks the old value first
 *
 * The title is editable in the admin panel. If somebody has already rewritten
 * it — including to something better than this — that is a decision, and a
 * migration that overwrites it would be undoing a person's work on the strength
 * of a release note. It changes the row only if it still holds the exact string
 * this release is correcting.
 */

const WAS = "Enterprise Software Licensing, Cloud & IT Solutions";
const NOW = "TechZoid | Enterprise Software Licensing & IT Solutions";

export const homepageTitle: ContentMigration = {
  id: "2026-08-homepage-title",
  describe: "the company name in the homepage title tag",

  async apply(prisma) {
    const updated = await prisma.page.updateMany({
      where: { slug: "", title: WAS },
      data: { title: NOW },
    });

    if (updated.count > 0) return `homepage title now names the company (${NOW.length} characters)`;

    const current = await prisma.page.findFirst({
      where: { slug: "" },
      select: { title: true },
    });

    if (!current) return "no homepage record to correct";
    if (current.title === NOW) return "homepage title is already correct";
    return `homepage title left alone — it has been edited since ("${current.title}")`;
  },
};
