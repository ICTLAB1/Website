import type { ContentMigration } from "./types";

/**
 * Microsoft's mark, on every Microsoft product.
 *
 * Twenty-five Microsoft licences were published with no image, for the same
 * reason the Adobe ones were before `2026-10-adobe-product-icons`: the
 * representative-illustration system answers by form factor — a laptop gets a
 * laptop — and a licence has no form factor, so the card was a title and a
 * price in a grid beside hardware carrying photographs.
 *
 * ## One mark for all of them, which is the instruction and also the honest
 * option
 *
 * Adobe supplies a distinct icon per application and the business sent the
 * screenshots they were cut from, so those products each carry their own.
 * Nothing equivalent was supplied for Microsoft, and the business asked for
 * the corporate mark on all of them.
 *
 * That is the better answer here regardless. Microsoft's per-product icons —
 * the Word, Excel and Teams tiles — belong to applications, and most of these
 * records are not applications: Microsoft 365 E5, a Windows Server user CAL,
 * an Azure consumption commitment and SQL Server Enterprise have no tile
 * between them. Picking one would be choosing a picture that misdescribes the
 * product, which is worse than a brand mark that describes it exactly: a
 * Microsoft licence, supplied by this business.
 *
 * ## `imageUrl`, not a representative image
 *
 * `resolveProductPhoto` treats `imageUrl` as a picture of the product itself
 * and an illustration as a stand-in to badge with a disclaimer. A publisher's
 * mark on a licence is the first of those, the same call
 * `2026-10-adobe-product-icons` made, so it carries no badge. It is also not
 * declared as the product's `image` in the structured data — the product page
 * does that for hardware only, which is the repair `verify:seo` forced when
 * the Adobe icons went in and an icon was being published as a photograph.
 *
 * ## Found by brand rather than listed
 *
 * The Adobe migration lists its slugs because each needed its own file. Here
 * there is one file for all of them, so the honest query is "every live
 * Microsoft product" — which also means a record added between that list being
 * written and this running is not quietly left blank.
 *
 * Hardware is excluded. No Microsoft record is hardware today, but the rule
 * matters rather than the current data: on a hardware product `imageUrl` is
 * the photograph, is declared as `image` in the structured data, and putting a
 * logo there would be stating that a mark is a picture of the machine.
 */

/** Written to `public/products/microsoft.png` — 256px, transparent. */
const ICON = "/products/microsoft.png";

export const microsoftProductIcon: ContentMigration = {
  id: "2026-10-microsoft-product-icon",
  describe: "point every Microsoft product at the Microsoft mark",

  async apply(prisma) {
    const brand = await prisma.brand.findFirst({
      where: { slug: "microsoft" },
      select: { id: true },
    });
    if (!brand) return "no Microsoft brand record; nothing changed";

    const products = await prisma.product.findMany({
      where: { brandId: brand.id, deletedAt: null, formFactor: null },
      select: { id: true, imageUrl: true },
    });

    let set = 0;
    for (const product of products) {
      /*
       * An image already on the record was put there by somebody, and a
       * picture of the product is a better answer than its publisher's logo.
       */
      if (product.imageUrl) continue;
      await prisma.product.update({ where: { id: product.id }, data: { imageUrl: ICON } });
      set += 1;
    }

    const skipped = products.length - set;
    const parts = [`set the Microsoft mark on ${set} product${set === 1 ? "" : "s"}`];
    if (skipped > 0) parts.push(`left ${skipped} that already had an image`);
    return parts.join(", ");
  },
};
