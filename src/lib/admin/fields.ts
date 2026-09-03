import { z } from "zod";

/**
 * Field descriptors.
 *
 * A resource declares its editable shape once, as data, and the framework
 * derives three things from it: the rendered form controls, the zod schema that
 * validates a submission, and the Prisma payload written to the database.
 *
 * Keeping those three in one declaration is the point. Where they are written
 * separately they drift — a field gets added to the form but not the schema and
 * is silently discarded, or added to the schema but not the form and blocks
 * every save with an error nobody can see.
 */

export type SelectOption = { value: string; label: string };

type Common = {
  name: string;
  label: string;
  hint?: string;
  /** Grouping heading; consecutive fields sharing one render in a Fieldset. */
  group?: string;
};

export type FieldDescriptor =
  | (Common & { kind: "text"; required?: boolean; maxLength?: number; placeholder?: string })
  | (Common & { kind: "textarea"; required?: boolean; maxLength?: number; rows?: number; markdown?: boolean })
  | (Common & { kind: "slug"; from: string })
  | (Common & { kind: "number"; required?: boolean; min?: number; max?: number; step?: number })
  | (Common & {
      kind: "checkbox";
      /**
       * Whether a *new* record starts with the box ticked. Off unless a
       * resource says otherwise, and it has to say so here rather than have it
       * inferred: this used to be decided by whether the field happened to be
       * called "published", which meant the next resource with a column of
       * that name silently inherited a default nobody had chosen. For customer
       * logos that default pre-ticked the box that puts somebody else's
       * trademark on the internet.
       */
      defaultChecked?: boolean;
    })
  | (Common & { kind: "select"; required?: boolean; options: SelectOption[] })
  | (Common & { kind: "relation"; required?: boolean; resource: RelationSource })
  | (Common & { kind: "lines"; maxItems?: number })
  | (Common & { kind: "date"; required?: boolean })
  /**
   * Raw JSON, for a column with no dedicated form yet — the same fallback
   * the CMS block editor keeps behind an "Edit as JSON" disclosure on every
   * block, here as a first-class field kind rather than something bespoke.
   * Validated only as well-formed JSON; a resource whose column expects a
   * particular shape is trusted to say so in its own hint text.
   */
  | (Common & { kind: "json"; required?: boolean });

/** Which table a `relation` field draws its options from. */
export type RelationSource = "brand" | "category" | "service" | "product" | "user";

/**
 * Builds the zod schema for a set of descriptors.
 *
 * Every value arrives from `FormData` as a string, so each branch is
 * responsible for its own coercion as well as its validation.
 */
export function schemaFor(fields: FieldDescriptor[]): z.ZodType<Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    switch (field.kind) {
      case "text":
      case "slug": {
        const max = "maxLength" in field && field.maxLength ? field.maxLength : 300;
        let schema: z.ZodTypeAny = z.string().trim().max(max);
        if (field.kind === "text" && field.required) {
          schema = (schema as z.ZodString).min(1, `${field.label} is required.`);
        }
        shape[field.name] = schema.optional().default("");
        break;
      }

      case "textarea": {
        let schema: z.ZodTypeAny = z.string().trim().max(field.maxLength ?? 20_000);
        if (field.required) {
          schema = (schema as z.ZodString).min(1, `${field.label} is required.`);
        }
        shape[field.name] = schema.optional().default("");
        break;
      }

      case "number": {
        // An empty numeric input posts "", which must not become NaN.
        let schema = z.coerce.number().int();
        if (field.min !== undefined) schema = schema.min(field.min);
        if (field.max !== undefined) schema = schema.max(field.max);
        shape[field.name] = z.preprocess(
          (value) => (value === "" || value === null || value === undefined ? undefined : value),
          field.required ? schema : schema.optional(),
        );
        break;
      }

      case "checkbox":
        // An unchecked box submits nothing at all, so absence means false.
        shape[field.name] = z.preprocess((value) => value === "on" || value === true, z.boolean());
        break;

      case "select": {
        const values = field.options.map((option) => option.value);
        const schema = z.string().refine((value) => values.includes(value), {
          message: `Choose a valid ${field.label.toLowerCase()}.`,
        });
        shape[field.name] = field.required ? schema : schema.or(z.literal("")).optional();
        break;
      }

      case "relation": {
        // Validated as an opaque id here; existence is checked against the
        // database before the write, so a forged id cannot create a dangling row.
        const schema = z.string().trim().min(1).max(64);
        shape[field.name] = field.required ? schema : schema.or(z.literal("")).optional();
        break;
      }

      case "lines":
        shape[field.name] = z.string().max(20_000).optional().default("");
        break;

      case "date": {
        const date = z
          .string()
          .trim()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker.");
        /*
         * A required date is enforced here rather than left to the database.
         * A non-nullable column reached with null raises a Prisma error, which
         * surfaces as an unexplained failure instead of a message against the
         * field somebody left blank.
         */
        shape[field.name] = field.required ? date : date.or(z.literal("")).optional();
        break;
      }

      case "json": {
        const json = z
          .string()
          .trim()
          .max(50_000)
          .refine((value) => {
            try {
              JSON.parse(value);
              return true;
            } catch {
              return false;
            }
          }, "That is not valid JSON.");
        shape[field.name] = field.required ? json : json.or(z.literal("")).optional();
        break;
      }
    }
  }

  return z.object(shape);
}

/** Splits a newline-delimited textarea into a trimmed `String[]` column. */
export function toLines(value: string | undefined, maxItems = 60): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

/** Renders a `String[]` column back into textarea text. */
export function fromLines(value: readonly string[] | null | undefined): string {
  return (value ?? []).join("\n");
}

/**
 * Converts validated field values into a Prisma payload.
 *
 * Only declared fields are copied, so an attacker adding `role=ADMIN` or
 * `deletedAt=null` to the form body cannot reach the database: the value is
 * simply not in the descriptor list and is dropped.
 */
export function toPrismaData(
  fields: FieldDescriptor[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.name];

    switch (field.kind) {
      case "text":
      case "slug":
      case "textarea": {
        const text = typeof value === "string" ? value.trim() : "";
        // A blank optional field is stored as NULL rather than "", so
        // "unset" and "deliberately empty" do not become the same state.
        const required = "required" in field && field.required;
        data[field.name] = text === "" && !required ? null : text;
        break;
      }

      case "number":
        if (value !== undefined) data[field.name] = value;
        break;

      case "checkbox":
        data[field.name] = Boolean(value);
        break;

      case "select":
      case "relation": {
        const text = typeof value === "string" ? value.trim() : "";
        const required = "required" in field && field.required;
        data[field.name] = text === "" && !required ? null : text;
        break;
      }

      case "lines":
        data[field.name] = toLines(typeof value === "string" ? value : "", field.maxItems);
        break;

      case "date": {
        const text = typeof value === "string" ? value.trim() : "";
        data[field.name] = text === "" ? null : new Date(`${text}T00:00:00.000Z`);
        break;
      }

      case "json": {
        const text = typeof value === "string" ? value.trim() : "";
        // Already proven parseable by schemaFor's refine; a parse failure here
        // would mean the two disagreed, which is a bug in this file rather
        // than something to handle gracefully.
        data[field.name] = text === "" ? null : JSON.parse(text);
        break;
      }
    }
  }

  return data;
}
