import type { FieldDescriptor } from "@/lib/admin/fields";
import { tags } from "@/lib/cache";

/**
 * The registry of admin-manageable resources.
 *
 * One declaration per resource drives the list screen, the create and edit
 * forms, validation, the database write and cache invalidation. Adding a
 * manageable content type is a change to this file, not eight new screens.
 *
 * Products are deliberately absent: they already have bespoke screens with
 * variant sub-forms and price history, which this generic shape would not
 * improve.
 */

export type ResourceKey =
  | "brands"
  | "categories"
  | "services"
  | "posts"
  | "faqs"
  | "banners";

export type ListColumn = {
  header: string;
  /** Field to read for the cell, resolved with dot notation for relations. */
  path: string;
  /** How to present the value. */
  format?: "text" | "slug" | "badge" | "boolean" | "date" | "number";
  /** Makes the cell a link to the record's edit page. */
  primary?: boolean;
};

export type ResourceConfig = {
  key: ResourceKey;
  /** Prisma delegate name; must be a model with a matching shape. */
  model: "brand" | "category" | "service" | "blogPost" | "faq" | "banner";
  label: { singular: string; plural: string };
  description: string;
  /**
   * Privilege required to write. Content that changes what every visitor sees
   * is "admin"; SALES keeps its commercial surfaces and nothing more.
   */
  guard: "staff" | "admin";
  fields: FieldDescriptor[];
  listColumns: ListColumn[];
  /** Columns searched by the list screen's GET form. */
  searchFields: string[];
  /** Unique human key, used for clash detection and in URLs. */
  slugField?: string;
  /** Whether the model has `deletedAt` and supports archive/restore. */
  softDelete: boolean;
  orderBy: Array<Record<string, "asc" | "desc">>;
  /** Cache tags invalidated by any write to this resource. */
  tagsFor: (row: { slug?: string | null }) => string[];
};

const PUBLICATION_GROUP = "Publication";

