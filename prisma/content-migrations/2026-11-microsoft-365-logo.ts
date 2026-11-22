import type { ContentMigration } from "./types";

/**
 * The Microsoft 365 logo on the Microsoft 365 plans.
 *
 * Every Microsoft product carried the generic four-square mark
 * (`/products/microsoft.png`, see `2026-10-microsoft-product-icon`). The
 * business supplied the Microsoft 365 logo itself, and asked for it on the
 * Microsoft 365 products. It is saved unchanged, trimmed of its blank margin,
 * as `public/products/microsoft-365.png`.
 *
 * Which products: those in the "Microsoft 365 Plans" category, which holds the
 * Microsoft 365 plans and the Office 365 plans listed beside them.
 *
 * Which of them change: only a product whose image is still the generic mark
 * (or has none). A product that has been given a picture of its own keeps it,
 * as the earlier migration decided: a picture of the product is a better answer
 * than a logo.
 */
const GENERIC = "/products/microsoft.png";
const LOGO = "/products/microsoft-365.png";

export const microsoft365Logo: ContentMigration = {
  id: "2026-11-microsoft-365-logo",
  describe: "the Microsoft 365 logo on the Microsoft 365 plans",

  async apply(prisma) {
    const category = await prisma.category.findFirst({
      where: { slug: "microsoft-365-plans" },
      select: { id: true },
    });
    if (!category) return "no Microsoft 365 Plans category; nothing changed";

    const updated = await prisma.product.updateMany({
      where: {
        categoryId: category.id,
        deletedAt: null,
        OR: [{ imageUrl: GENERIC }, { imageUrl: null }],
      },
      data: { imageUrl: LOGO },
    });

    return `${updated.count} product${updated.count === 1 ? "" : "s"} now show the Microsoft 365 logo`;
  },
};
