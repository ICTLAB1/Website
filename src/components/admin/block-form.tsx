"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { addBlockListRow, saveBlockForm } from "@/app/admin/page-actions";
import { BLOCK_FORMS, readPath, type BlockField } from "@/lib/blocks/form-shapes";
import type { BlockType } from "@/lib/blocks/schemas";

/**
 * A typed editing form for one block.
 *
 * Rendered from the block's declared field shape rather than hand-built per
 * type, so the fields shown, the values read back and the payload written stay
 * in step. Only the eight block types that carry almost all of the site's
 * content have a shape; everything else falls back to the JSON editor.
 *
 * Repeatable lists use indexed field names (`items.0.title`) and are collected
 * server-side. Adding a row is a server action rather than client state — the
 * same choice the product variant screens make — so a half-filled form is
 * never lost to a re-render.
 */

const MARKDOWN_HINT =
  "Markdown: ## heading, ### subheading, - list, 1. numbered, > quote, **bold**. Blank line between blocks.";

/** Object lists are rendered separately, so they are excluded by the type. */
type ScalarBlockField = Exclude<BlockField, { kind: "objectList" }>;

function ScalarField({ field, value }: { field: ScalarBlockField; value: unknown }) {
  const text = value === null || value === undefined ? "" : String(value);

  switch (field.kind) {
    case "markdown":
      return (
        <Field
          label={field.label}
          name={field.path}
          required={field.required}
          hint={[field.hint, MARKDOWN_HINT].filter(Boolean).join(" ")}
        >
          <Textarea name={field.path} rows={10} defaultValue={text} required={field.required} />
        </Field>
      );

    case "textarea":
      return (
        <Field label={field.label} name={field.path} required={field.required} hint={field.hint}>
          <Textarea name={field.path} rows={3} defaultValue={text} required={field.required} />
        </Field>
      );

    case "select":
      return (
        <Field label={field.label} name={field.path} hint={field.hint}>
          <Select name={field.path} defaultValue={text}>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
      );

    case "number":
      return (
        <Field label={field.label} name={field.path} hint={field.hint}>
          <Input
            name={field.path}
            type="number"
            min={field.min}
            max={field.max}
            defaultValue={text}
          />
        </Field>
      );

    case "checkbox":
      return <Checkbox name={field.path} label={field.label} defaultChecked={value === true} />;

    case "stringList":
      return (
        <Field label={field.label} name={field.path} hint={field.hint ?? "One per line."}>
          <Textarea
            name={field.path}
            rows={6}
            defaultValue={Array.isArray(value) ? value.join("\n") : ""}
          />
        </Field>
      );

    default:
      return (
        <Field label={field.label} name={field.path} required={field.required} hint={field.hint}>
          <Input name={field.path} defaultValue={text} required={field.required} />
        </Field>
      );
  }
}

function ObjectList({
  field,
  rows,
  sectionId,
}: {
  field: Extract<BlockField, { kind: "objectList" }>;
  rows: Array<Record<string, unknown>>;
  sectionId: string;
}) {
  return (
    <fieldset className="min-w-0 rounded-[--radius-md] border border-line bg-surface-muted p-4">
      <legend className="px-1 text-[13px] font-semibold text-graphite-900">{field.label}</legend>
      {field.hint ? <p className="mb-3 text-[12px] text-ink-500">{field.hint}</p> : null}

      <div className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-[13px] text-ink-500">
            No {field.label.toLowerCase()} yet. Use “Add {field.itemLabel.toLowerCase()}” below.
          </p>
        ) : null}

        {rows.map((row, index) => (
          <div key={index} className="rounded-[--radius-md] border border-line bg-white p-4">
            <p className="mb-3 text-[12px] font-medium uppercase tracking-wide text-ink-500">
              {field.itemLabel} {index + 1}
            </p>
            <div className="grid gap-3">
              {field.fields.map((sub) => {
                const name = `${field.path}.${index}.${sub.key}`;
                const value = row[sub.key];
                const text = value === null || value === undefined ? "" : String(value);
                return (
                  <Field key={sub.key} label={sub.label} name={name} required={sub.required}>
                    {sub.kind === "textarea" ? (
                      <Textarea name={name} rows={3} defaultValue={text} />
                    ) : (
                      <Input name={name} defaultValue={text} />
                    )}
                  </Field>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] text-ink-500">
              Clear every field in this {field.itemLabel.toLowerCase()} and save to remove it.
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 max-w-xs">
        <AdminForm
          action={addBlockListRow}
          submitLabel={`Add ${field.itemLabel.toLowerCase()}`}
          pendingLabel="Adding…"
          variant="outline"
          hidden={{ sectionId, path: field.path }}
          compact
        />
      </div>
    </fieldset>
  );
}

export function BlockForm({
  sectionId,
  type,
  data,
  visible,
}: {
  sectionId: string;
  type: BlockType;
  data: unknown;
  visible: boolean;
}) {
  const shape = BLOCK_FORMS[type];
  if (!shape) return null;

  // Row-adding is its own form, so the object lists sit outside the save form
  // to avoid nesting one form inside another.
  const lists = shape.fields.filter((field) => field.kind === "objectList");
  const scalars = shape.fields.filter((field) => field.kind !== "objectList");

  return (
    <div className="space-y-5">
      <AdminForm
        action={saveBlockForm}
        submitLabel="Save block"
        pendingLabel="Saving…"
        hidden={{ sectionId }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {scalars.map((field) => {
            const wide =
              field.kind === "markdown" ||
              field.kind === "textarea" ||
              field.kind === "stringList" ||
              field.kind === "checkbox";
            return (
              <div key={field.path} className={wide ? "sm:col-span-2" : undefined}>
                <ScalarField field={field as ScalarBlockField} value={readPath(data, field.path)} />
              </div>
            );
          })}
        </div>
        <Checkbox name="visible" label="Visible on the page" defaultChecked={visible} />
      </AdminForm>

      {lists.map((field) =>
        field.kind === "objectList" ? (
          <ObjectList
            key={field.path}
            field={field}
            sectionId={sectionId}
            rows={(readPath(data, field.path) as Array<Record<string, unknown>>) ?? []}
          />
        ) : null,
      )}
    </div>
  );
}
