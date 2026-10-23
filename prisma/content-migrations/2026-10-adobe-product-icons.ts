import type { ContentMigration } from "./types";

/**
 * The Adobe product icons, from the screenshots the business supplied.
 *
 * Twenty-one software products were published with no image at all. The
 * representative-illustration system covers hardware by form factor — a laptop
 * gets a laptop — and has nothing to offer a licence, so an Adobe card was a
 * title and a price in a grid beside hardware cards carrying photographs.
 *
 * The icons were cut from the price-list screenshots rather than fetched:
 * outbound hosts are blocked from the environment this runs in, and these are
 * Adobe's own marks in any case, reproduced here to identify the products this
 * business resells.
 *
 * ## They are small, and are stored at the size they are
 *
 * The screenshots are 641 pixels wide and the icons in them are 18 to 20
 * pixels square. Nothing is upscaled on the way in: enlarging a 20-pixel
 * source invents detail it does not have, and a blurred icon looks worse than
 * a small sharp one. The card renders them at a size the source can carry.
 *
 * Replacing them later is one file each, at the same path, with no change
 * here: if Adobe's own artwork is obtained at a usable resolution it drops
 * straight in.
 *
 * ## `imageUrl`, not a representative image
 *
 * `resolveProductPhoto` treats `imageUrl` as a picture of the product itself
 * and an illustration as something to badge with a disclaimer. An application
 * icon is the first of those — it is the product's own mark, not a stand-in
 * for one — so it goes in `imageUrl` and carries no badge.
 */

/** Every file was written to `public/products/<slug>.png`. */
const SLUGS = [
  "adobe-acrobat-pro-teams",
  "adobe-acrobat-standard-teams",
  "adobe-acrobat-studio",
  "adobe-after-effects-teams",
  "adobe-ai-assistant-for-acrobat",
  "adobe-animate-teams",
  "adobe-audition-teams",
  "adobe-dreamweaver-teams",
  "adobe-express-teams",
  "adobe-firefly-premium",
  "adobe-firefly-pro",
  "adobe-firefly-pro-plus",
  "adobe-frame-io-for-teams",
  "adobe-illustrator-teams",
  "adobe-incopy-teams",
  "adobe-indesign-teams",
  "adobe-lightroom-teams",
  "adobe-photoshop-teams",
  "adobe-premiere-pro-teams",
  "adobe-stock-10-assets",
  "adobe-substance-3d-collection",
  /*
   * The three Creative Cloud records share one mark, cut from the plan cards
   * in the first screenshot rather than the product grid — they are not in
   * that grid, and Adobe gives the suite one icon rather than one per edition.
   * It is 40 pixels square, twice the size of the rest, because the plan cards
   * are drawn larger.
   */
  "adobe-creative-cloud-all-apps-teams",
  "adobe-creative-cloud-single-app-teams",
  "adobe-creative-cloud-enterprise",
];

export const adobeProductIcons: ContentMigration = {
  id: "2026-10-adobe-product-icons",
  describe: "point the Adobe products at their icons",

  async apply(prisma) {
    let set = 0;
    const missing: string[] = [];

    for (const slug of SLUGS) {
      const product = await prisma.product.findUnique({
        where: { slug },
        select: { id: true, imageUrl: true },
      });
      if (!product) {
        missing.push(slug);
        continue;
      }

      const imageUrl = `/products/${slug}.png`;
      // An image already on the record was put there by somebody, and a better
      // one than this is the likeliest reason.
      if (product.imageUrl) continue;

      await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
      set += 1;
    }

    if (set === 0 && missing.length === 0) {
      return "every Adobe product already has an image; nothing changed";
    }
    const parts = [`set ${set} product icon${set === 1 ? "" : "s"}`];
    if (missing.length > 0) parts.push(`${missing.length} product${missing.length === 1 ? "" : "s"} not found (${missing.join(", ")})`);
    return parts.join(", ");
  },
};
