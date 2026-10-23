import type { ContentMigration } from "./types";

/**
 * The Adobe catalogue, priced from the supplied list.
 *
 * The business sent Adobe's own reseller pricing — the annual, per-licence,
 * GST-exclusive figures — and asked for three things: publish the products,
 * show annual prices only, and sell at the Adobe price plus ₹5,000 per user.
 * Creative Cloud All Apps was given its own figure, ₹1,07,000, rather than
 * derived.
 *
 * ## This writes business records, which migrations usually do not
 *
 * `types.ts` says products and prices are business records rather than content
 * and that nothing here goes near them. This does, deliberately, for the
 * reason `2026-10-merge-duplicate-servers` did: the container entrypoint is
 * the only automated path to production data, and twenty-two products priced
 * by hand in an admin panel is twenty-two chances to mistype a figure that a
 * customer is then quoted from.
 *
 * What makes it defensible is that the arithmetic is in one place and visible.
 * `MARGIN_MINOR` is added to every list figure by the code rather than typed
 * into each row, so the margin can be read, checked and changed as one number
 * instead of being recovered from twenty-two differences.
 *
 * ## Every price writes its own history
 *
 * `Price` is the append-only trail the admin panel writes on every change, and
 * this writes one per variant with a note saying where the figure came from.
 * A price nobody can trace to a source is the thing that cannot be defended
 * six months later when a customer asks why the quotation differs from the
 * page.
 *
 * ## Annual only
 *
 * The monthly variants are archived, not deleted. "Annual prices only" was the
 * instruction, and it also removes a comparison defect: Acrobat Pro's monthly
 * instalment of ₹1,850 sat beside Acrobat Standard's annual ₹16,320 on the
 * quote page, making Pro read as nine times cheaper than Standard. Archived
 * rather than deleted because a quotation or order may reference one, and a
 * document that cannot be reprinted is a worse outcome than a row nobody
 * selects.
 *
 * ## What is not claimed
 *
 * Nothing here states a discount, a stock position or an entitlement. The
 * figures are list prices, which is what every surface already calls them, and
 * every one of them carries the site's standing disclaimer that the number is
 * tentative and fixed on a written quotation.
 */

/** Added to every supplied Adobe figure, in paise. ₹5,000 per user per year. */
const MARGIN_MINOR = 500_000;

type Entry = {
  slug: string;
  name: string;
  /** The supplied Adobe annual price per licence, in rupees, excluding GST. */
  adobeRupees: number;
  /**
   * The final list price in rupees where the business named one directly,
   * instead of the margin being added. Creative Cloud All Apps only.
   */
  listRupees?: number;
  sku: string;
  category: string;
  shortDescription: string;
  features: string[];
};

/**
 * The supplied list, transcribed.
 *
 * Order and wording follow the source. The figures are the annual
 * "per licence excl. GST" column; the monthly column is deliberately not
 * carried across.
 */
