import { MARGIN_PERCENT, sellingPriceMinor } from "./margin";
import type { ContentMigration } from "./types";

/**
 * The Autodesk catalogue, priced from the supplied list.
 *
 * Same instruction as `2026-10-adobe-price-list`: publish the products, annual
 * prices only, undiscounted figures, plus the margin in `margin.ts`.
 *
 * The business named AutoCAD's price directly — ₹1,33,340 a year including GST
 * — and that figure turns out to be the Autodesk list exactly rather than a
 * price with anything added, which is how the margin's base was established
 * here. The margin then goes on top of it, which the business confirmed
 * against AutoCAD's own resulting figure.
 *
 * ## The figures include GST, and that was established rather than assumed
 *
 * Autodesk's Indian store quotes tax-inclusive prices and does not say so on
 * the card; this site stores and displays every price excluding GST. Reading
 * one for the other would have put every Autodesk product on the site 18%
 * under its real price.
 *
 * The business's own line — "AutoCAD ₹1,33,340/year inc GST" — settles
 * AutoCAD. The rest was settled by arithmetic: dividing each of the 22 priced
 * cards by 1.18 produces an exact rupee every time, and round thousands in
 * almost every case (₹43,000, ₹1,99,000, ₹2,82,000). A list that was already
 * tax-exclusive would not do that 22 times out of 22.
 *
 * The five discounted cards reconcile the same way and confirm it from a
 * second direction: the offer price divided by 1.18, plus the saving the card
 * states, is the undiscounted tax-exclusive figure. AutoCAD's own numbers —
 * ₹1,06,672 ÷ 1.18 = ₹90,400, plus ₹22,600 = ₹1,13,000 — land on the price the
 * business gave, from the other end.
 *
 * So the savings are quoted excluding GST while the prices are quoted
 * including it, which is worth knowing about the source and is exactly the
 * sort of thing that is invisible until somebody checks.
 *
 * ## Undiscounted
 *
 * Five products carried a special offer. The undiscounted price is what goes
 * in: a promotional rate published as a list price becomes a price rise on the
 * day the promotion ends, and nothing on the site could explain it.
 *
 * ## The ones with no price
 *
 * Seven products are sold through "contact a reseller" with no public figure.
 * They are created without a price and show the quote label, because the
 * alternative is inventing one. Autodesk Flex is among them: it is sold in
 * tokens rather than seats, and a per-seat annual figure would misdescribe it.
 *
 * ## Annual only
 *
 * Three-year and monthly variants on existing Autodesk records are archived,
 * not deleted — "annual prices only" was the instruction and every card in the
 * supplied list is a one-year term. Archived because a quotation or an order
 * may reference one.
 */

type Entry = {
  slug: string;
  name: string;
  /**
   * Autodesk's own undiscounted annual price per seat, in rupees, EXCLUDING
   * GST — already converted from the tax-inclusive figure the list shows. The
   * margin is added to it in the code, so this column stays comparable with
   * the source and can be checked against it line by line.
   * Null where Autodesk publishes no price.
   */
  exGstRupees: number | null;
  sku: string;
  category: string;
  shortDescription: string;
};

