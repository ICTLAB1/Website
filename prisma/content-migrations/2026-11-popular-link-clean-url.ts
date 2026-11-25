import type { ContentMigration } from "./types";

/*
 * The home page's "See all popular" button linked to /products?sort=popular, a
 * URL robots.txt blocks and that canonicalises to /products anyway. Point it at
 * /products. Exact-value match only: a button an editor has already changed is
 * left alone.
 */
const OLD = "/products?sort=popular";
const NEW = "/products";

export const popularLinkCleanUrl: ContentMigration = {
  id: "2026-11-popular-link-clean-url",
  describe: "the home page's popular-products button links to /products rather than a blocked sort URL",
  async apply(prisma) {
    const sections = await prisma.pageSection.findMany({ where: { type: "PRODUCT_GRID" }, select: { id: true, data: true } });
    let changed = 0;
    for (const section of sections) {
      const data = section.data as { action?: { href?: string } } | null;
      if (data?.action?.href !== OLD) continue;
      await prisma.pageSection.update({
        where: { id: section.id },
        data: { data: { ...data, action: { ...data.action, href: NEW } } },
      });
      changed += 1;
    }
    return changed ? `${changed} button(s) updated` : "nothing to do";
  },
};
