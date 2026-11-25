import type { ContentMigration } from "./types";

/**
 * Product grids on the Adobe and Autodesk pages that left out products which belong beside
 * the one they show.
 *
 * Each page's grid was written when the catalogue held a few products per family, and shows
 * two or three. `/adobe-acrobat` showed Pro and Standard but not Studio or the AI Assistant;
 * `/autocad` omitted AutoCAD LT, AutoCAD Web and the AutoCAD and Revit LT suite; `/maya`
 * omitted 3ds Max; and so on. Each grid is replaced only while it still holds exactly the
 * original slugs, so one edited in the admin panel is left alone.
 */
const ACTION = { href: "/products", label: "Full catalogue" };

type Job = { page: string; heading: string; limit: number; slugs: string[]; action: { href: string; label: string }; next: string[] };

const JOBS: Job[] = [
  { page: "adobe-acrobat", heading: "Acrobat licensing", limit: 2, slugs: ["adobe-acrobat-pro-teams", "adobe-acrobat-standard-teams"], action: ACTION,
    next: ["adobe-acrobat-pro-teams", "adobe-acrobat-standard-teams", "adobe-acrobat-studio", "adobe-ai-assistant-for-acrobat"] },
  { page: "adobe-acrobat-pro", heading: "Buy Acrobat Pro", limit: 2, slugs: ["adobe-acrobat-pro-teams", "adobe-acrobat-standard-teams"], action: ACTION,
    next: ["adobe-acrobat-pro-teams", "adobe-acrobat-standard-teams", "adobe-acrobat-studio"] },
  { page: "adobe-creative-cloud", heading: "Creative Cloud licensing", limit: 3, slugs: ["adobe-creative-cloud-all-apps-teams", "adobe-creative-cloud-single-app-teams", "adobe-creative-cloud-enterprise"], action: ACTION,
    next: ["adobe-creative-cloud-all-apps-teams", "adobe-creative-cloud-single-app-teams", "adobe-creative-cloud-enterprise", "adobe-substance-3d-collection"] },
  { page: "autocad", heading: "AutoCAD licensing", limit: 3, slugs: ["autocad", "aec-collection", "autodesk-civil-3d"], action: ACTION,
    next: ["autocad", "autocad-lt", "autocad-web", "autocad-revit-lt-suite", "aec-collection", "autodesk-civil-3d"] },
  { page: "revit", heading: "Revit licensing and hardware", limit: 3, slugs: ["revit", "aec-collection", "dell-precision-workstation"], action: ACTION,
    next: ["revit", "autodesk-revit-lt", "autocad-revit-lt-suite", "aec-collection", "autodesk-navisworks-simulate", "dell-precision-workstation"] },
  { page: "fusion-360", heading: "Fusion licensing", limit: 2, slugs: ["fusion-360", "autodesk-product-design-manufacturing-collection"], action: ACTION,
    next: ["fusion-360", "autodesk-fusion-for-design", "autodesk-fusion-for-manufacturing", "autodesk-product-design-manufacturing-collection"] },
  { page: "maya", heading: "Maya licensing and workstations", limit: 2, slugs: ["maya", "dell-precision-workstation"], action: ACTION,
    next: ["maya", "3ds-max", "autodesk-arnold", "autodesk-media-entertainment-collection", "dell-precision-workstation"] },
  { page: "aec-collection", heading: "Collection and standalone licensing", limit: 4, slugs: ["aec-collection", "revit", "autocad", "autodesk-civil-3d"], action: ACTION,
    next: ["aec-collection", "revit", "autocad", "autodesk-civil-3d", "autodesk-navisworks-simulate", "autodesk-infraworks"] },
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

export const adobeAutodeskProductGrids: ContentMigration = {
  id: "2026-11-adobe-autodesk-product-grids",
  describe: "Adobe and Autodesk page product grids show the related products they left out",

  async apply(prisma) {
    const notes: string[] = [];
    for (const job of JOBS) {
      const old = { limit: job.limit, slugs: job.slugs, action: job.action, source: "manual", heading: job.heading };
      const sections = await prisma.pageSection.findMany({
        where: { page: { slug: job.page }, type: "PRODUCT_GRID" },
        select: { id: true, data: true },
      });
      for (const section of sections) {
        if (canon(section.data) !== canon(old)) continue;
        const present = await prisma.product.findMany({ where: { slug: { in: job.next }, status: "ACTIVE", deletedAt: null }, select: { slug: true } });
        const have = new Set(present.map((row) => row.slug));
        const slugs = job.next.filter((slug) => have.has(slug));
        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: { ...old, slugs, limit: slugs.length } },
        });
        notes.push(`/${job.page}: ${slugs.length} products`);
      }
    }
    return notes.length > 0 ? notes.join("; ") : "nothing to do";
  },
};