const ENTRIES: Entry[] = [
  // ── design and drafting ─────────────────────────────────────────────────
  { slug: "autocad", name: "AutoCAD", exGstRupees: 113_000, sku: "ADSK-ACAD-1Y", category: "cad-drafting",
    shortDescription: "Software for 2D and 3D CAD. The subscription includes AutoCAD, the specialised toolsets and the web and mobile apps." },
  { slug: "autocad-lt", name: "AutoCAD LT", exGstRupees: 30_000, sku: "ADSK-ACADLT-1Y", category: "cad-drafting",
    shortDescription: "Cost-effective 2D CAD software for drafting, drawing and documentation." },
  { slug: "autocad-web", name: "AutoCAD Web", exGstRupees: 8_900, sku: "ADSK-ACADWEB-1Y", category: "cad-drafting",
    shortDescription: "Draught, annotate and add field data to drawings in a web browser or on a mobile device, working with DWG files." },
  { slug: "autocad-revit-lt-suite", name: "AutoCAD Revit LT Suite", exGstRupees: 37_000, sku: "ADSK-ACADRVTLT-1Y", category: "construction-management",
    shortDescription: "Revit LT and AutoCAD LT together, for architectural design and documentation alongside 2D drafting." },
  /*
   * `fusion-360`, not `autodesk-fusion`. Autodesk dropped the 360 from the
   * name, but the record and its URL predate this list and the established
   * address is worth more than the tidier slug — renaming it would retire a
   * page that already ranks, for a cosmetic gain. The product name below is
   * the current one.
   */
  { slug: "fusion-360", name: "Autodesk Fusion", exGstRupees: 43_000, sku: "ADSK-FSN-1Y", category: "cad-drafting",
    shortDescription: "Cloud-based product design software for manufacturing, 3D modelling, electronics, simulation and data management." },
  { slug: "autodesk-fusion-for-manufacturing", name: "Autodesk Fusion for Manufacturing", exGstRupees: 129_000, sku: "ADSK-FSNMFG-1Y", category: "cad-drafting",
    shortDescription: "Autodesk Fusion with the Fusion Manufacturing Extension, for advanced manufacturing capabilities." },
  { slug: "autodesk-fusion-for-design", name: "Autodesk Fusion for Design", exGstRupees: 138_000, sku: "ADSK-FSNDSN-1Y", category: "cad-drafting",
    shortDescription: "Autodesk Fusion with the Design, Simulation and Manage extensions, for advanced design and simulation." },
  { slug: "autodesk-fusion-contributor", name: "Autodesk Fusion Contributor", exGstRupees: 15_000, sku: "ADSK-FSNCONTRIB-1Y", category: "cad-drafting",
    shortDescription: "Contributor-level access to Fusion and Fusion Manage workflows, for people who take part without needing a full seat." },
  { slug: "autodesk-inventor", name: "Autodesk Inventor", exGstRupees: 140_000, sku: "ADSK-INV-1Y", category: "cad-drafting",
    shortDescription: "Product design and engineering tools for 3D mechanical design, simulation, visualisation and documentation." },
  { slug: "autodesk-alias-concept", name: "Autodesk Alias Concept", exGstRupees: 298_000, sku: "ADSK-ALIAS-1Y", category: "cad-drafting",
    shortDescription: "Industrial design software to sketch, concept model, surface and visualise." },

  // ── building, infrastructure and construction ───────────────────────────
  { slug: "revit", name: "Autodesk Revit", exGstRupees: 163_000, sku: "ADSK-RVT-1Y", category: "construction-management",
    shortDescription: "Plan, design, construct and manage buildings with tools for Building Information Modelling." },
  { slug: "autodesk-civil-3d", name: "Autodesk Civil 3D", exGstRupees: 155_000, sku: "ADSK-C3D-1Y", category: "construction-management",
    shortDescription: "Civil engineering design and construction documentation." },
  { slug: "autodesk-navisworks-simulate", name: "Autodesk Navisworks Simulate", exGstRupees: 62_000, sku: "ADSK-NAVIS-1Y", category: "construction-management",
    shortDescription: "Control outcomes with clash detection, advanced coordination, 5D analysis and simulation tools." },
  { slug: "autodesk-infraworks", name: "Autodesk InfraWorks", exGstRupees: 117_000, sku: "ADSK-INFRA-1Y", category: "construction-management",
    shortDescription: "Geospatial and engineering BIM platform for planning, design and analysis." },
  { slug: "autodesk-recap-pro", name: "Autodesk ReCap Pro", exGstRupees: 22_000, sku: "ADSK-RECAP-1Y", category: "construction-management",
    shortDescription: "Reality capture and 3D scanning software and services." },
  { slug: "autodesk-forma-site-design", name: "Autodesk Forma Site Design", exGstRupees: 38_000, sku: "ADSK-FORMASITE-1Y", category: "construction-management",
    shortDescription: "Site planning and analysis software to plan every site with AI-powered analysis, contextual data and 3D modelling." },
  { slug: "autodesk-forma-for-buildings", name: "Autodesk Forma for Buildings", exGstRupees: 54_000, sku: "ADSK-FORMABLD-1Y", category: "construction-management",
    shortDescription: "A connected bundle of cloud tools for early building design, combining site planning, design exploration, analysis and collaborative review." },

  // ── collections ─────────────────────────────────────────────────────────
  { slug: "aec-collection", name: "Autodesk Architecture, Engineering & Construction Collection", exGstRupees: 199_000, sku: "ADSK-AEC-1Y", category: "bim-collections",
    shortDescription: "BIM and CAD tools for designers, engineers and contractors, including Revit, AutoCAD, Civil 3D and Forma Site Design." },
  { slug: "autodesk-product-design-manufacturing-collection", name: "Autodesk Product Design & Manufacturing Collection", exGstRupees: 183_000, sku: "ADSK-PDMC-1Y", category: "bim-collections",
    shortDescription: "Inventor, AutoCAD, Fusion and more — professional-grade tools for product development and manufacturing planning." },
  { slug: "autodesk-media-entertainment-collection", name: "Autodesk Media & Entertainment Collection", exGstRupees: 151_000, sku: "ADSK-MEC-1Y", category: "bim-collections",
    shortDescription: "3D animation, modelling, simulation and rendering software for film, games and television." },

  // ── media and entertainment ─────────────────────────────────────────────
  { slug: "3ds-max", name: "Autodesk 3ds Max", exGstRupees: 109_000, sku: "ADSK-3DSMAX-1Y", category: "media-entertainment",
    shortDescription: "3D modelling, animation and rendering software for games and design visualisation." },
  { slug: "maya", name: "Autodesk Maya", exGstRupees: 109_000, sku: "ADSK-MAYA-1Y", category: "media-entertainment",
    shortDescription: "3D animation, modelling, simulation and rendering software for film, games and television." },
  { slug: "autodesk-flame", name: "Autodesk Flame", exGstRupees: 282_000, sku: "ADSK-FLAME-1Y", category: "media-entertainment",
    shortDescription: "High-performing tools for 3D visual effects, compositing, advanced graphics and colour management." },
  { slug: "autodesk-arnold", name: "Autodesk Arnold", exGstRupees: 23_000, sku: "ADSK-ARNOLD-1Y", category: "media-entertainment",
    shortDescription: "Global illumination rendering software." },
  { slug: "autodesk-flow-production-tracking", name: "Autodesk Flow Production Tracking", exGstRupees: 21_000, sku: "ADSK-FLOWPT-1Y", category: "media-entertainment",
    shortDescription: "A review and production tracking toolset for VFX, games and animation teams." },

  // ── published without a price ───────────────────────────────────────────
  { slug: "autodesk-revit-lt", name: "Autodesk Revit LT", exGstRupees: null, sku: "ADSK-RVTLT-1Y", category: "construction-management",
    shortDescription: "Simplified 3D BIM tool for producing 3D architectural designs and documentation." },
  { slug: "autodesk-advance-steel", name: "Autodesk Advance Steel", exGstRupees: null, sku: "ADSK-ADVSTEEL-1Y", category: "construction-management",
    shortDescription: "3D modelling software for steel detailing." },
  { slug: "autodesk-forma-building-design", name: "Autodesk Forma Building Design", exGstRupees: null, sku: "ADSK-FORMABD-1Y", category: "construction-management",
    shortDescription: "Building design software to explore more ideas before BIM: shape options quickly, test performance and move designs directly into Revit." },
  { slug: "autodesk-fusion-manage", name: "Autodesk Fusion Manage", exGstRupees: null, sku: "ADSK-FSNMANAGE-1Y", category: "cad-drafting",
    shortDescription: "Enhance workflows and improve collaboration with configurable cloud-based PLM." },
  { slug: "autodesk-platform-services", name: "Autodesk Platform Services", exGstRupees: null, sku: "ADSK-APS-1Y", category: "cad-drafting",
    shortDescription: "APIs and services to work with design and engineering data in the cloud." },
  { slug: "autodesk-flow-studio", name: "Autodesk Flow Studio", exGstRupees: null, sku: "ADSK-FLOWSTUDIO-1Y", category: "media-entertainment",
    shortDescription: "Turn footage into CG scenes you can direct, edit and export, with AI-powered mocap, camera tracking, animation and compositing tools." },
  { slug: "autodesk-flex", name: "Autodesk Flex", exGstRupees: null, sku: "ADSK-FLEX-TOKENS", category: "cad-drafting",
    shortDescription: "Prepay with tokens for flexible access to 100+ Autodesk products, for project-based work and product exploration." },
];

