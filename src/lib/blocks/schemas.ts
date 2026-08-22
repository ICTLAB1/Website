import { z } from "zod";

/**
 * Block payload schemas.
 *
 * Each `PageSectionType` has a schema here, applied on write *and* on read.
 *
 * Validating on read matters as much as on write: the payload is JSONB, so a
 * row written by an older version of the app, by a migration, or by hand in
 * psql can hold a shape the renderer does not expect. Parsing on read turns
 * that into one skipped block rather than a failed page — a page missing a
 * section is recoverable, a 500 on a marketing page is not.
 */

const text = (max = 300) => z.string().trim().min(1).max(max);
const optionalText = (max = 300) => z.string().trim().max(max).optional();

/** Internal paths and absolute URLs only: never `javascript:` or `data:`. */
export const safeHref = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine(
    (value) =>
      // A protocol-relative href — `//evil.test`, or `/\evil.test`, which
      // browsers normalise to the same thing — starts with a slash and looks
      // internal, but navigates off-site. Someone who can author a menu link
      // or a block could otherwise point "Products" at a phishing page.
      (value.startsWith("/") && !/^\/[/\\]/.test(value)) ||
      value.startsWith("#") ||
      value.startsWith("https://") ||
      value.startsWith("mailto:") ||
      value.startsWith("tel:"),
    { message: "Use a path starting with /, or an https:, mailto: or tel: URL." },
  );

const cta = z.object({ label: text(60), href: safeHref });

/** One statistic. `literal` prints `value`; the rest are counted live. */
export const statItemSchema = z.object({
  label: text(80),
  source: z
    .enum(["literal", "productCount", "skuCount", "brandCount", "categoryCount"])
    .default("literal"),
  value: optionalText(40),
});

export const heroSchema = z.object({
  eyebrow: optionalText(80),
  headline: text(200),
  subheadline: optionalText(600),
  primaryCta: cta.optional(),
  secondaryCta: cta.optional(),
  /** Renders the global product search inside the hero. */
  showSearch: z.boolean().optional().default(false),
  tone: z.enum(["dark", "light"]).optional().default("dark"),
  /**
   * Statistics shown inside the hero's own band. Kept here rather than as a
   * separate STAT_BAR block because they sit within the hero's background;
   * a separate block would break the band in two.
   */
  stats: z.array(statItemSchema).max(6).optional().default([]),
  /**
   * Suggested searches offered under the hero search box. Each becomes a link
   * to the search page for that term, so the suggestions can be tuned to what
   * the catalogue actually sells without touching code.
   */
  searchTerms: z.array(text(60)).max(8).optional().default([]),
});

export const richTextSchema = z.object({
  heading: optionalText(200),
  /** Markdown subset; rendered to React elements, never to HTML. */
  markdown: z.string().trim().min(1).max(20_000),
});

export const bulletsSchema = z.object({
  heading: optionalText(200),
  items: z.array(text(400)).min(1).max(40),
});

export const cardsSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(600),
  /** Numbers the cards, for step-by-step sequences. */
  numbered: z.boolean().optional().default(false),
  /**
   * Replaces the numeric badge with a worded label, e.g. "Step" renders
   * "Step 1". Only used when the cards are numbered.
   */
  numberLabel: optionalText(20),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional().default(2),
  items: z.array(z.object({ title: text(160), body: text(800) })).min(1).max(24),
});

export const iconPointsSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  items: z.array(z.object({ label: text(80), detail: optionalText(160) })).min(1).max(12),
});

export const linkListSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(600),
  layout: z.enum(["cards", "chips", "inline"]).optional().default("cards"),
  /** Affordance shown on each card, e.g. "Read guide". Cards layout only. */
  itemAction: optionalText(40),
  items: z
    .array(z.object({ label: text(120), href: safeHref, description: optionalText(300) }))
    .min(1)
    .max(24),
});

export const keyValueListSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  items: z.array(z.object({ key: text(120), value: text(200) })).min(1).max(30),
});

export const chipListSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(600),
  items: z.array(text(120)).min(1).max(60),
  footnote: optionalText(300),
});