export const RESOURCES: Record<ResourceKey, ResourceConfig> = {
  brands: {
    key: "brands",
    model: "brand",
    label: { singular: "Brand", plural: "Brands" },
    description: "Publishers and manufacturers whose products you resell. Each has a public brand page.",
    guard: "admin",
    slugField: "slug",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    searchFields: ["name", "slug", "tagline"],
    tagsFor: (row) => [
      tags.brands,
      tags.catalogue,
      ...(row.slug ? [tags.brand(row.slug)] : []),
    ],
    listColumns: [
      { header: "Brand", path: "name", primary: true },
      { header: "Slug", path: "slug", format: "slug" },
      { header: "Products", path: "_count.products", format: "number" },
      { header: "Order", path: "displayOrder", format: "number" },
      { header: "Featured", path: "featured", format: "boolean" },
    ],
    fields: [
      { kind: "text", name: "name", label: "Name", required: true, maxLength: 120, group: "Identity" },
      { kind: "slug", name: "slug", label: "URL slug", from: "name", hint: "Used as /brands/{slug}", group: "Identity" },
      { kind: "text", name: "tagline", label: "Tagline", maxLength: 160, group: "Identity" },
      { kind: "textarea", name: "summary", label: "Summary", required: true, rows: 3, maxLength: 600, group: "Content" },
      { kind: "textarea", name: "description", label: "Description", required: true, rows: 8, markdown: true, group: "Content" },
      { kind: "text", name: "logoText", label: "Logo text", required: true, maxLength: 40, hint: "Short wordmark shown on cards.", group: "Presentation" },
      { kind: "text", name: "accentColor", label: "Accent colour", maxLength: 9, hint: "Hex, e.g. #1e3a8a", group: "Presentation" },
      { kind: "text", name: "website", label: "Brand website", maxLength: 300, group: "Presentation" },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, hint: "Lower sorts first.", group: PUBLICATION_GROUP },
      { kind: "checkbox", name: "featured", label: "Featured", group: PUBLICATION_GROUP },
    ],
  },

  categories: {
    key: "categories",
    model: "category",
    label: { singular: "Category", plural: "Categories" },
    description: "How the catalogue is organised. A category may sit under a parent.",
    guard: "admin",
    slugField: "slug",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    searchFields: ["name", "slug"],
    tagsFor: (row) => [
      tags.categories,
      tags.catalogue,
      ...(row.slug ? [tags.category(row.slug)] : []),
    ],
    listColumns: [
      { header: "Category", path: "name", primary: true },
      { header: "Parent", path: "parent.name" },
      { header: "Slug", path: "slug", format: "slug" },
      { header: "Products", path: "_count.products", format: "number" },
      { header: "Order", path: "displayOrder", format: "number" },
      { header: "Featured", path: "featured", format: "boolean" },
    ],
    fields: [
      { kind: "text", name: "name", label: "Name", required: true, maxLength: 120, group: "Identity" },
      { kind: "slug", name: "slug", label: "URL slug", from: "name", group: "Identity" },
      { kind: "relation", name: "parentId", label: "Parent category", resource: "category", hint: "Leave empty for a top-level category.", group: "Identity" },
      { kind: "relation", name: "brandId", label: "Brand", resource: "brand", hint: "Only for categories specific to one brand.", group: "Identity" },
      { kind: "textarea", name: "summary", label: "Summary", rows: 2, maxLength: 400, group: "Content" },
      { kind: "textarea", name: "description", label: "Description", rows: 6, markdown: true, group: "Content" },
      { kind: "text", name: "icon", label: "Icon key", maxLength: 40, group: "Content" },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
      { kind: "checkbox", name: "featured", label: "Featured on the homepage", group: PUBLICATION_GROUP },
    ],
  },

  services: {
    key: "services",
    model: "service",
    label: { singular: "Service", plural: "Services" },
    description: "Managed and professional services, each with a public page.",
    guard: "admin",
    slugField: "slug",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    searchFields: ["name", "slug", "category", "summary"],
    tagsFor: (row) => [tags.services, ...(row.slug ? [tags.service(row.slug)] : [])],
    listColumns: [
      { header: "Service", path: "name", primary: true },
      { header: "Category", path: "category" },
      { header: "Order", path: "displayOrder", format: "number" },
      { header: "Published", path: "published", format: "boolean" },
      { header: "Featured", path: "featured", format: "boolean" },
    ],
    fields: [
      { kind: "text", name: "name", label: "Name", required: true, maxLength: 140, group: "Identity" },
      { kind: "slug", name: "slug", label: "URL slug", from: "name", group: "Identity" },
      { kind: "text", name: "category", label: "Category", required: true, maxLength: 80, hint: "Free text, e.g. Cloud & infrastructure.", group: "Identity" },
      { kind: "textarea", name: "summary", label: "Summary", required: true, rows: 3, maxLength: 600, group: "Content" },
      { kind: "text", name: "heroHeadline", label: "Hero headline", required: true, maxLength: 200, group: "Content" },
      { kind: "textarea", name: "problem", label: "The problem", required: true, rows: 5, markdown: true, group: "Content" },
      { kind: "textarea", name: "solution", label: "The solution", required: true, rows: 5, markdown: true, group: "Content" },
      { kind: "lines", name: "benefits", label: "Benefits", hint: "One per line.", group: "Content" },
      { kind: "lines", name: "technologies", label: "Technologies", hint: "One per line.", group: "Content" },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
      { kind: "checkbox", name: "published", label: "Published", group: PUBLICATION_GROUP },
      { kind: "checkbox", name: "featured", label: "Featured", group: PUBLICATION_GROUP },
    ],
  },

  posts: {
    key: "posts",
    model: "blogPost",
    label: { singular: "Article", plural: "Articles" },
    description: "Guidance articles. Body text uses the same Markdown subset as page prose.",
    guard: "admin",
    slugField: "slug",
    softDelete: true,
    orderBy: [{ publishedAt: "desc" }],
    searchFields: ["title", "slug", "category", "excerpt"],
    tagsFor: (row) => [tags.posts, ...(row.slug ? [tags.post(row.slug)] : [])],
    listColumns: [
      { header: "Title", path: "title", primary: true },
      { header: "Category", path: "category" },
      { header: "Published", path: "publishedAt", format: "date" },
      { header: "Read time", path: "readMinutes", format: "number" },
      { header: "Status", path: "status", format: "badge" },
    ],
    fields: [
      { kind: "text", name: "title", label: "Title", required: true, maxLength: 200, group: "Identity" },
      { kind: "slug", name: "slug", label: "URL slug", from: "title", group: "Identity" },
      { kind: "text", name: "category", label: "Category", required: true, maxLength: 80, group: "Identity" },
      { kind: "textarea", name: "excerpt", label: "Excerpt", required: true, rows: 3, maxLength: 400, hint: "Shown on cards and as the meta description.", group: "Content" },
      { kind: "textarea", name: "body", label: "Body", required: true, rows: 20, markdown: true, maxLength: 60_000, group: "Content" },
      { kind: "lines", name: "tags", label: "Tags", hint: "One per line.", maxItems: 12, group: "Content" },
      { kind: "number", name: "readMinutes", label: "Read time (minutes)", min: 1, max: 120, group: PUBLICATION_GROUP },
      { kind: "select", name: "status", label: "Status", required: true, options: [
        { value: "DRAFT", label: "Draft" },
        { value: "PUBLISHED", label: "Published" },
      ], group: PUBLICATION_GROUP },
      { kind: "date", name: "publishedAt", label: "Publish date", hint: "A future date keeps it hidden until then.", group: PUBLICATION_GROUP },
    ],
  },

  faqs: {
    key: "faqs",
    model: "faq",
    label: { singular: "FAQ", plural: "FAQs" },
    description:
      "Questions attached to a brand, a service or a free-text topic. They feed the public pages and their FAQ structured data.",
    guard: "admin",
    softDelete: false,
    orderBy: [{ displayOrder: "asc" }],
    searchFields: ["question", "answer", "topic"],
    tagsFor: () => [tags.faqs, tags.brands, tags.services, tags.pages],
    listColumns: [
      { header: "Question", path: "question", primary: true },
      { header: "Brand", path: "brand.name" },
      { header: "Service", path: "service.name" },
      { header: "Topic", path: "topic" },
      { header: "Order", path: "displayOrder", format: "number" },
    ],
    fields: [
      { kind: "textarea", name: "question", label: "Question", required: true, rows: 2, maxLength: 400, group: "Content" },
      { kind: "textarea", name: "answer", label: "Answer", required: true, rows: 6, maxLength: 4000, group: "Content" },
      { kind: "relation", name: "brandId", label: "Brand", resource: "brand", group: "Attach to" },
      { kind: "relation", name: "serviceId", label: "Service", resource: "service", group: "Attach to" },
      { kind: "relation", name: "productId", label: "Product", resource: "product", group: "Attach to" },
      { kind: "text", name: "topic", label: "Topic", maxLength: 80, hint: "For pages with no database record of their own, e.g. microsoft-licensing.", group: "Attach to" },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
    ],
  },

  banners: {
    key: "banners",
    model: "banner",
    label: { singular: "Banner", plural: "Banners" },
    description: "Site-wide notices. Only one active banner shows at a time, by display order.",
    guard: "admin",
    softDelete: false,
    orderBy: [{ displayOrder: "asc" }],
    searchFields: ["name", "message"],
    tagsFor: () => [tags.banners],
    listColumns: [
      { header: "Name", path: "name", primary: true },
      { header: "Message", path: "message" },
      { header: "Tone", path: "tone", format: "badge" },
      { header: "Starts", path: "startsAt", format: "date" },
      { header: "Ends", path: "endsAt", format: "date" },
      { header: "Active", path: "active", format: "boolean" },
    ],
    fields: [
      { kind: "text", name: "name", label: "Internal name", required: true, maxLength: 120, hint: "Never shown to visitors.", group: "Identity" },
      { kind: "textarea", name: "message", label: "Message", required: true, rows: 2, maxLength: 300, group: "Content" },
      { kind: "text", name: "linkLabel", label: "Link label", maxLength: 60, group: "Content" },
      { kind: "text", name: "href", label: "Link target", maxLength: 300, hint: "A path on this site, e.g. /enterprise", group: "Content" },
      { kind: "select", name: "tone", label: "Tone", required: true, options: [
        { value: "INFO", label: "Information" },
        { value: "PROMO", label: "Promotion" },
        { value: "WARNING", label: "Warning" },
      ], group: "Presentation" },
      { kind: "date", name: "startsAt", label: "Starts", group: PUBLICATION_GROUP },
      { kind: "date", name: "endsAt", label: "Ends", group: PUBLICATION_GROUP },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
      { kind: "checkbox", name: "active", label: "Active", group: PUBLICATION_GROUP },
    ],
  },
};

/**
 * Resolves an untrusted resource key from a form submission.
 *
 * The key arrives in the request body, so it is matched against this registry
 * rather than used to index anything directly. An unknown key returns null and
 * the caller refuses the write — it never falls back to a default resource.
 */
export function resolveResource(key: unknown): ResourceConfig | null {
  if (typeof key !== "string") return null;
  return Object.hasOwn(RESOURCES, key) ? RESOURCES[key as ResourceKey] : null;
}

export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];