const PROVENANCE = `Autodesk India price list supplied by the business, 23 October 2026 — annual, per seat, undiscounted. Converted from the tax-inclusive figure the list shows by dividing by 1.18, plus the ${MARGIN_PERCENT}% margin.`;

export const autodeskPriceList: ContentMigration = {
  id: "2026-10-autodesk-price-list",
  describe: "publish the Autodesk catalogue at the supplied annual prices, excluding GST",

  async apply(prisma) {
    const brand = await prisma.brand.findFirst({
      where: { slug: "autodesk", deletedAt: null },
      select: { id: true },
    });
    if (!brand) return "no Autodesk brand to price against; nothing changed";

    const categories = await prisma.category.findMany({
      where: { slug: { in: [...new Set(ENTRIES.map((entry) => entry.category))] } },
      select: { id: true, slug: true },
    });
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

    let created = 0;
    let repriced = 0;
    let unpriced = 0;
    const skipped: string[] = [];

    for (const entry of ENTRIES) {
      const categoryId = categoryBySlug.get(entry.category);
      if (!categoryId) {
        skipped.push(`${entry.slug} (no ${entry.category} category)`);
        continue;
      }

      const existing = await prisma.product.findUnique({
        where: { slug: entry.slug },
        select: { id: true },
      });

      const productId = existing
        ? existing.id
        : (
            await prisma.product.create({
              data: {
                slug: entry.slug,
                name: entry.name,
                shortDescription: entry.shortDescription,
                description: entry.shortDescription,
                brandId: brand.id,
                categoryId,
                status: "ACTIVE",
                availability: "ON_REQUEST",
                // No public price means no direct purchase: the enquiry is the
                // only honest route, and `isQuoteOnly` would reach the same
                // answer from the absent price anyway.
                purchaseMode: entry.exGstRupees === null ? "ENQUIRY" : "BOTH",
                unitLabel: "seat",
              },
              select: { id: true },
            })
          ).id;

      if (!existing) created += 1;

      /*
       * A product with no variant at all is not a quote-only product; it is a
       * row half the site cannot render — no SKU to put on an enquiry line, no
       * default variant for the product page to read. The catalogue's own
       * convention for "sold, but not at a published price" is a variant
       * priced at zero, which is what `adobe-creative-cloud-enterprise`
       * carries and what `isQuoteOnly` already answers correctly.
       */
      const listPriceMinor = entry.exGstRupees === null ? 0 : sellingPriceMinor(entry.exGstRupees);
      if (entry.exGstRupees === null) unpriced += 1;

      const variant = await prisma.productVariant.findUnique({
        where: { sku: entry.sku },
        select: { id: true, listPriceMinor: true },
      });

      if (variant) {
        if (variant.listPriceMinor === listPriceMinor) continue;
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { listPriceMinor, salePriceMinor: null, deletedAt: null },
        });
        await prisma.price.create({
          data: { variantId: variant.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
        });
      } else {
        const fresh = await prisma.productVariant.create({
          data: {
            productId,
            sku: entry.sku,
            name:
              entry.exGstRupees === null
                ? "Priced on enquiry"
                : "Annual commitment, billed yearly",
            licenceType: "SUBSCRIPTION_ANNUAL",
            termMonths: 12,
            seats: 1,
            isDefault: true,
            currency: "INR",
            listPriceMinor,
            gstRatePercent: 18,
          },
          select: { id: true },
        });
        /*
         * No history row for a zero: `Price` is a trail of what something was
         * sold for, and "nothing, because Autodesk publishes no figure" is not
         * a price this business ever set.
         */
        if (listPriceMinor > 0) {
          await prisma.price.create({
            data: { variantId: fresh.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
          });
        }
      }
      if (listPriceMinor > 0) repriced += 1;
    }

    /*
     * Annual only. Every card in the supplied list is a one-year term, so the
     * three-year and monthly rows go — archived, because a quotation or order
     * may reference one.
     */
    const { count: archived } = await prisma.productVariant.updateMany({
      where: {
        deletedAt: null,
        product: { brandId: brand.id },
        OR: [{ termMonths: { not: 12 } }, { licenceType: "SUBSCRIPTION_MONTHLY" }],
      },
      data: { deletedAt: new Date() },
    });

    const parts = [
      `created ${created} Autodesk product${created === 1 ? "" : "s"}`,
      `priced ${repriced}`,
      `${unpriced} published without a price`,
      `archived ${archived} non-annual variant${archived === 1 ? "" : "s"}`,
    ];
    if (skipped.length > 0) parts.push(`skipped ${skipped.join(", ")}`);
    return parts.join(", ");
  },
};
