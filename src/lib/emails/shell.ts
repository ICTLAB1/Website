import "server-only";
import { escapeHtml } from "@/lib/mail";
import type { SiteConfig } from "@/lib/site-config";

/**
 * The shape every transactional email shares.
 *
 * A customer receives half a dozen of these across one purchase — ticket
 * raised, quotation sent, order confirmed, licences issued — and they should
 * look like they came from one company. Before this each was assembled by hand
 * at its call site, which is how three of them ended up not existing at all and
 * the rest drifted apart.
 *
 * Same email-client constraints as the quotation: tables and inline styles,
 * because Outlook ignores stylesheets and most of flexbox and grid.
 *
 * Every caller supplies both a text and an HTML form. The text is not a
 * formality — it is what a customer sees when their client refuses HTML, and
 * what appears in the log when mail is unconfigured.
 */

const INK = "#3f3a33";
const MUTED = "#6b6259";
const RULE = "#e3ded6";
const DARK = "#201c18";
const ACCENT = "#76550a";
const TINT = "#faf9f7";

export type EmailAction = { label: string; url: string };

/** One row of a "what you asked us for" table. */
export type EmailLine = { name: string; sku?: string | null; quantity?: number | null };

/** A label/value pair in the detail block. A null value is omitted entirely. */
export type EmailDetail = [label: string, value: string | null];

export type EmailContent = {
  /** The one-line headline. Not repeated in the body. */
  heading: string;
  /** Addressed to a person when we know their name. */
  greetingName?: string | null;
  /** One paragraph per entry. */
  paragraphs: string[];
  details?: EmailDetail[];
  /**
   * What the message is *about*, itemised.
   *
   * A reference and a paragraph tell somebody an email arrived. The list of
   * what they actually asked for is what lets them check it against what they
   * meant to ask for, before a quotation is built on it — which is the one
   * moment a mistake is still free to correct.
   */
  lines?: EmailLine[];
  /**
   * What happens next, in order.
   *
   * Numbered because "we will be in touch" is not information. Each step must
   * be something this business actually does; none of them may state a time
   * this business has not committed to.
   */
  steps?: string[];
  action?: EmailAction;
  /** Small print under the rule, after the details. */
  footnote?: string | null;
};

function presentDetails(details: EmailDetail[] | undefined): Array<[string, string]> {
  return (details ?? []).filter((pair): pair is [string, string] => Boolean(pair[1]));
}

export function renderEmailText(content: EmailContent, config: SiteConfig): string {
  const details = presentDetails(content.details);

  return [
    content.greetingName ? `Hello ${content.greetingName},` : null,
    content.greetingName ? "" : null,
    content.heading,
    "",
    ...content.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(content.lines && content.lines.length > 0
      ? [
          "What you asked us for:",
          ...content.lines.map((line) => {
            const parts = [line.sku ? `(${line.sku})` : null, line.quantity ? `quantity ${line.quantity}` : null]
              .filter(Boolean)
              .join(" — ");
            return `  - ${line.name}${parts ? ` ${parts}` : ""}`;
          }),
          "",
        ]
      : []),
    ...(content.steps && content.steps.length > 0
      ? ["What happens next:", ...content.steps.map((step, index) => `  ${index + 1}. ${step}`), ""]
      : []),
    ...(details.length > 0
      ? [...details.map(([label, value]) => `${label}: ${value}`), ""]
      : []),
    content.action ? `${content.action.label}: ${content.action.url}` : null,
    content.action ? "" : null,
    content.footnote,
    content.footnote ? "" : null,
    config.tradingName,
    config.email.support ?? config.email.sales,
  ]
    .filter((line): line is string => line !== null && line !== undefined)
    .join("\n");
}

