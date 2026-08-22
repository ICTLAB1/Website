import type { BlockType } from "@/lib/blocks/schemas";

/**
 * Which block types get a typed form, and what fields that form shows.
 *
 * The types that carry almost all of the stored blocks get one, which removes
 * almost all need to edit raw JSON. The rest keep the JSON editor, which stays
 * available on every block regardless.
 *
 * A form is described as data rather than hand-built markup so that the field
 * list, the values read out of a submission, and the payload written back
 * cannot drift apart — the same reason the admin resource registry works this
 * way.
 */

export type BlockField =
  /** A single scalar at `path`, e.g. "heading" or "primaryCta.label". */
  | { kind: "text"; path: string; label: string; required?: boolean; hint?: string }
  | { kind: "markdown"; path: string; label: string; required?: boolean; hint?: string }
  | { kind: "textarea"; path: string; label: string; required?: boolean; hint?: string }
  | { kind: "select"; path: string; label: string; options: string[]; hint?: string }
  | { kind: "number"; path: string; label: string; min?: number; max?: number; hint?: string }
  | { kind: "checkbox"; path: string; label: string; hint?: string }
  /** A repeatable list of strings at `path`, edited one per line. */
  | { kind: "stringList"; path: string; label: string; hint?: string }
  /** A repeatable list of objects at `path`, each with its own sub-fields. */
  | {
      kind: "objectList";
      path: string;
      label: string;
      hint?: string;
      itemLabel: string;
      fields: Array<{
        key: string;
        label: string;
        kind: "text" | "textarea" | "stringList";
        required?: boolean;
      }>;
    };

export type BlockFormShape = { fields: BlockField[] };

