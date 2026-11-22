import type { ContentMigration } from "./types";

/**
 * The homepage title and description now say the business sells hardware.
 *
 * Both described a software-licensing company, which is how visitors and search
 * results were reading the whole site, although the Hardware menu, the
 * business-computer pages and forty infrastructure products have been there
 * all along. The title is a CMS field, so a database that is already seeded
 * needs this correction.
 *
 * Like the earlier title migration, it changes a row only if it still holds
 * the exact text this release replaces. A title or description someone has
 * since rewritten in the admin panel is a decision, and is left alone.
 */

const TITLE_WAS = "TechZoid | Enterprise Software Licensing & IT Solutions";
const TITLE_NOW = "TechZoid | Software Licensing, IT Hardware & Solutions";

const DESCRIPTION_WAS =
  "Microsoft, Adobe, Autodesk, Zoho and enterprise technology from one procurement partner. Consolidated quotations, GST invoicing and licence management.";
const DESCRIPTION_NOW =
  "Microsoft, Adobe and Autodesk licensing plus business laptops, desktops and servers from one procurement partner. One quotation, GST invoicing, licence support.";

export const homepageNamesHardware: ContentMigration = {
  id: "2026-11-homepage-names-hardware",
  describe: "hardware in the homepage title and description",

  async apply(prisma) {
    const title = await prisma.page.updateMany({
      where: { slug: "", title: TITLE_WAS },
      data: { title: TITLE_NOW },
    });
    const description = await prisma.page.updateMany({
      where: { slug: "", description: DESCRIPTION_WAS },
      data: { description: DESCRIPTION_NOW },
    });

    return `homepage title ${title.count > 0 ? "updated" : "left as it was"}, description ${
      description.count > 0 ? "updated" : "left as it was"
    }`;
  },
};