export const splitPanelSchema = z.object({
  eyebrow: optionalText(80),
  heading: text(200),
  description: optionalText(800),
  /** Sentence introducing the bullet list, e.g. "We support:". */
  bulletsIntro: optionalText(200),
  bullets: z.array(text(200)).max(12).optional().default([]),
  tiles: z.array(text(80)).max(8).optional().default([]),
});

export const statBarSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  items: z.array(statItemSchema).min(1).max(6),
});

export const productGridSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(600),
  source: z.enum(["manual", "featured", "popular", "brand", "category"]).default("manual"),
  /** Product slugs, for `manual`. Order is preserved as authored. */
  slugs: z.array(z.string().trim().max(200)).max(24).optional().default([]),
  /** Brand or category slug, for the `brand` and `category` sources. */
  ref: optionalText(200),
  limit: z.number().int().min(1).max(24).optional().default(6),
  /** Optional "see more" link beside the heading. */
  action: z.object({ label: text(60), href: safeHref }).optional(),
});

export const collectionGridSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(600),
  kind: z.enum(["brands", "categories", "services", "posts", "postCategories", "certifications"]),
  limit: z.number().int().min(1).max(24).optional().default(8),
  layout: z.enum(["grid", "strip"]).optional().default("grid"),
  /** Optional link beside the heading. */
  action: z.object({ label: text(60), href: safeHref }).optional(),
});

export const faqSchema = z.object({
  heading: optionalText(200),
  /**
   * `brand` and `topic` read live FAQ rows, so a question edited in the admin
   * panel updates every page showing it. `manual` is for one-off questions
   * that belong to a single page.
   */
  source: z.enum(["brand", "topic", "manual", "page"]).default("page"),
  ref: optionalText(200),
  items: z
    .array(z.object({ question: text(400), answer: text(4000) }))
    .max(30)
    .optional()
    .default([]),
});

/**
 * Renders the company identity panel.
 *
 * Stores no identity itself — the values come from environment configuration
 * at render time, which is where business identity deliberately lives. The
 * block only says "show that panel here", so an administrator can place it
 * without being able to edit a GSTIN through the CMS.
 */
export const companyInfoSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(800),
  /**
   * Which set of configured details to show.
   *
   * `identity` is the registration and contact panel an about page wants.
   * `grievance` is the grievance officer, which the Consumer Protection
   * (E-Commerce) Rules 2020 require a seller to publish, and which belongs on
   * the legal pages rather than beside the marketing copy.
   */
  fields: z.enum(["identity", "grievance", "all"]).optional().default("identity"),
  footnote: optionalText(1200),
});

export const noticeSchema = z.object({
  tone: z.enum(["info", "warning"]).optional().default("info"),
  heading: optionalText(200),
  markdown: z.string().trim().min(1).max(4000),
});

export const ctaBannerSchema = z.object({
  heading: text(200),
  body: optionalText(800),
  primaryCta: cta.optional(),
  secondaryCta: cta.optional(),
  /**
   * Offers the configured enterprise (or sales) address as a mailto action.
   * The address itself comes from server configuration, never from the stored
   * payload - the same rule the company information block follows. When no
   * address is configured the action is simply omitted.
   */
  showContactEmail: z.boolean().optional().default(false),
  tone: z.enum(["dark", "light", "accent"]).optional().default("dark"),
});

export const plansSchema = z.object({
  eyebrow: optionalText(80),
  heading: optionalText(200),
  description: optionalText(600),
  items: z
    .array(
      z.object({
        name: text(120),
        summary: text(400),
        points: z.array(text(200)).max(12).optional().default([]),
        productSlug: optionalText(200),
      }),
    )
    .min(1)
    .max(8),
});

export const BLOCK_SCHEMAS = {
  HERO: heroSchema,
  RICH_TEXT: richTextSchema,
  BULLETS: bulletsSchema,
  CARDS: cardsSchema,
  ICON_POINTS: iconPointsSchema,
  LINK_LIST: linkListSchema,
  KEY_VALUE_LIST: keyValueListSchema,
  CHIP_LIST: chipListSchema,
  SPLIT_PANEL: splitPanelSchema,
  STAT_BAR: statBarSchema,
  PRODUCT_GRID: productGridSchema,
  COLLECTION_GRID: collectionGridSchema,
  FAQ: faqSchema,
  COMPANY_INFO: companyInfoSchema,
  NOTICE: noticeSchema,
  CTA_BANNER: ctaBannerSchema,
  PLANS: plansSchema,
} as const;

