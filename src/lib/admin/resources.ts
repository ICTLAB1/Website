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
  | "banners"
  | "certifications"
  | "testimonials"
  | "clients"
  | "industries"
  | "jobs";

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
  model:
    | "brand"
    | "category"
    | "service"
    | "blogPost"
    | "faq"
    | "banner"
    | "certification"
    | "testimonial"
    | "clientLogo"
    | "industry"
    | "jobPosting";
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
/*
 * Its own group, and named for what it is.
 *
 * These four fields are the difference between a permission somebody remembers
 * and one somebody can produce, and grouping them under "Identity" would file
 * them as paperwork. Displaying a customer's trademark is a claim they may be
 * asked to confirm; the person filling this in should see that as its own
 * section with its own heading.
 */
const PERMISSION_GROUP = "Permission";

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
      { kind: "text", name: "logoUrl", label: "Logo file", maxLength: 200, hint: "A file in public/brands/, e.g. /brands/microsoft.svg. Leave empty to use the lettered wordmark.", group: "Presentation" },
      { kind: "text", name: "accentColor", label: "Accent colour", maxLength: 9, hint: "Hex, e.g. #1e3a8a", group: "Presentation" },
      { kind: "text", name: "website", label: "Brand website", maxLength: 300, group: "Presentation" },
      {
        kind: "text",
        name: "partnerLabel",
        label: "Partner designation",
        maxLength: 60,
        hint: "Exactly as the programme words it. Leave empty if there is no designation.",
        group: "Partner status",
      },
      {
        kind: "text",
        name: "partnerReference",
        label: "Partner or programme ID",
        maxLength: 80,
        hint: "Internal only. Never shown on the website.",
        group: "Partner status",
      },
      {
        kind: "date",
        name: "partnerConfirmedAt",
        label: "Confirmed on",
        hint: "When this designation was last checked. It stops being shown publicly after about a year.",
        group: "Partner status",
      },
      {
        kind: "checkbox",
        name: "partnerPublic",
        label: "State this designation publicly",
        hint: "Shown only when a designation and a confirmation date are both on file.",
        group: "Partner status",
      },
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
      { kind: "checkbox", name: "published", label: "Published", defaultChecked: true, group: PUBLICATION_GROUP },
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

  industries: {
    key: "industries",
    model: "industry",
    label: { singular: "Industry", plural: "Industries" },
    description:
      "The sectors this business supplies. One row drives the homepage grid, the filter on /industries, that sector's own page and its sitemap entry — so an edit here reaches all four. Describe what is supplied to a sector; a sector is not a reference, so nothing here should name a customer or an outcome.",
    guard: "admin",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    searchFields: ["name", "slug", "summary"],
    tagsFor: () => [tags.industries, tags.pages],
    listColumns: [
      { header: "Sector", path: "name", primary: true },
      { header: "URL", path: "slug", format: "slug" },
      { header: "Published", path: "published", format: "boolean" },
      { header: "Order", path: "displayOrder", format: "number" },
    ],
    fields: [
      { kind: "text", name: "name", label: "Sector name", required: true, maxLength: 120, group: "Identity" },
      { kind: "slug", name: "slug", label: "URL slug", from: "name", group: "Identity" },
      {
        kind: "text",
        name: "icon",
        label: "Glyph",
        maxLength: 40,
        hint: "A key from lib/glyphs — business, server, construction, finance, support, document, network, chart, cad, shield, storage, workspace, media and the rest. An unknown key falls back rather than drawing nothing.",
        group: "Identity",
      },
      {
        kind: "textarea",
        name: "summary",
        label: "Summary",
        required: true,
        rows: 3,
        maxLength: 400,
        hint: "One or two sentences. Shown on the card and used as the page's meta description, so keep it between 70 and 160 characters if you can.",
        group: "Content",
      },
      {
        kind: "textarea",
        name: "description",
        label: "Detail page copy",
        rows: 6,
        markdown: true,
        maxLength: 4000,
        group: "Content",
      },
      {
        kind: "lines",
        name: "solutions",
        label: "What we supply",
        maxItems: 12,
        hint: "One per line. The first three appear on the card; all of them appear on the sector's page. Name something the catalogue actually carries.",
        group: "Content",
      },
      { kind: "checkbox", name: "published", label: "Published", defaultChecked: true, group: PUBLICATION_GROUP },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
    ],
  },

  clients: {
    key: "clients",
    model: "clientLogo",
    label: { singular: "Customer logo", plural: "Customer logos" },
    description:
      "Customers whose logo may appear on the public site. A row is shown only once it has artwork, a confirmed permission date and Published turned on — all three, so a mark cannot reach a visitor by half-finishing this form. Record who granted permission and where the evidence is: the point of the field is that somebody can produce it later.",
    guard: "admin",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    searchFields: ["name", "sector", "permissionHolder"],
    tagsFor: () => [tags.clientLogos, tags.pages],
    listColumns: [
      { header: "Customer", path: "name", primary: true },
      { header: "Sector", path: "sector" },
      { header: "Permission from", path: "permissionHolder" },
      { header: "Confirmed", path: "permissionConfirmedAt", format: "date" },
      { header: "Published", path: "published", format: "boolean" },
      { header: "Order", path: "displayOrder", format: "number" },
    ],
    fields: [
      { kind: "text", name: "name", label: "Customer name", required: true, maxLength: 160, hint: "As the organisation writes it themselves.", group: "Identity" },
      { kind: "text", name: "sector", label: "Sector", maxLength: 80, hint: 'Optional, for grouping — e.g. "Public sector", "Defence", "Manufacturing".', group: "Identity" },
      { kind: "text", name: "website", label: "Their website", maxLength: 300, group: "Identity" },
      {
        kind: "text",
        name: "permissionHolder",
        label: "Permission granted by",
        maxLength: 200,
        hint: "A name and a role, not an identifier — somebody a colleague could ring.",
        group: PERMISSION_GROUP,
      },
      {
        kind: "textarea",
        name: "permissionReference",
        label: "Where the evidence is",
        rows: 3,
        maxLength: 1000,
        hint: 'The email subject and date, the contract clause, the file reference. Free text, because the point is that a person can find it.',
        group: PERMISSION_GROUP,
      },
      {
        kind: "date",
        name: "permissionConfirmedAt",
        label: "Permission confirmed on",
        hint: "Until this is set, the logo is not shown — whatever else the form says.",
        group: PERMISSION_GROUP,
      },
      {
        kind: "checkbox",
        name: "published",
        label: "Show this logo on the site",
        hint: "Off by default even once permission is recorded: obtaining permission and choosing to use it are two decisions.",
        group: PUBLICATION_GROUP,
      },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
    ],
  },

  certifications: {
    key: "certifications",
    model: "certification",
    label: { singular: "Certification", plural: "Certifications" },
    description:
      "Independently issued certifications, transcribed from the certificate itself. An expired certificate stops being shown on the public site automatically, so keep the expiry accurate.",
    guard: "admin",
    softDelete: false,
    orderBy: [{ displayOrder: "asc" }],
    searchFields: ["standard", "title", "reference", "issuer"],
    tagsFor: () => [tags.certifications, tags.pages],
    listColumns: [
      { header: "Standard", path: "standard", primary: true },
      { header: "Covers", path: "title" },
      { header: "Certificate", path: "reference" },
      { header: "Issued by", path: "issuer" },
      { header: "Expires", path: "expiresAt", format: "date" },
      { header: "Order", path: "displayOrder", format: "number" },
    ],
    fields: [
      { kind: "text", name: "standard", label: "Standard", required: true, maxLength: 60, hint: "Exactly as printed, e.g. ISO 9001:2015", group: "Identity" },
      { kind: "text", name: "title", label: "What it covers", required: true, maxLength: 120, hint: "e.g. Quality Management System", group: "Identity" },
      { kind: "text", name: "reference", label: "Certificate number", required: true, maxLength: 60, group: "Identity" },
      { kind: "text", name: "issuer", label: "Issued by", required: true, maxLength: 160, hint: "The certification body named on the certificate.", group: "Identity" },
      { kind: "text", name: "verifyUrl", label: "Verification address", maxLength: 300, hint: "Where a customer can check it is still valid.", group: "Identity" },
      { kind: "textarea", name: "scope", label: "Scope", rows: 4, maxLength: 1000, hint: "The scope printed on the certificate, word for word.", group: "Content" },
      { kind: "date", name: "issuedAt", label: "Date of certification", required: true, group: PUBLICATION_GROUP },
      { kind: "date", name: "expiresAt", label: "Expires", hint: "After this date it is hidden from the public site.", group: PUBLICATION_GROUP },
      { kind: "number", name: "displayOrder", label: "Display order", min: 0, max: 10_000, group: PUBLICATION_GROUP },
    ],
  },

  testimonials: {
    key: "testimonials",
    model: "testimonial",
    label: { singular: "Testimonial", plural: "Testimonials" },
    description:
      "Quotes from customers, in their own words. Nothing here reaches the public site without a recorded consent date — publishing a named person, their job title and their employer on our website is something they have to have agreed to, and “they said it in an email” is only a record if somebody wrote it down.",
    /*
     * "admin", like the other content that changes what every visitor sees, and
     * for a sharper reason than most: a testimonial is a claim about a real
     * named person made on this business's behalf. Getting it wrong is not a
     * content bug, it is a thing you apologise to a customer for.
     */
    guard: "admin",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    searchFields: ["quote", "authorName", "organisation"],
    tagsFor: () => [tags.testimonials, tags.pages],
    listColumns: [
      { header: "Who", path: "authorName", primary: true },
      { header: "Organisation", path: "organisation" },
      { header: "About", path: "brand.name" },
      { header: "Consent", path: "consentOn", format: "date" },
      { header: "Status", path: "status", format: "badge" },
      { header: "Featured", path: "featured", format: "boolean" },
      { header: "Order", path: "displayOrder", format: "number" },
    ],
    fields: [
      {
        kind: "textarea",
        name: "quote",
        label: "What they said",
        required: true,
        rows: 5,
        maxLength: 1200,
        hint: "Their words, not a tidied version of them. Trim it here if it needs trimming, so the record and the page say the same thing.",
        group: "The quote",
      },
      {
        kind: "text",
        name: "authorName",
        label: "Name",
        required: true,
        maxLength: 120,
        hint: "A first name and an initial is fine if that is what they asked for. Leaving it blank is not — an unattributed testimonial on our own site tells a reader nothing.",
        group: "The quote",
      },
      {
        kind: "text",
        name: "authorRole",
        label: "Their role",
        maxLength: 120,
        placeholder: "IT Manager",
        group: "The quote",
      },
      {
        kind: "text",
        name: "organisation",
        label: "Organisation",
        maxLength: 160,
        hint: "Only if they agreed to it being named. Some customers will give a quote but not their employer.",
        group: "The quote",
      },
      {
        kind: "date",
        name: "consentOn",
        label: "Consent given on",
        hint: "Required before this can be published. The date they agreed we could use it.",
        group: "Consent",
      },
      {
        kind: "textarea",
        name: "consentNote",
        label: "How consent was given",
        rows: 3,
        maxLength: 600,
        hint: "Enough that somebody else could check it in a year — e.g. “Email from Priya, 14 August, confirming we can use her name and Vertex Logistics”.",
        group: "Consent",
      },
      {
        kind: "relation",
        name: "brandId",
        label: "About a brand",
        resource: "brand",
        hint: "Optional. Shows the quote on that brand's page as well.",
        group: "Where it appears",
      },
      {
        kind: "relation",
        name: "serviceId",
        label: "About a service",
        resource: "service",
        hint: "Optional. Shows the quote on that service's page as well.",
        group: "Where it appears",
      },
      {
        kind: "select",
        name: "status",
        label: "Status",
        required: true,
        options: [
          { value: "DRAFT", label: "Draft" },
          { value: "PUBLISHED", label: "Published" },
        ],
        hint: "Publishing without a consent date is refused.",
        group: PUBLICATION_GROUP,
      },
      {
        kind: "checkbox",
        name: "featured",
        label: "Feature it",
        hint: "Featured quotes come first wherever testimonials are shown.",
        group: PUBLICATION_GROUP,
      },
      {
        kind: "number",
        name: "displayOrder",
        label: "Display order",
        min: 0,
        max: 10_000,
        group: PUBLICATION_GROUP,
      },
    ],
  },

  jobs: {
    key: "jobs",
    model: "jobPosting",
    label: { singular: "Job", plural: "Jobs" },
    description:
      "Open roles, listed on the careers page. A role with a closing date comes down on its own — which is the point of setting one, because Google downranks a site that leaves filled roles advertised.",
    /*
     * "admin", not "staff". A job advertisement states what this business
     * offers to pay and commits it to a hiring process; that is a different
     * kind of decision from moving a deal along, and it belongs with the other
     * content that changes what every visitor sees.
     */
    guard: "admin",
    slugField: "slug",
    softDelete: true,
    orderBy: [{ displayOrder: "asc" }, { postedOn: "desc" }],
    searchFields: ["title", "slug", "team", "location"],
    tagsFor: () => [tags.jobs, tags.pages],
    listColumns: [
      { header: "Role", path: "title", primary: true },
      { header: "Team", path: "team" },
      { header: "Where", path: "location" },
      { header: "Type", path: "employmentType", format: "badge" },
      { header: "Posted", path: "postedOn", format: "date" },
      { header: "Closes", path: "closesOn", format: "date" },
      { header: "Closed", path: "closedAt", format: "date" },
    ],
    fields: [
      { kind: "text", name: "title", label: "Role title", required: true, maxLength: 120, hint: "As a candidate would search for it: “Inside Sales Executive”, not “ISE-2”.", group: "Identity" },
      { kind: "slug", name: "slug", label: "URL", from: "title", group: "Identity" },
      { kind: "text", name: "team", label: "Team", maxLength: 60, hint: "Sales, Technical, Operations. Optional.", group: "Identity" },
      { kind: "textarea", name: "summary", label: "Summary", required: true, rows: 2, maxLength: 300, hint: "One or two sentences. Shown on the careers list and used as the page description.", group: "Content" },
      { kind: "textarea", name: "description", label: "The role", required: true, rows: 14, maxLength: 20_000, markdown: true, hint: "Markdown. What the job is, what you are looking for, and what you offer — in whatever order suits the role.", group: "Content" },
      { kind: "select", name: "employmentType", label: "Employment type", required: true, options: [
        { value: "FULL_TIME", label: "Full time" },
        { value: "PART_TIME", label: "Part time" },
        { value: "CONTRACT", label: "Contract" },
        { value: "INTERNSHIP", label: "Internship" },
      ], group: "Where and how" },
      { kind: "select", name: "workArrangement", label: "Arrangement", required: true, options: [
        { value: "ON_SITE", label: "On site" },
        { value: "HYBRID", label: "Hybrid" },
        { value: "REMOTE", label: "Remote" },
      ], group: "Where and how" },
      { kind: "text", name: "location", label: "Location", maxLength: 120, hint: "The city or office. Leave blank only on a fully remote role.", group: "Where and how" },
      { kind: "number", name: "experienceMinYears", label: "Experience from (years)", min: 0, max: 60, hint: "0 means no experience required. Leave blank to say nothing.", group: "Where and how" },
      { kind: "number", name: "experienceMaxYears", label: "Experience to (years)", min: 0, max: 60, group: "Where and how" },
      /*
       * Pay is in whole rupees here and stored in paise, like every other
       * amount in this application. Both ends optional, and the page prints
       * nothing at all unless there is a complete statement to make — an
       * amount with no period is a different offer depending on how it is
       * read. See `payRange` in `lib/careers`.
       */
      { kind: "number", name: "salaryMinMinor", label: "Salary from (₹, minor units)", min: 0, hint: "In paise. Leave both blank not to advertise pay — most roles here do not.", group: "Pay" },
      { kind: "number", name: "salaryMaxMinor", label: "Salary to (₹, minor units)", min: 0, group: "Pay" },
      { kind: "select", name: "salaryPeriod", label: "Per", options: [
        { value: "year", label: "Year" },
        { value: "month", label: "Month" },
      ], group: "Pay" },
      { kind: "text", name: "applyEmail", label: "Applications to", required: true, maxLength: 160, hint: "The mailbox that will actually be read. A listing nobody can reply to is worse than no listing.", group: PUBLICATION_GROUP },
      { kind: "date", name: "postedOn", label: "Posted", required: true, hint: "A future date holds the role back until then.", group: PUBLICATION_GROUP },
      { kind: "date", name: "closesOn", label: "Closes", hint: "The role comes off the site after this date without anyone acting. Strongly recommended.", group: PUBLICATION_GROUP },
      { kind: "date", name: "closedAt", label: "Closed on", hint: "Set this when the role is filled or withdrawn. It stops being advertised immediately.", group: PUBLICATION_GROUP },
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
