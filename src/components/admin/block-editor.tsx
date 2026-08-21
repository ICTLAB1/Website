"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/form";
import { addBlock, deleteBlock, moveBlock, saveBlock } from "@/app/admin/page-actions";
import { BLOCK_LABELS, BLOCK_TYPES, type BlockType } from "@/lib/blocks/schemas";
import { hasForm } from "@/lib/blocks/form-shapes";
import { BlockForm } from "@/components/admin/block-form";

/**
 * The page block editor.
 *
 * Deliberately bespoke rather than descriptor-driven: adding, removing and
 * reordering blocks is not something a flat field list can express.
 *
 * The eight block types that carry almost all of the site's content get a typed
 * form. The rest fall back to editing the payload as JSON, and every block keeps
 * the JSON editor behind a disclosure — so nothing is ever less editable than it
 * was, and an administrator who needs a field the form does not expose still
 * has a way to reach it.
 *
 * Both routes validate against the same schema, so a form cannot write something
 * the JSON editor would reject, or the reverse.
 *
 * Every block is its own form, so an error in one never discards edits in
 * another — the same pattern the product variant screens already use.
 */

type Block = {
  id: string;
  type: string;
  displayOrder: number;
  visible: boolean;
  data: unknown;
};

/** Plain-language summary of what each block type accepts. */
const SHAPES: Record<BlockType, string> = {
  HERO: `{ "eyebrow"?, "headline", "subheadline"?, "primaryCta"?: { "label", "href" }, "secondaryCta"?, "showSearch"?: false, "searchTerms"?: ["…"], "stats"?: [{ "label", "source", "value"? }], "tone"?: "dark" | "light" }`,
  RICH_TEXT: `{ "heading"?, "markdown" }  — Markdown subset: ## / ### / - / 1. / > / **bold**`,
  BULLETS: `{ "heading"?, "items": ["…"] }`,
  CARDS: `{ "eyebrow"?, "heading"?, "description"?, "numbered"?: false, "numberLabel"?, "columns"?: 2 | 3 | 4, "items": [{ "title", "body" }] }`,
  ICON_POINTS: `{ "eyebrow"?, "heading"?, "items": [{ "label", "detail"? }] }`,
  LINK_LIST: `{ "eyebrow"?, "heading"?, "description"?, "layout"?: "cards" | "chips" | "inline", "itemAction"?, "items": [{ "label", "href", "description"? }] }`,
  KEY_VALUE_LIST: `{ "eyebrow"?, "heading"?, "items": [{ "key", "value" }] }`,
  CHIP_LIST: `{ "eyebrow"?, "heading"?, "description"?, "items": ["…"], "footnote"? }`,
  SPLIT_PANEL: `{ "eyebrow"?, "heading", "description"?, "bulletsIntro"?, "bullets"?: ["…"], "tiles"?: ["…"] }`,
  STAT_BAR: `{ "eyebrow"?, "heading"?, "items": [{ "label", "source": "literal" | "productCount" | "skuCount" | "brandCount" | "categoryCount", "value"? }] }`,
  PRODUCT_GRID: `{ "eyebrow"?, "heading"?, "source": "manual" | "featured" | "popular" | "brand" | "category", "slugs"?: ["…"], "ref"?, "limit"?, "action"?: { "label", "href" } }`,
  COLLECTION_GRID: `{ "eyebrow"?, "heading"?, "description"?, "kind": "brands" | "categories" | "services" | "posts" | "postCategories", "limit"?, "layout"?: "grid" | "strip", "action"?: { "label", "href" } }`,
  FAQ: `{ "heading"?, "source": "page" | "brand" | "topic" | "manual", "ref"?, "items"?: [{ "question", "answer" }] }`,
  CTA_BANNER: `{ "heading", "body"?, "primaryCta"?, "secondaryCta"?, "showContactEmail"?: false, "tone"?: "dark" | "light" | "accent" }`,
  PLANS: `{ "eyebrow"?, "heading"?, "description"?, "items": [{ "name", "summary", "points"?: ["…"], "productSlug"? }] }`,
  COMPANY_INFO: `{ "eyebrow"?, "heading"?, "description"?, "footnote"? }  — the registration and contact values themselves come from server configuration, not from here`,
};

export function BlockEditor({ pageId, blocks }: { pageId: string; blocks: Block[] }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.05rem]">Content blocks</h2>
          <p className="mt-1 text-[13px] text-ink-600">
            {blocks.length} {blocks.length === 1 ? "block" : "blocks"}, rendered top to bottom.
            Backgrounds alternate automatically.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <AdminForm
            action={addBlock}
            submitLabel="Add block"
            pendingLabel="Adding…"
            hidden={{ pageId }}
            compact
          >
            <Field label="Block type" name="type" required>
              <Select name="type" defaultValue="RICH_TEXT">
                {BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {BLOCK_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
          </AdminForm>
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="rounded-[--radius-lg] border border-dashed border-line-strong px-5 py-8 text-center text-[14px] text-ink-500">
          This page has no blocks yet. Add one above to start building it.
        </p>
      ) : (
        <ol className="space-y-4">
          {blocks.map((block, index) => {
            const type = block.type as BlockType;
            return (
              <li key={block.id} className="rounded-[--radius-lg] border border-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-ink-400">{index + 1}</span>
                    <span className="text-[14px] font-semibold text-graphite-900">
                      {BLOCK_LABELS[type] ?? block.type}
                    </span>
                    {!block.visible ? (
                      <span className="rounded-[--radius-sm] bg-surface-sunken px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink-500">
                        Hidden
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <AdminForm
                      action={moveBlock}
                      submitLabel="↑"
                      pendingLabel="…"
                      variant="outline"
                      hidden={{ sectionId: block.id, direction: "up" }}
                      compact
                    />
                    <AdminForm
                      action={moveBlock}
                      submitLabel="↓"
                      pendingLabel="…"
                      variant="outline"
                      hidden={{ sectionId: block.id, direction: "down" }}
                      compact
                    />
                    <AdminForm
                      action={deleteBlock}
                      submitLabel="Remove"
                      pendingLabel="Removing…"
                      variant="danger"
                      hidden={{ sectionId: block.id }}
                      compact
                    />
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  {hasForm(block.type) ? (
                    <BlockForm
                      sectionId={block.id}
                      type={type}
                      data={block.data}
                      visible={block.visible}
                    />
                  ) : null}

                  <details className={hasForm(block.type) ? "border-t border-line pt-4" : undefined}>
                    <summary className="cursor-pointer text-[13px] font-medium text-ink-600">
                      {hasForm(block.type) ? "Edit as JSON" : "Edit content"}
                    </summary>
                    <div className="mt-4">
                      <AdminForm
                        action={saveBlock}
                        submitLabel="Save block"
                        pendingLabel="Saving…"
                        hidden={{ sectionId: block.id }}
                      >
                        <Field
                          label="Content"
                          name="data"
                          required
                          hint={SHAPES[type] ? `Expected shape — ${SHAPES[type]}` : undefined}
                        >
                          <Textarea
                            name="data"
                            rows={Math.min(24, Math.max(6, JSON.stringify(block.data, null, 2).split("\n").length))}
                            defaultValue={JSON.stringify(block.data, null, 2)}
                            spellCheck={false}
                            className="font-mono text-[12px]"
                          />
                        </Field>
                        <Checkbox
                          name="visible"
                          label="Visible on the page"
                          defaultChecked={block.visible}
                        />
                      </AdminForm>
                    </div>
                  </details>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
