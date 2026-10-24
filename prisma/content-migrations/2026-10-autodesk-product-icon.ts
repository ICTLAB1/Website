import type { ContentMigration } from "./types";

/**
 * Autodesk's mark, on every Autodesk product.
 *
 * Thirty-three Autodesk licences were published with no image, the same gap
 * `2026-10-adobe-product-icons` and `2026-10-microsoft-product-icon` closed
 * for the other two publishers: the representative-illustration system answers
 * by form factor, a licence has no form factor, and the card was a title and a
 * price in a grid beside hardware carrying photographs.
 *
 * ## The corporate mark, because there is no per-product artwork to use
 *
 * Adobe's products each carry their own icon because the business supplied the
 * screenshots those were cut from. Nothing equivalent exists for Autodesk. The
 * logo pack sent for it contains no artwork at all — a README and a
 * thirty-six-row checklist, every row marked "To obtain from Partner DAM" —
 * and its own first paragraph says so: *"not a bundle of Autodesk logo
 * artwork. No authentic logo files have been fabricated."* The business then
 * asked for the corporate logo on all of them, which is the answer that
 * remains true: a mark that says "an Autodesk licence, supplied by this
 * business" rather than a per-product icon nobody has.
 *
 * ## Nothing new is added, which is the point
 *
 * `public/brands/autodesk.svg` already exists and is already on the site: it
 * is what `/brands/autodesk` renders, from the brand's own `logoUrl`.
 * `public/brands/README.md` records where it came from — Simple Icons
 * v16.28.0, CC0 for the file, trademark Autodesk's, used descriptively to
 * identify products this business supplies. Pointing the products at that same
 * path adds no file, invents no artwork, and cannot drift from the brand page,
 * because there is one file rather than a copy of one.
 *
 * The path is read from the brand record rather than written here. If
 * production's Autodesk brand points somewhere else — an official asset
 * uploaded through the admin panel, which is the outcome everybody wants — the
 * products follow it. A brand with no logo at all writes nothing and says so,
 * rather than guessing at a filename.
 *
 * ## The one thing to watch
 *
 * That file is Autodesk's symbol, which is why it works in a 20-pixel square.
 * The brand slot is a 32-pixel-tall horizontal one, so a future replacement
 * could legitimately be a wide lockup — correct there and unreadable here. If
 * the brand artwork is ever replaced with a wordmark, give the products their
 * own square file under `public/products/` the way Microsoft has one, rather
 * than letting this reference carry something it was not sized for.
 *
 * ## `imageUrl`, and not the structured data's `image`
 *
 * The same call as the other two: `resolveProductPhoto` treats `imageUrl` as a
 * picture of the product and an illustration as a stand-in to badge, and a
 * publisher's mark on a licence is the first. The product page declares
 * `image` for hardware only, which is the repair `verify:seo` forced when the
 * Adobe icons went in, so no licence claims this mark is a photograph of
 * itself. Hardware is excluded here for that reason rather than because
 * Autodesk has none.
 */

export const autodeskProductIcon: ContentMigration = {
  id: "2026-10-autodesk-product-icon",
  describe: "point every Autodesk product at the Autodesk mark",

  async apply(prisma) {
    const brand = await prisma.brand.findFirst({
      where: { slug: "autodesk" },
      select: { id: true, logoUrl: true },
    });
    if (!brand) return "no Autodesk brand record; nothing changed";
    if (!brand.logoUrl) {
      return "the Autodesk brand carries no logo, so there is no mark to use; nothing changed";
    }

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
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrl: brand.logoUrl },
      });
      set += 1;
    }

    const skipped = products.length - set;
    const parts = [`set the Autodesk mark on ${set} product${set === 1 ? "" : "s"}`];
    if (skipped > 0) parts.push(`left ${skipped} that already had an image`);
    return parts.join(", ");
  },
};
