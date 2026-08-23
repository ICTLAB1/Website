/** Joins class names, dropping falsy entries. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * A date in the format `<input type="date">` insists on.
 *
 * Read in UTC, because these are calendar dates — a warranty ends on the 14th
 * everywhere — and rendering them in the server's local zone would shift some
 * of them a day when the server sits west of UTC.
 */
export function dateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** The same, for `<input type="datetime-local">`, which wants minutes too. */
export function dateTimeInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

/**
 * Industry acronyms that must not be title-cased. Without this, a licence type
 * of CSP renders as "Csp", which reads as a typo on a commercial page.
 */
const ACRONYMS = new Set([
  "CSP", "OEM", "GST", "GSTIN", "SKU", "CAL", "IT", "AEC", "BIM", "CRM",
  "SLA", "API", "PDF", "HSN", "SAC", "RDS", "PO", "ERP", "SAM", "MSP",
]);

/** Turns SCREAMING_SNAKE enum values into readable labels. */
export function humanise(value: string): string {
  return value
    .split("_")
    .map((word) => {
      const upper = word.toUpperCase();
      if (ACRONYMS.has(upper)) return upper;
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Only allows same-site relative redirects. Prevents an attacker-supplied
 * `?next=https://evil.example` from turning sign-in into an open redirect.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/account"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}
