import type { FieldDescriptor } from "@/lib/admin/fields";

/**
 * Metadata fields for a CMS page.
 *
 * Pages are deliberately not in the generic resource registry: their editing
 * screen needs a block editor with ordering, which the descriptor-driven form
 * cannot express. The metadata half still reuses the same descriptors and the
 * same `ResourceForm`, so only the part that genuinely differs is bespoke.
 */
export const PAGE_FIELDS: FieldDescriptor[] = [
  {
    kind: "text",
    name: "title",
    label: "Title",
    required: true,
    maxLength: 200,
    hint: "Used as the browser title and in search results.",
    group: "Identity",
  },
  {
    kind: "slug",
    name: "slug",
    label: "URL path",
    from: "title",
    hint: "Without a leading slash. Use / for nesting, e.g. microsoft-365/business-standard",
    group: "Identity",
  },
  {
    kind: "textarea",
    name: "description",
    label: "Meta description",
    required: true,
    rows: 3,
    maxLength: 400,
    hint: "Shown by search engines beneath the title.",
    group: "Identity",
  },
  {
    kind: "lines",
    name: "keywords",
    label: "Keywords",
    hint: "One per line.",
    maxItems: 20,
    group: "Identity",
  },
  {
    kind: "relation",
    name: "brandId",
    label: "Brand",
    resource: "brand",
    hint: "Lets FAQ blocks on this page pull that brand's questions automatically.",
    group: "Connections",
  },
  {
    kind: "text",
    name: "faqTopic",
    label: "FAQ topic",
    maxLength: 80,
    hint: "For pages with no brand of their own, e.g. microsoft-licensing.",
    group: "Connections",
  },
  {
    kind: "select",
    name: "status",
    label: "Status",
    required: true,
    options: [
      { value: "DRAFT", label: "Draft — not visible to the public" },
      { value: "PUBLISHED", label: "Published" },
    ],
    group: "Publication",
  },
];