/** Only these types have a typed form; anything absent falls back to JSON. */
export const BLOCK_FORMS: Partial<Record<BlockType, BlockFormShape>> = {
  HERO: {
    fields: [
      { kind: "text", path: "eyebrow", label: "Eyebrow", hint: "Small label above the heading." },
      { kind: "text", path: "headline", label: "Headline", required: true },
      { kind: "textarea", path: "subheadline", label: "Sub-heading" },
      { kind: "text", path: "primaryCta.label", label: "Primary button label" },
      { kind: "text", path: "primaryCta.href", label: "Primary button link", hint: "A path such as /enquiry" },
      { kind: "text", path: "secondaryCta.label", label: "Secondary button label" },
      { kind: "text", path: "secondaryCta.href", label: "Secondary button link" },
      { kind: "select", path: "tone", label: "Background", options: ["dark", "light"] },
      { kind: "checkbox", path: "showSearch", label: "Show the product search box" },
      {
        kind: "stringList",
        path: "searchTerms",
        label: "Suggested searches",
        hint: "One per line. Shown under the search box as links; only used when the search box is shown.",
      },
      {
        kind: "objectList",
        path: "stats",
        label: "Statistics",
        itemLabel: "Statistic",
        hint: 'Leave "Source" as literal to show the value as typed. The other sources read live counts: productCount, skuCount, brandCount, categoryCount.',
        fields: [
          { key: "label", label: "Label", kind: "text", required: true },
          { key: "source", label: "Source", kind: "text" },
          { key: "value", label: "Value", kind: "text" },
        ],
      },
    ],
  },

  RICH_TEXT: {
    fields: [
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "markdown", path: "markdown", label: "Body", required: true },
    ],
  },

  BULLETS: {
    fields: [
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "stringList", path: "items", label: "Points", hint: "One per line." },
    ],
  },

  /**
   * The block that lists organisations — sectors served, customers named.
   *
   * Given a form because the names in it change as the business wins work, and
   * whoever knows a new one is worth naming is not the person who should have
   * to edit JSON to add it.
   */
  CHIP_LIST: {
    fields: [
      { kind: "text", path: "eyebrow", label: "Eyebrow", hint: "Small label above the heading." },
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "textarea", path: "description", label: "Intro" },
      {
        kind: "stringList",
        path: "items",
        label: "Names",
        hint: "One per line, in the order to display.",
      },
      {
        kind: "text",
        path: "footnote",
        label: "Footnote",
        hint: "Small line under the list, e.g. a total.",
      },
    ],
  },

  CARDS: {
    fields: [
      { kind: "text", path: "eyebrow", label: "Eyebrow", hint: "Small label above the heading." },
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "textarea", path: "description", label: "Intro" },
      { kind: "checkbox", path: "numbered", label: "Number the cards" },
      { kind: "text", path: "numberLabel", label: "Number label", hint: 'Worded prefix for the number, e.g. "Step". Leave blank for a plain badge.' },
      { kind: "select", path: "columns", label: "Columns", options: ["2", "3", "4"] },
      {
        kind: "objectList",
        path: "items",
        label: "Cards",
        itemLabel: "Card",
        fields: [
          { key: "title", label: "Title", kind: "text", required: true },
          { key: "body", label: "Body", kind: "textarea", required: true },
        ],
      },
    ],
  },

  LINK_LIST: {
    fields: [
      { kind: "text", path: "eyebrow", label: "Eyebrow", hint: "Small label above the heading." },
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "textarea", path: "description", label: "Intro" },
      { kind: "select", path: "layout", label: "Layout", options: ["cards", "chips", "inline"] },
      { kind: "text", path: "itemAction", label: "Card affordance", hint: 'Shown on each card before the arrow, e.g. "Read guide". Cards layout only.' },
      {
        kind: "objectList",
        path: "items",
        label: "Links",
        itemLabel: "Link",
        fields: [
          { key: "label", label: "Label", kind: "text", required: true },
          { key: "href", label: "Link", kind: "text", required: true },
          { key: "description", label: "Description", kind: "text" },
        ],
      },
    ],
  },

  PRODUCT_GRID: {
    fields: [
      { kind: "text", path: "eyebrow", label: "Eyebrow", hint: "Small label above the heading." },
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "textarea", path: "description", label: "Intro" },
      {
        kind: "select",
        path: "source",
        label: "Which products",
        options: ["manual", "featured", "popular", "brand", "category"],
        hint: "Manual uses the slug list below; the others read the catalogue live.",
      },
      { kind: "stringList", path: "slugs", label: "Product slugs", hint: "One per line, in the order to display. Used when the source is manual." },
      { kind: "text", path: "ref", label: "Brand or category slug", hint: "Used when the source is brand or category." },
      { kind: "number", path: "limit", label: "Maximum products", min: 1, max: 24 },
      { kind: "text", path: "action.label", label: "Link label", hint: 'Optional link beside the heading, e.g. "Full catalogue".' },
      { kind: "text", path: "action.href", label: "Link target" },
    ],
  },

  FAQ: {
    fields: [
      { kind: "text", path: "heading", label: "Heading" },
      {
        kind: "select",
        path: "source",
        label: "Where the questions come from",
        options: ["page", "brand", "topic", "manual"],
        hint: "Page uses whatever this page is attached to. Brand and topic read the FAQ library, so an edit there updates every page showing it.",
      },
      { kind: "text", path: "ref", label: "Brand slug or topic", hint: "Only needed for the brand and topic sources." },
      {
        kind: "objectList",
        path: "items",
        label: "Questions written just for this page",
        itemLabel: "Question",
        fields: [
          { key: "question", label: "Question", kind: "text", required: true },
          { key: "answer", label: "Answer", kind: "textarea", required: true },
        ],
      },
    ],
  },

  NOTICE: {
    fields: [
      { kind: "select", path: "tone", label: "Tone", options: ["info", "warning"] },
      { kind: "text", path: "heading", label: "Heading" },
      { kind: "markdown", path: "markdown", label: "Body", required: true },
    ],
  },

  CTA_BANNER: {
    fields: [
      { kind: "text", path: "heading", label: "Heading", required: true },
      { kind: "textarea", path: "body", label: "Body" },
      { kind: "text", path: "primaryCta.label", label: "Primary button label" },
      { kind: "text", path: "primaryCta.href", label: "Primary button link" },
      { kind: "text", path: "secondaryCta.label", label: "Secondary button label" },
      { kind: "text", path: "secondaryCta.href", label: "Secondary button link" },
      {
        kind: "checkbox",
        path: "showContactEmail",
        label: "Offer the configured sales address",
        hint: "Adds a mailto link using the address from server configuration. Nothing is shown if none is configured.",
      },
      { kind: "select", path: "tone", label: "Background", options: ["dark", "light", "accent"] },
    ],
  },
};

export function hasForm(type: string): boolean {
  return Object.hasOwn(BLOCK_FORMS, type);
}

/** Reads a dotted path out of a payload. */
export function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);
}

/**
 * Writes a dotted path into a payload, creating intermediate objects.
 *
 * An empty value deletes the key rather than storing `""`, so an optional
 * nested group such as `primaryCta` disappears entirely when its fields are
 * cleared — leaving `{ label: "" }` behind would fail the schema, which
 * requires a label when the object is present.
 */
export function writePath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop()!;

  let cursor: Record<string, unknown> = target;
  for (const key of keys) {
    const existing = cursor[key];
    if (existing === null || typeof existing !== "object") cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }

  const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
  if (empty) delete cursor[last];
  else cursor[last] = value;
}

/** Removes nested objects left empty after their fields were cleared. */
export function pruneEmpty(target: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(target)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const child = pruneEmpty(value as Record<string, unknown>);
      if (Object.keys(child).length === 0) delete target[key];
    }
  }
  return target;
}