export function renderEmailHtml(content: EmailContent, config: SiteConfig): string {
  const details = presentDetails(content.details);
  const contact = config.email.support ?? config.email.sales;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4f0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${RULE};border-radius:6px">

  <tr><td style="padding:22px 28px;border-bottom:3px solid ${DARK}">
    <div style="font-size:17px;font-weight:700;color:${DARK}">${escapeHtml(config.tradingName)}</div>
    ${config.tagline ? `<div style="font-size:12px;color:${MUTED};margin-top:2px">${escapeHtml(config.tagline)}</div>` : ""}
  </td></tr>

  <tr><td style="padding:26px 28px 0">
    <div style="font-size:19px;font-weight:700;color:${DARK};line-height:1.35">${escapeHtml(content.heading)}</div>
    ${
      content.greetingName
        ? `<p style="font-size:14px;color:${INK};line-height:1.65;margin:16px 0 0">Hello ${escapeHtml(content.greetingName)},</p>`
        : ""
    }
    ${content.paragraphs
      .map(
        (paragraph) =>
          `<p style="font-size:14px;color:${INK};line-height:1.65;margin:12px 0 0">${escapeHtml(paragraph)}</p>`,
      )
      .join("")}
  </td></tr>

  ${
    content.lines && content.lines.length > 0
      ? `<tr><td style="padding:22px 28px 0">
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700;padding-bottom:8px">What you asked us for</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${RULE};border-radius:5px;border-collapse:separate;overflow:hidden">
      ${content.lines
        .map(
          (line, index) => `<tr>
        <td style="padding:11px 14px;${index > 0 ? `border-top:1px solid ${RULE};` : ""}background:${index % 2 === 1 ? TINT : "#ffffff"}">
          <div style="font-size:13px;font-weight:600;color:${DARK};line-height:1.4">${escapeHtml(line.name)}</div>
          ${line.sku ? `<div style="font-size:11px;color:${MUTED};font-family:Consolas,Menlo,monospace;margin-top:3px">${escapeHtml(line.sku)}</div>` : ""}
        </td>
        <td align="right" style="padding:11px 14px;white-space:nowrap;${index > 0 ? `border-top:1px solid ${RULE};` : ""}background:${index % 2 === 1 ? TINT : "#ffffff"}">
          ${line.quantity ? `<span style="font-size:12px;color:${MUTED}">Qty</span> <span style="font-size:14px;font-weight:700;color:${DARK}">${line.quantity}</span>` : ""}
        </td>
      </tr>`,
        )
        .join("")}
    </table>
  </td></tr>`
      : ""
  }

  ${
    content.steps && content.steps.length > 0
      ? `<tr><td style="padding:22px 28px 0">
    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};font-weight:700;padding-bottom:10px">What happens next</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${content.steps
        .map(
          (step, index) => `<tr>
        <td valign="top" width="26" style="padding:0 0 10px">
          <div style="width:20px;height:20px;border-radius:10px;background:${ACCENT};color:#ffffff;font-size:11px;font-weight:700;text-align:center;line-height:20px">${index + 1}</div>
        </td>
        <td valign="top" style="padding:0 0 10px 8px;font-size:13px;color:${INK};line-height:1.55">${escapeHtml(step)}</td>
      </tr>`,
        )
        .join("")}
    </table>
  </td></tr>`
      : ""
  }

  ${
    details.length > 0
      ? `<tr><td style="padding:20px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;border:1px solid ${RULE};border-radius:5px">
      ${details
        .map(
          ([label, value], index) => `<tr>
        <td style="padding:9px 14px;font-size:12px;color:${MUTED};width:42%;${index > 0 ? `border-top:1px solid ${RULE}` : ""}">${escapeHtml(label)}</td>
        <td style="padding:9px 14px;font-size:13px;color:${DARK};font-weight:600;${index > 0 ? `border-top:1px solid ${RULE}` : ""}">${escapeHtml(value)}</td>
      </tr>`,
        )
        .join("")}
    </table>
  </td></tr>`
      : ""
  }

  ${
    content.action
      ? `<tr><td style="padding:22px 28px 0">
    <a href="${escapeHtml(content.action.url)}" style="display:inline-block;background:${DARK};color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:5px;font-size:14px;font-weight:600">${escapeHtml(content.action.label)}</a>
  </td></tr>`
      : ""
  }

  <tr><td style="padding:24px 28px 26px">
    ${
      content.footnote
        ? `<div style="font-size:12px;color:${MUTED};line-height:1.6;border-top:1px solid ${RULE};padding-top:14px">${escapeHtml(content.footnote)}</div>`
        : `<div style="border-top:1px solid ${RULE}"></div>`
    }
    <div style="font-size:12px;color:${MUTED};margin-top:14px">
      ${escapeHtml(config.tradingName)}${contact ? ` &middot; <a href="mailto:${escapeHtml(contact)}" style="color:${DARK}">${escapeHtml(contact)}</a>` : ""}
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;
}
