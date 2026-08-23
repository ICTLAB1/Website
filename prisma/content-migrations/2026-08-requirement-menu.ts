import { navigationSeeds } from "../seed-data/pages";
import type { ContentMigration } from "./types";

/**
 * The way in for a customer who does not know the product.
 *
 * A page nobody can find is a page that does not exist, and this one answers
 * the most common opening in enterprise procurement — a headcount and a
 * deadline rather than a part number. It goes first in the Products menu,
 * above the brands, because somebody who knew the brand would not need it.
 *
 * Matched on label within its parent, so re-running produces no second copy.
 */
export const requirementMenu: ContentMigration = {
  id: "2026-08-requirement-menu",
  describe: "the requirement builder in the products menu",

  async apply(prisma) {
    const wanted = navigationSeeds.find((item) => item.key === "header:products.requirement");
    if (!wanted) return "no menu entry defined — skipped";

    const products = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", parentId: null, label: "Products" },
      select: { id: true },
    });
    if (!products) return "no Products menu to add to — skipped";

    const existing = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", parentId: products.id, label: wanted.label },
      select: { id: true },
    });
    if (existing) return "already there — left alone";

    await prisma.navigationItem.create({
      data: {
        menu: "HEADER",
        parentId: products.id,
        label: wanted.label,
        href: wanted.href,
        description: wanted.description,
        displayOrder: wanted.displayOrder,
      },
    });

    return "menu entry added";
  },
};
