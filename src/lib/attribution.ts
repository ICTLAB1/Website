import { z } from "zod";

/**
 * Where an enquiry came from.
 *
 * Meta ad URLs carry `utm_*` tags and Meta appends `fbclid`. The first page a
 * visitor lands on has them; the enquiry form they fill in three pages later
 * does not. So the browser keeps them in `sessionStorage` (see
 * `attribution-client`) and every form submits them as hidden fields, and this
 * is the one place that decides what is accepted from there.
 *
 * ## Why it is a whitelist
 *
 * These values come from a URL anybody can write, and they end up in an email
 * to the sales team and a CRM record. So: seven known keys, each trimmed,
 * stripped of control characters and capped, and nothing else. A visitor who
 * submits `utm_source=<script>` gets that string as plain text in a plain-text
 * email, which is the worst it can do.
 */

export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "landing",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

// Control characters and the angle brackets that would only ever matter if this
// were rendered as HTML, which it never is — but there is no use for them here.
const unsafe = /[\u0000-\u001f\u007f<>]/g;

const value = z
  .string()
  .transform((raw) => raw.replace(unsafe, "").trim().slice(0, 150))
  .optional();

export const attributionSchema = z.object({
  utm_source: value,
  utm_medium: value,
  utm_campaign: value,
  utm_term: value,
  utm_content: value,
  fbclid: value,
  landing: value,
});

export type Attribution = z.infer<typeof attributionSchema>;

/** Reads the hidden fields out of a submitted form; null when none carry a value. */
export function attributionFromForm(formData: FormData): Attribution | undefined {
  const raw: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const field = formData.get(key);
    if (typeof field === "string" && field.trim() !== "") raw[key] = field;
  }
  return Object.keys(raw).length > 0 ? attributionSchema.parse(raw) : undefined;
}

/** Plain lines for an email or a record; empty when there is nothing to say. */
export function attributionLines(attribution: Attribution | undefined | null): string[] {
  if (!attribution) return [];
  const rows: Array<[string, string | undefined]> = [
    ["Campaign source:", attribution.utm_source],
    ["Campaign medium:", attribution.utm_medium],
    ["Campaign name:", attribution.utm_campaign],
    ["Campaign term:", attribution.utm_term],
    ["Campaign content:", attribution.utm_content],
    ["Meta click id:", attribution.fbclid],
    ["First page seen:", attribution.landing],
  ];
  return rows.filter((row): row is [string, string] => Boolean(row[1])).map(([k, v]) => `${k} ${v}`);
}