const ENTRIES: Entry[] = [
  // ── document workflow ───────────────────────────────────────────────────
  {
    slug: "adobe-acrobat-pro-teams",
    name: "Adobe Acrobat Pro for Teams",
    adobeRupees: 26_808,
    sku: "ADB-ACR-PRO-TEAM-A1",
    category: "document-workflow",
    shortDescription:
      "Advanced PDF tools to edit, convert, protect and sign documents, with Microsoft and Google integration.",
    features: [
      "Get advanced PDF tools to edit, convert, protect and sign documents",
      "Easily collaborate and consolidate feedback",
      "Integrate with Microsoft and Google apps",
    ],
  },
  {
    slug: "adobe-acrobat-standard-teams",
    name: "Adobe Acrobat Standard DC for Teams",
    adobeRupees: 18_984,
    sku: "ADB-ACR-STD-TEAM-A1",
    category: "document-workflow",
    shortDescription:
      "Simple PDF tools to edit and export documents, with shared review and document tasks in one place.",
    features: [
      "Get simple PDF tools to edit and export docs",
      "Do your document tasks in one place",
      "Keep work moving with shared reviews",
    ],
  },
  {
    slug: "adobe-acrobat-studio",
    name: "Adobe Acrobat Studio",
    adobeRupees: 33_516,
    sku: "ADB-ACR-STUDIO-A1",
    category: "document-workflow",
    shortDescription:
      "Acrobat Pro together with the Creative Cloud tools, for teams producing documents and creative work side by side.",
    features: [
      "Get Acrobat Pro, plus AI creative tools",
      "Create content with easy-to-use design tools",
      "Summarise documents, surface insights and ask questions with AI-powered assistance",
    ],
  },
  {
    slug: "adobe-ai-assistant-for-acrobat",
    name: "AI Assistant for Acrobat",
    adobeRupees: 5_580,
    sku: "ADB-ACR-AI-A1",
    category: "document-workflow",
    shortDescription:
      "An add-on that answers questions about a document and summarises it, across Acrobat Pro, Standard and Reader.",
    features: [
      "Chat with documents for fast insights",
      "Summarise documents, including contracts",
      "Works with Acrobat Pro, Standard and Reader",
    ],
  },

  // ── single creative applications ────────────────────────────────────────
  {
    slug: "adobe-photoshop-teams",
    name: "Adobe Photoshop for Teams",
    adobeRupees: 40_224,
    sku: "ADB-PS-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Image editing and compositing for photos, banners and advertising, with generative tools on brand assets.",
    features: [
      "Create striking photos, banners and ads",
      "Use AI to edit all elements and expand visuals",
    ],
  },
  {
    slug: "adobe-illustrator-teams",
    name: "Adobe Illustrator for Teams",
    adobeRupees: 40_224,
    sku: "ADB-AI-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Vector design for logos, icons, graphics and advertising, with brand asset management.",
    features: [
      "Design logos, icons, graphics, ads and more",
      "Manage assets and protect your creative IP",
      "Use AI to speed up design",
    ],
  },
  {
    slug: "adobe-premiere-pro-teams",
    name: "Adobe Premiere Pro for Teams",
    adobeRupees: 40_224,
    sku: "ADB-PR-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Video editing for social, digital and broadcast work, with timeline collaboration across a team.",
    features: [
      "Create social posts, digital ads and promos",
      "Edit video as a team and get real-time feedback on timelines",
      "Use AI to clean up dialogue or extend clips",
    ],
  },
  {
    slug: "adobe-indesign-teams",
    name: "Adobe InDesign for Teams",
    adobeRupees: 40_224,
    sku: "ADB-ID-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Page layout and publishing for print and digital, with shared previews and review.",
    features: [
      "Design, layout and publish content for every business need",
      "Share design previews for fast feedback",
      "Use AI to generate images and add effects",
    ],
  },
  {
    slug: "adobe-after-effects-teams",
    name: "Adobe After Effects for Teams",
    adobeRupees: 40_224,
    sku: "ADB-AE-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Motion graphics and visual effects for film, television, web and social work.",
    features: [
      "Create stunning motion graphics and visual effects for film, TV, video, web and social",
      "Quickly create video intros and transitions",
      "Extract objects and erase elements with AI",
    ],
  },
  {
    slug: "adobe-audition-teams",
    name: "Adobe Audition for Teams",
    adobeRupees: 40_224,
    sku: "ADB-AU-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Audio recording, mixing and restoration for video, podcasts and social content.",
    features: [
      "Create and mix pro-quality audio for marketing videos, podcasts and social posts",
      "Speed video production and audio finishing",
    ],
  },
  {
    slug: "adobe-lightroom-teams",
    name: "Adobe Lightroom for Teams",
    adobeRupees: 40_224,
    sku: "ADB-LR-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Photo organisation and editing across desktop, web and mobile, with cloud-synced libraries.",
    features: [
      "Organise and edit photos with simple tools",
      "Adjust lighting, colour and more",
      "Use AI to clean up and blur backgrounds",
    ],
  },
  {
    slug: "adobe-incopy-teams",
    name: "Adobe InCopy for Teams",
    adobeRupees: 5_580,
    sku: "ADB-IC-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Collaborative copywriting and editing alongside InDesign layouts, without touching the design file.",
    features: [
      "Speed content creation by letting editors and copywriters work in design files",
      "Quickly edit text and track changes",
    ],
  },
  {
    slug: "adobe-dreamweaver-teams",
    name: "Adobe Dreamweaver for Teams",
    adobeRupees: 40_224,
    sku: "ADB-DW-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Responsive website design and build, with Creative Cloud Libraries and Adobe Stock integration.",
    features: [
      "Quickly build responsive websites",
      "Learn to build and edit websites using hints",
      "Enhance your sites with integrated Creative Cloud Libraries and Adobe Stock assets",
    ],
  },
  {
    slug: "adobe-animate-teams",
    name: "Adobe Animate for Teams",
    adobeRupees: 40_224,
    sku: "ADB-AN-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Animation for company videos, tutorials, banners and websites, published to any platform.",
    features: [
      "Design animations for company videos, tutorials, ad banners and websites",
      "Attract customer attention with animation",
      "Publish to any platform to reach viewers",
    ],
  },
  {
    slug: "adobe-express-teams",
    name: "Adobe Express for Teams",
    /*
     * The undiscounted figure. The list showed ₹4,656 struck through from
     * ₹7,452, and the instruction was to carry the undiscounted price: a
     * promotional rate published as a list price becomes a price rise the day
     * the promotion ends.
     */
    adobeRupees: 7_452,
    sku: "ADB-EXPRESS-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Quick creation of videos, social posts, flyers and documents from brand-controlled templates.",
    features: [
      "Create videos, social posts, flyers and more",
      "Share brand assets and edit projects fast",
      "Scale campaigns fast with creative AI",
    ],
  },
  {
    slug: "adobe-firefly-pro",
    name: "Adobe Firefly Pro",
    adobeRupees: 18_624,
    sku: "ADB-FF-PRO-A1",
    category: "single-creative-apps",
    shortDescription:
      "Generative AI for images, video and audio, with 4,000 monthly generative credits and models from Adobe, Google and OpenAI.",
    features: [
      "4000 monthly generative credits to create with industry-leading models from Adobe, Google, OpenAI and more",
      "Unlimited generations on standard features",
      "Access to premium features like video generation",
      "Full access to Photoshop on web and mobile and Adobe Express Premium",
    ],
  },
  {
    slug: "adobe-firefly-pro-plus",
    name: "Adobe Firefly Pro Plus",
    adobeRupees: 46_560,
    sku: "ADB-FF-PROPLUS-A1",
    category: "single-creative-apps",
    shortDescription:
      "Firefly Pro with unlimited access to standard AI features and 10,000 monthly generative credits.",
    features: [
      "Get unlimited access to standard AI features",
      "Get 10000 monthly generative credits to create up to 100 five-second videos",
      "Design and edit with Photoshop on web and mobile and Adobe Express Premium",
    ],
  },
  {
    slug: "adobe-firefly-premium",
    name: "Adobe Firefly Premium",
    adobeRupees: 186_240,
    sku: "ADB-FF-PREMIUM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Firefly with 50,000 monthly generative credits and access to the Firefly Video Model in Generate Video.",
    features: [
      "Get unlimited access to standard AI features",
      "Get 50000 monthly generative credits to create video and audio content at scale",
      "Generate unlimited five-second videos with the Firefly Video Model in Generate Video",
    ],
  },
  {
    slug: "adobe-frame-io-for-teams",
    name: "Frame.io for Teams",
    adobeRupees: 24_576,
    sku: "ADB-FRAMEIO-TEAM-A1",
    category: "single-creative-apps",
    shortDescription:
      "Review and approval for creative work in one place, with 3 TB of cloud storage per additional licence.",
    features: [
      "Share, review and organise creative work in one place",
      "3 TB of cloud storage, plus 2 TB for each additional licence",
      "Unlimited projects",
      "Sharing and access controls",
    ],
  },
  {
    slug: "adobe-stock-10-assets",
    name: "Adobe Stock — 10 assets a month",
    adobeRupees: 33_516,
    sku: "ADB-STOCK-10-A1",
    category: "single-creative-apps",
    shortDescription:
      "Ten royalty-free downloads a month from the Adobe Stock library of photos, videos, illustrations and templates.",
    features: [
      "Design better with millions of royalty-free photos, videos, illustrations and templates",
    ],
  },

  // ── collections ─────────────────────────────────────────────────────────
  {
    slug: "adobe-creative-cloud-all-apps-teams",
    name: "Adobe Creative Cloud All Apps for Teams",
    // The business named this figure directly rather than deriving it.
    adobeRupees: 0,
    listRupees: 107_000,
    sku: "ADB-CC-ALL-TEAM-A1",
    category: "creative-suites",
    shortDescription:
      "The full Creative Cloud application set for design and production teams, with centralised licence control.",
    features: [
      "Photoshop, Illustrator, InDesign, Premiere Pro and more",
      "100 GB cloud storage per user",
      "Adobe Fonts and Adobe Stock integration",
      "Centralised licence control through the Admin Console",
    ],
  },
  {
    slug: "adobe-substance-3d-collection",
    name: "Adobe Substance 3D Collection",
    adobeRupees: 134_040,
    sku: "ADB-SUB3D-COLL-A1",
    category: "creative-suites",
    shortDescription:
      "The Substance 3D applications for product design, marketing and branding, with 100 monthly generative credits.",
    features: [
      "Quickly create realistic 3D content for product design, marketing and branding",
      "Use Substance 3D Modeler on Meta Quest 2 and Quest Pro virtual reality headsets",
      "Get 100 monthly generative credits for premium video and audio features",
    ],
  },
];

