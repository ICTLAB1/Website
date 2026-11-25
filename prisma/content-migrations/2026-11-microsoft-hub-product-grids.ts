import type { ContentMigration } from "./types";

/**
 * The product grids on /microsoft-365 and /microsoft-office show the whole range.
 *
 * Each page carried a hand-picked grid of three to five products, from when the
 * catalogue held three to five. It now holds eighteen Microsoft 365 plans and four
 * Office editions, with the Project and Visio 2024 editions beside them. Each grid is
 * replaced only while it still holds exactly the original three to five slugs, so a grid
 * somebody has since edited in the admin panel is left alone.
 */

const M365_OLD = {
  limit: 5,
  slugs: ["microsoft-365-business-basic", "microsoft-365-business-standard", "microsoft-365-business-premium", "microsoft-365-e3", "microsoft-365-e5"],
  action: { href: "/products", label: "Full catalogue" },
  source: "manual",
  heading: "Microsoft 365 in the catalogue",
};
const M365_SLUGS = [
  "microsoft-365-business-basic",
  "microsoft-365-business-standard",
  "microsoft-365-business-premium",
  "microsoft-365-business-standard-with-copilot",
  "microsoft-365-business-premium-with-copilot",
  "microsoft-365-apps-for-business",
  "microsoft-365-e3",
  "microsoft-365-e5",
  "microsoft-365-e7",
  "microsoft-365-apps-for-enterprise",
  "microsoft-365-f3",
  "office-365-e1",
  "office-365-e3",
  "office-365-e5",
  "office-365-f3",
  "microsoft-365-copilot",
  "microsoft-365-personal",
  "microsoft-365-family",
];

const OFFICE_OLD = {
  limit: 3,
  slugs: ["microsoft-office-home-and-business-2024", "microsoft-office-ltsc-professional-plus-2024", "microsoft-365-business-standard"],
  action: { href: "/products", label: "Full catalogue" },
  source: "manual",
  heading: "Office licensing in the catalogue",
};
const OFFICE_SLUGS = [
  "microsoft-office-home-2024",
  "microsoft-office-home-and-business-2024",
  "microsoft-office-ltsc-standard-2024",
  "microsoft-office-ltsc-professional-plus-2024",
  "microsoft-project-standard-2024",
  "microsoft-project-professional-2024",
  "microsoft-visio-standard-2024",
  "microsoft-visio-professional-2024",
  "microsoft-365-business-standard",
];

// Equal whatever order the keys come back in.
const canon = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canon).join(",")}]`
    : value && typeof value === "object"
      ? `{${Object.keys(value as object)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canon((value as Record<string, unknown>)[key])}`)
          .join(",")}}`
      : JSON.stringify(value);
const same = (a: unknown, b: unknown) => canon(a) === canon(b);

export const microsoftHubProductGrids: ContentMigration = {
  id: "2026-11-microsoft-hub-product-grids",
  describe: "product grids on /microsoft-365 and /microsoft-office show the whole range",

  async apply(prisma) {
    const notes: string[] = [];
    const jobs = [
      { slug: "microsoft-365", old: M365_OLD, slugs: M365_SLUGS, heading: "Microsoft 365 plans in the catalogue" },
      { slug: "microsoft-office", old: OFFICE_OLD, slugs: OFFICE_SLUGS, heading: "Office licensing in the catalogue" },
    ];
    for (const job of jobs) {
      const sections = await prisma.pageSection.findMany({
        where: { page: { slug: job.slug }, type: "PRODUCT_GRID" },
        select: { id: true, data: true },
      });
      for (const section of sections) {
        if (!same(section.data, job.old)) continue;
        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: { ...job.old, slugs: job.slugs, limit: job.slugs.length, heading: job.heading } },
        });
        notes.push(`/${job.slug}: product grid now ${job.slugs.length} products`);
      }
    }
    return notes.length > 0 ? notes.join("; ") : "nothing to do";
  },
};