export type BlockType = keyof typeof BLOCK_SCHEMAS;
export const BLOCK_TYPES = Object.keys(BLOCK_SCHEMAS) as BlockType[];

export type BlockData<T extends BlockType> = z.infer<(typeof BLOCK_SCHEMAS)[T]>;

/** A block whose payload has been validated against its type's schema. */
export type ParsedBlock = {
  [T in BlockType]: { id: string; type: T; data: BlockData<T> };
}[BlockType];

export function isBlockType(value: unknown): value is BlockType {
  return typeof value === "string" && Object.hasOwn(BLOCK_SCHEMAS, value);
}

/**
 * Validates one stored row.
 *
 * Returns null rather than throwing: the caller filters those out, so one bad
 * row costs a section rather than the page.
 */
export function parseBlock(row: { id: string; type: string; data: unknown }): ParsedBlock | null {
  if (!isBlockType(row.type)) return null;
  const parsed = BLOCK_SCHEMAS[row.type].safeParse(row.data);
  if (!parsed.success) return null;
  return { id: row.id, type: row.type, data: parsed.data } as ParsedBlock;
}

/**
 * The payload a newly added block starts from.
 *
 * Every entry must satisfy its own schema, or that block type cannot be created
 * at all — a failure invisible until someone tries to add one. A unit test
 * asserts exactly that, which is only meaningful because this is the single
 * definition the admin action also uses.
 */
export const BLOCK_SEEDS: { [T in BlockType]: BlockData<T> } = {
  HERO: heroSchema.parse({ headline: "New heading", tone: "dark", showSearch: false }),
  RICH_TEXT: richTextSchema.parse({ markdown: "New paragraph." }),
  BULLETS: bulletsSchema.parse({ items: ["First point"] }),
  CARDS: cardsSchema.parse({ items: [{ title: "Card title", body: "Card body." }] }),
  ICON_POINTS: iconPointsSchema.parse({ items: [{ label: "Point" }] }),
  LINK_LIST: linkListSchema.parse({ items: [{ label: "Link", href: "/" }] }),
  KEY_VALUE_LIST: keyValueListSchema.parse({ items: [{ key: "Name", value: "Value" }] }),
  CHIP_LIST: chipListSchema.parse({ items: ["Item"] }),
  SPLIT_PANEL: splitPanelSchema.parse({ heading: "New panel" }),
  STAT_BAR: statBarSchema.parse({ items: [{ label: "Products", source: "productCount" }] }),
  PRODUCT_GRID: productGridSchema.parse({ source: "featured", limit: 6 }),
  COLLECTION_GRID: collectionGridSchema.parse({ kind: "brands", limit: 8 }),
  FAQ: faqSchema.parse({ source: "page" }),
  COMPANY_INFO: companyInfoSchema.parse({ heading: "Company information" }),
  NOTICE: noticeSchema.parse({ tone: "info", markdown: "Something worth saying before the rest of the page." }),
  CTA_BANNER: ctaBannerSchema.parse({ heading: "New call to action", tone: "dark" }),
  PLANS: plansSchema.parse({ items: [{ name: "Plan", summary: "What it includes." }] }),
};

/** Human labels for the block picker in the admin panel. */
export const BLOCK_LABELS: Record<BlockType, string> = {
  HERO: "Hero",
  RICH_TEXT: "Rich text",
  BULLETS: "Bullet list",
  CARDS: "Card grid",
  ICON_POINTS: "Icon points",
  LINK_LIST: "Link list",
  KEY_VALUE_LIST: "Key/value list",
  CHIP_LIST: "Chip list",
  SPLIT_PANEL: "Split panel",
  STAT_BAR: "Statistics bar",
  PRODUCT_GRID: "Product grid",
  COLLECTION_GRID: "Collection grid",
  FAQ: "FAQ",
  COMPANY_INFO: "Company information",
  NOTICE: "Notice",
  CTA_BANNER: "Call to action",
  PLANS: "Plan comparison",
};
