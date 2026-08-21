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

export type EmailAction = { label: string; url: string };

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
