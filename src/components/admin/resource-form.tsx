"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input, Select, Textarea } from "@/components/ui/form";
import { saveResource } from "@/app/admin/resource-actions";
import type { FieldDescriptor, SelectOption } from "@/lib/admin/fields";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Renders a resource's edit form from its field descriptors.
 *
 * A Client Component, matching the existing product and variant forms.
 *
 * It was briefly a Server Component - `AdminForm` passes validation errors down
 * through context, so that appeared to work. It failed once a form carried
 * enough relation options: `Field` calls `Children.only` on its single child,
 * and a large RSC payload does not always deliver that child as one resolved
 * element across the server/client boundary. Keeping the whole form on the
 * client removes the boundary from the middle of that contract. The options
 * themselves are still fetched on the server and passed in as plain data.
 *
 * Props carry only serialisable values. The full `ResourceConfig` cannot cross
 * the boundary because it holds `tagsFor`, a function.
 */

const MARKDOWN_HINT =
  "Markdown: ## heading, ### subheading, - list, 1. numbered, > quote, **bold**. Blank line between blocks.";

/**
 * Builds the control element for a field.
 *
 * Deliberately a plain function called as `controlFor(...)` rather than a
 * component rendered as `<Control />`. `Field` clones its single child to
 * inject the generated `id` and the `aria-describedby` / `aria-invalid`
 * attributes; if the child were a wrapper component, those props would land on
 * the wrapper and be dropped, leaving the real input with no label association
 * and no error announcement. Returning the element directly means `Field`
 * clones the actual input.
 */
function controlFor(
  field: FieldDescriptor,
  value: string | boolean | undefined,
  options: SelectOption[],
) {
  const text = typeof value === "string" ? value : "";

  switch (field.kind) {
    case "textarea":
      return (
        <Textarea
          name={field.name}
          rows={field.rows ?? 4}
          maxLength={field.maxLength}
          defaultValue={text}
          required={field.required}
        />
      );

    case "number":
      return (
        <Input
          name={field.name}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          defaultValue={text}
          required={field.required}
        />
      );

    case "date":
      return <Input name={field.name} type="date" defaultValue={text} />;

    case "select":
    case "relation":
      return (
        <Select name={field.name} defaultValue={text} required={"required" in field && field.required}>
          <option value="">
            {"required" in field && field.required ? `Choose a ${field.label.toLowerCase()}` : "None"}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );

    case "lines":
      return <Textarea name={field.name} rows={5} defaultValue={text} />;

    case "slug":
      return (
        <Input
          name={field.name}
          defaultValue={text}
          placeholder="generated-from-the-name"
          maxLength={200}
        />
      );

    default:
      return (
        <Input
          name={field.name}
          defaultValue={text}
          maxLength={"maxLength" in field ? field.maxLength : undefined}
          placeholder={"placeholder" in field ? field.placeholder : undefined}
          required={"required" in field && field.required}
        />
      );
  }
}

export function ResourceForm({
  resourceKey,
  singularLabel,
  fields,
  recordId,
  values,
  optionsByField,
  action,
}: {
  resourceKey: string;
  singularLabel: string;
  fields: FieldDescriptor[];
  recordId?: string;
  values: Record<string, string | boolean>;
  optionsByField: Record<string, SelectOption[]>;
  /**
   * Overrides the generic action. Server actions are passed as props rather
   * than imported here so that a resource with its own rules - pages, whose
   * slug may contain slashes - can reuse this form without the generic action
   * having to know about it.
   */
  action?: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}) {
  // Preserve declaration order while collecting fields into their groups.
  const groups: Array<{ name: string; fields: FieldDescriptor[] }> = [];
  for (const field of fields) {
    const name = field.group ?? "Details";
    const existing = groups.find((group) => group.name === name);
    if (existing) existing.fields.push(field);
    else groups.push({ name, fields: [field] });
  }

  return (
    <AdminForm
      action={action ?? saveResource}
      submitLabel={
        recordId ? `Save ${singularLabel.toLowerCase()}` : `Create ${singularLabel.toLowerCase()}`
      }
      pendingLabel="Saving…"
      hidden={{ __resource: resourceKey, ...(recordId ? { __id: recordId } : {}) }}
    >
      {groups.map((group) => (
        <Fieldset key={group.name} legend={group.name}>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map((field) => {
              // Long-form and list inputs need the full width to be usable.
              const wide =
                field.kind === "textarea" || field.kind === "lines" || field.kind === "checkbox";

              return (
                <div key={field.name} className={wide ? "sm:col-span-2" : undefined}>
                  {field.kind === "checkbox" ? (
                    <Checkbox
                      name={field.name}
                      label={field.label}
                      defaultChecked={values[field.name] === true}
                    />
                  ) : (
                    <Field
                      label={field.label}
                      name={field.name}
                      required={"required" in field && field.required}
                      hint={
                        field.kind === "textarea" && field.markdown
                          ? [field.hint, MARKDOWN_HINT].filter(Boolean).join(" ")
                          : field.hint
                      }
                    >
                      {controlFor(field, values[field.name], optionsByField[field.name] ?? [])}
                    </Field>
                  )}
                </div>
              );
            })}
          </div>
        </Fieldset>
      ))}
    </AdminForm>
  );
}