/** Where each figure came from, written into the price history. */
const PROVENANCE =
  "Adobe reseller price list supplied by the business, 23 October 2026 — annual, per licence, excluding GST, plus ₹5,000 per user.";

export const adobePriceList: ContentMigration = {
  id: "2026-10-adobe-price-list",
  describe: "publish the Adobe catalogue at the supplied annual prices, and drop the monthly variants",

  async apply(prisma) {
    const brand = await prisma.brand.findFirst({
      where: { slug: "adobe", deletedAt: null },
      select: { id: true },
    });
    if (!brand) return "no Adobe brand to price against; nothing changed";

    const categories = await prisma.category.findMany({
      where: { slug: { in: [...new Set(ENTRIES.map((entry) => entry.category))] } },
      select: { id: true, slug: true },
    });
    const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));

    let created = 0;
    let repriced = 0;
    const skipped: string[] = [];

    for (const entry of ENTRIES) {
      const categoryId = categoryBySlug.get(entry.category);
      if (!categoryId) {
        skipped.push(`${entry.slug} (no ${entry.category} category)`);
        continue;
      }

      const listPriceMinor =
        entry.listRupees !== undefined
          ? entry.listRupees * 100
          : entry.adobeRupees * 100 + MARGIN_MINOR;

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
                purchaseMode: "BOTH",
                features: entry.features,
                unitLabel: "licence",
              },
              select: { id: true },
            })
          ).id;

      if (!existing) created += 1;

      /*
       * The annual variant, matched on its SKU so a re-run reprices rather
       * than duplicates. A variant that already exists keeps its id, which is
       * what any quotation line referencing it depends on.
       */
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
        repriced += 1;
      } else {
        const fresh = await prisma.productVariant.create({
          data: {
            productId,
            sku: entry.sku,
            name: "Annual commitment, billed yearly",
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
        await prisma.price.create({
          data: { variantId: fresh.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
        });
        repriced += 1;
      }
    }

    /*
     * Annual only. Archived rather than deleted: a quotation or an order may
     * reference a monthly line, and a document that cannot be reprinted is a
     * worse outcome than a row nobody can select.
     */
    const { count: archived } = await prisma.productVariant.updateMany({
      where: {
        deletedAt: null,
        licenceType: "SUBSCRIPTION_MONTHLY",
        product: { brandId: brand.id },
      },
      data: { deletedAt: new Date() },
    });

    const parts = [
      `created ${created} Adobe product${created === 1 ? "" : "s"}`,
      `priced ${repriced} annual variant${repriced === 1 ? "" : "s"}`,
      `archived ${archived} monthly variant${archived === 1 ? "" : "s"}`,
    ];
    if (skipped.length > 0) parts.push(`skipped ${skipped.join(", ")}`);
    return parts.join(", ");
  },
};
