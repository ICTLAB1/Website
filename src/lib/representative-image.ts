import type { FormFactor } from "@prisma/client";

/**
 * Category illustrations, for models with no photograph of their own.
 *
 * ## What changed, and why
 *
 * This file reverses an earlier decision. The catalogue used to show a labelled
 * empty frame for every model without artwork, on the reasoning that a generic
 * picture shows a buyer something that is not the product being quoted. That
 * reasoning is still sound about *unlabelled* generic pictures, and it is why
 * the disclaimer below is not optional decoration — it is the thing that makes
 * this honest rather than misleading.
 *
 * The business supplied a set of category illustrations and asked for them to
 * be used, which is ordinary trade practice: a distributor's catalogue shows a
 * representative unit and states that it is one. A buyer who can see "this is
 * an illustration of a small form factor desktop, not a photograph of the model
 * supplied" has been told the truth and has a page that reads as finished.
 *
 * ## The rules this file enforces
 *
 * 1. **A real photograph always wins.** The illustration is a fallback, never
 *    an override — see {@link resolveProductPhoto}.
 * 2. **The illustration must depict the form factor it stands in for.** A
 *    tower under a laptop listing would misrepresent the goods no matter what
 *    the caption said, so the map is keyed by form factor and a form factor
 *    with no illustration keeps the empty frame. That is why servers are
 *    absent: a rack server does not look like a desktop tower.
 * 3. **Representative-ness is derived from the path, never stored.** There is
 *    no `isRepresentative` column, because a column can disagree with the
 *    image — and the one way it could disagree is by showing an illustration
 *    without the notice. {@link isRepresentativeImage} cannot be wrong.
 * 4. **Every mapped file must exist.** Asserted in
 *    `tests/representative-image.test.ts`, so a mistyped filename fails the
 *    build instead of shipping a broken image.
 *
 * ## Adding an illustration
 *
 * Drop the file in `public/products/`, add the line here, record its provenance
 * in `public/products/README.md`. Nothing else — the catalogue, the product
 * pages and the notice all read this map.
 */
export const REPRESENTATIVE_IMAGES: Partial<Record<FormFactor, string>> = {
  /*
   * Line drawings, not photographs, and that is deliberate rather than a
   * compromise.
   *
   * A photograph of a machine is a photograph of *a* machine: put one against
   * forty models and it is wrong about thirty-nine of them, which no caption
   * repairs. A drawing of the chassis class makes no claim about the model at
   * all — it is legible at card size, it is obviously an illustration, and it
   * cannot be mistaken for the unit that will be delivered.
   *
   * They carry no maker's mark and no port layout precise enough to identify a
   * chassis, for the same reason.
   *
   * A tower and a desktop workstation share one: a workstation of this class
   * *is* a tower — same chassis shape, same orientation, same thing under a
   * desk — so the picture depicts the category correctly, and where it differs
   * from a given Z-series or Precision model is exactly what the notice says it
   * may differ in.
   */
  DESKTOP_TOWER: "/products/representative-desktop-tower.png",
  DESKTOP_WORKSTATION: "/products/representative-desktop-tower.png",
  DESKTOP_SFF: "/products/representative-desktop-sff.png",
  DESKTOP_MINI: "/products/representative-desktop-sff.png",
  LAPTOP: "/products/representative-laptop.png",
  MOBILE_WORKSTATION: "/products/representative-laptop.png",
  ALL_IN_ONE: "/products/representative-all-in-one.png",

  /*
   * Permanently absent:
   *   TOWER_SERVER, RACK_SERVER   — a server is bought on its specification and
   *                                 its rack units. A desktop illustration
   *                                 beside one would be wrong about the goods in
   *                                 a way a caption cannot repair. They keep the
   *                                 empty frame until real photographs exist.
   */
};

/**
 * The set of illustrations to resolve against.
 *
 * Every function here takes one, defaulting to {@link REPRESENTATIVE_IMAGES}.
 * The parameter exists so the behaviour stays provable while the real map is
 * empty — tests supply a fixture rather than asserting against whatever artwork
 * happens to be committed today, which would make them pass or fail on a file
 * drop rather than on the logic. Application code always uses the default.
 */
export type IllustrationMap = Partial<Record<FormFactor, string>>;

/** The illustration standing in for a form factor, or null if none does. */
export function representativeImageFor(
  formFactor: FormFactor | null | undefined,
  images: IllustrationMap = REPRESENTATIVE_IMAGES,
): string | null {
  if (!formFactor) return null;
  return images[formFactor] ?? null;
}

/** Whether a resolved image path is one of the category illustrations. */
export function isRepresentativeImage(
  src: string | null | undefined,
  images: IllustrationMap = REPRESENTATIVE_IMAGES,
): boolean {
  if (!src) return false;
  return Object.values(images).includes(src);
}

/**
 * The picture to show for a product, and whether it depicts that exact model.
 *
 * `representative: true` obliges the caller to render the notice. Returning
 * both from one function is what keeps the two in step: there is no way to get
 * the source without also being told what it is.
 */
export function resolveProductPhoto(
  product: { imageUrl?: string | null; formFactor?: FormFactor | null },
  images: IllustrationMap = REPRESENTATIVE_IMAGES,
): { src: string | null; representative: boolean } {
  // A photograph on the record is a photograph of that model, taken or supplied
  // for it. It outranks the illustration in every case.
  if (product.imageUrl) return { src: product.imageUrl, representative: false };

  const illustration = representativeImageFor(product.formFactor, images);
  if (illustration) return { src: illustration, representative: true };

  return { src: null, representative: false };
}

/** The badge on the image itself. Short enough to sit on a catalogue card. */
export const REPRESENTATIVE_IMAGE_BADGE = "Representative image";

/**
 * The disclaimer, in the form the trade uses.
 *
 * It has to do four things to be worth anything: say the image is an
 * illustration and not the model; say what may differ; say appearance is the
 * manufacturer's to change; and say the image is not part of the offer. The
 * last clause matters most — without it a picture is arguably a description of
 * the goods, and a quotation is a priced offer.
 */
export const REPRESENTATIVE_IMAGE_DISCLAIMER =
  "Representative image. The illustration shown depicts this product category and is not a " +
  "photograph of the model supplied. The item delivered may differ in appearance, colour, " +
  "chassis, port layout, revision and bundled accessories. Product appearance and " +
  "specifications are subject to change by the manufacturer without notice. Images are for " +
  "identification purposes only and do not form part of any offer, quotation or contract; the " +
  "written specification governs. All trademarks, product names and images are the property of " +
  "their respective owners.";
