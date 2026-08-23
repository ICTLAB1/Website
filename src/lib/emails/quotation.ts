import "server-only";
import { escapeHtml } from "@/lib/mail";
import { formatMoney } from "@/lib/money";
import type { SiteConfig } from "@/lib/site-config";

/**
 * The quotation a customer actually receives.
 *
 * This is the document the business is judged by. It arrives before anyone has
 * spoken to a salesperson, it is forwarded to a finance team, and it is often
 * printed and attached to a purchase order — so it has to read as a commercial
 * document rather than as a notification, and every figure on it has to
 * reconcile.
 *
 * Two rules shape what is on it.
 *
 * **Nothing is invented.** The terms are whatever an administrator has written
 * at /admin/settings and nothing otherwise; the letterhead shows only the
 * identifiers that are actually configured. Payment terms, delivery timelines
 * and a liability position are commitments this business makes to a customer,
 * and plausible-looking defaults mailed out under its name would be worse than
 * an omission. When no terms are set the email says where the published terms
 * are instead.
 *
 * **It renders in email clients, not browsers.** Tables and inline styles
 * throughout: Outlook ignores stylesheets and most of flexbox and grid. It is
 * duller HTML than the site's, deliberately.
 *
 * One detail that is easy to get wrong and impossible to defend afterwards: the
 * Amount column shows the *gross* line value, quantity times unit price, and
 * any discount appears beneath the item and again in the totals block. Showing
 * the net figure there instead — which is what `lineTotalMinor` holds — makes
 * the column add up to the taxable value while the row directly beneath it says
 * "Subtotal" and shows the gross. The two differ by exactly the discount, and a
 * reviewer checking the arithmetic finds a document that does not agree with
 * itself.
 */

export type QuotationLine = {
  productName: string;
  sku: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  gstRatePercent: number;
  lineTotalMinor: number;
};

export type QuotationEmailInput = {
  reference: string;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  validUntil: Date | null;
  sentAt: Date;
  notes: string | null;
  customer: { name: string; companyName: string | null; email: string; gstin: string | null };
  lines: QuotationLine[];
  acceptUrl: string;
  termsUrl: string;
  config: SiteConfig;
  /** Set at /admin/settings. Empty means no terms are printed. */
  terms: string | null;
  /**
   * The member of staff answerable for the quotation, when one is named on it.
   *
   * Signs the message. A quotation from a named person is answerable in a way
   * that one from an address is not — and the name is the quotation's own
   * `owner`, so the person who signs it is the person the screen says owns it.
   * Null when nobody has been named, and then the message signs off as the
   * business rather than inventing a sender.
   */
  sender: { name: string } | null;
  /** Standards currently held, e.g. "ISO 9001:2015". Empty when none are recorded. */
  certifications: string[];
  /** Filename of the attached PDF, when one is attached. */
  attachmentName: string | null;
};

const INK = "#3f3a33";
const MUTED = "#6b6259";
const RULE = "#e3ded6";
const DARK = "#201c18";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

/** The letterhead lines that are actually configured. Never a placeholder. */
function issuerLines(config: SiteConfig): string[] {
  const address = [
    config.address.line1,
    config.address.line2,
    [config.address.city, config.address.state].filter(Boolean).join(", "),
    config.address.postcode,
    config.address.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return [
    ...address,
    config.gstin ? `GSTIN ${config.gstin}` : null,
    config.cin ? `CIN ${config.cin}` : null,
    config.email.sales,
    config.phone.sales,
  ].filter((line): line is string => Boolean(line));
}

/** One term per line, blank lines dropped, leading bullets normalised away. */
function termLines(terms: string | null): string[] {
  if (!terms) return [];
  return terms
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
}

/**
 * The sign-off, assembled from what is actually configured.
 *
 * A signature is where invented facts get into correspondence: a job title
 * nobody holds, a mobile number that rings nowhere, a certification the company
 * does not have. Every line here comes from the settings an administrator has
 * entered or from the certificates recorded against the business, and a field
 * that is not set produces no line at all rather than a placeholder.
 *
 * Deliberately not included: a job title for the sender. The application knows
 * a person's role in *this system*, which is not their role in the business,
 * and printing "Admin" under somebody's name on a commercial document is worse
 * than printing nothing.
 */
function signature(input: QuotationEmailInput): {
  name: string | null;
  entity: string;
  offices: { label: string; lines: string[] }[];
  contact: string[];
  certifications: string | null;
  notice: string;
} {
  const { config } = input;

  const offices: { label: string; lines: string[] }[] = [];
  if (config.formattedAddress) {
    offices.push({
      label: config.secondaryEntity ? "India" : "Registered office",
      lines: [config.formattedAddress],
    });
  }
  if (config.secondaryEntity) {
    offices.push({
      label: config.secondaryEntity.name,
      lines: [
        config.secondaryEntity.address,
        ...(config.secondaryEntity.phone ? [config.secondaryEntity.phone] : []),
      ],
    });
  }

  return {
    name: input.sender?.name ?? null,
    entity: config.entityName,
    offices,
    contact: [
      config.phone.sales ? `T ${config.phone.sales}` : null,
      config.email.sales ? `E ${config.email.sales}` : null,
      `W ${config.url}`,
      config.gstin ? `GSTIN ${config.gstin}` : null,
      config.cin ? `CIN ${config.cin}` : null,
    ].filter((line): line is string => line !== null),
    certifications:
      input.certifications.length > 0
        ? `Certified to ${input.certifications.join(", ")}`
        : null,
    /*
     * A confidentiality note, not a legal disclaimer.
     *
     * It says what this message contains and who it is for, both of which are
     * true. It deliberately stops short of the boilerplate that claims a
     * recipient is bound by terms they never agreed to — that is unenforceable
     * and everybody who reads it knows.
     */
    notice:
      "This message and any attachment carry commercial terms intended for the addressee. If it has reached you in error, please tell us and delete it.",
  };
}

export function quotationSubject(input: QuotationEmailInput): string {
  return `Quotation ${input.reference} from ${input.config.tradingName}`;
}

export function quotationText(input: QuotationEmailInput): string {
  const { config, currency } = input;
  const money = (minor: number) => formatMoney(minor, currency, { showDecimals: true });

  const lines = input.lines.map(
    (line) =>
      `  ${line.productName}\n` +
      `    SKU ${line.sku} · ${line.quantity} × ${money(line.unitPriceMinor)}` +
      (line.discountMinor > 0 ? ` · less ${money(line.discountMinor)}` : "") +
      ` · GST ${line.gstRatePercent}%\n` +
      `    ${money(line.unitPriceMinor * line.quantity)}`,
  );

  const terms = termLines(input.terms);

  return [
    `${config.entityName}`,
    ...issuerLines(config),
    "",
    "─".repeat(56),
    `QUOTATION ${input.reference}`,
    `Date: ${formatDate(input.sentAt)}`,
    input.validUntil ? `Valid until: ${formatDate(input.validUntil)}` : null,
    "─".repeat(56),
    "",
    "To:",
    `  ${input.customer.companyName ?? input.customer.name}`,
    input.customer.companyName ? `  Attn: ${input.customer.name}` : null,
    input.customer.gstin ? `  GSTIN ${input.customer.gstin}` : null,
    "",
    "Items",
    ...lines,
    "",
    `Subtotal:      ${money(input.subtotalMinor)}`,
    input.discountMinor > 0 ? `Discount:      − ${money(input.discountMinor)}` : null,
    `Taxable value: ${money(input.subtotalMinor - input.discountMinor)}`,
    `GST:           ${money(input.taxMinor)}`,
    `TOTAL:         ${money(input.totalMinor)}`,
    "",
    input.notes ? `Notes\n  ${input.notes}` : null,
    input.notes ? "" : null,
    terms.length > 0 ? "Terms and conditions" : null,
    ...terms.map((term, index) => `  ${index + 1}. ${term}`),
    terms.length > 0 ? "" : null,
    `Full terms of business: ${input.termsUrl}`,
    "",
    `To accept this quotation: ${input.acceptUrl}`,
    "",
    input.attachmentName
      ? `A PDF of this quotation is attached as ${input.attachmentName}, for your records\nand for your purchase order.`
      : null,
    input.attachmentName ? "" : null,
    "This quotation is an offer to supply and is not a tax invoice. A GST invoice",
    "is issued once the order is confirmed.",
    "",
    ...(() => {
      const sign = signature(input);
      return [
        "─".repeat(56),
        sign.name ? sign.name : null,
        sign.entity,
        ...sign.offices.flatMap((office) => [`${office.label}: ${office.lines[0]}`, ...office.lines.slice(1)]),
        ...sign.contact,
        sign.certifications,
        "",
        sign.notice,
      ];
    })(),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

export function quotationHtml(input: QuotationEmailInput): string {
  const { config, currency } = input;
  const money = (minor: number) => escapeHtml(formatMoney(minor, currency, { showDecimals: true }));
  const cell = `padding:10px 8px;border-bottom:1px solid ${RULE};font-size:13px;color:${INK};vertical-align:top`;
  const head = `padding:8px;border-bottom:2px solid ${RULE};font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};text-align:left`;
  const totalRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:5px 8px;font-size:13px;color:${strong ? DARK : MUTED};${strong ? "font-weight:700" : ""}">${label}</td>
      <td style="padding:5px 8px;font-size:13px;text-align:right;color:${strong ? DARK : INK};${strong ? "font-weight:700;font-size:15px" : ""}">${value}</td>
    </tr>`;

  const terms = termLines(input.terms);

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f4f0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid ${RULE};border-radius:6px">

  <tr><td style="padding:28px 28px 20px;border-bottom:3px solid ${DARK}">
    <div style="font-size:19px;font-weight:700;color:${DARK}">${escapeHtml(config.entityName)}</div>
    ${issuerLines(config)
      .map((line) => `<div style="font-size:12px;color:${MUTED};margin-top:3px">${escapeHtml(line)}</div>`)
      .join("")}
  </td></tr>

  <tr><td style="padding:22px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:22px;font-weight:700;color:${DARK};letter-spacing:0.02em">QUOTATION</td>
      <td style="text-align:right;font-family:ui-monospace,Menlo,monospace;font-size:15px;color:${DARK}">${escapeHtml(input.reference)}</td>
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
      <td width="50%" style="vertical-align:top">
        <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED}">Prepared for</div>
        <div style="font-size:14px;font-weight:600;color:${DARK};margin-top:4px">${escapeHtml(input.customer.companyName ?? input.customer.name)}</div>
        ${input.customer.companyName ? `<div style="font-size:12px;color:${MUTED};margin-top:2px">Attn: ${escapeHtml(input.customer.name)}</div>` : ""}
        ${input.customer.gstin ? `<div style="font-size:12px;color:${MUTED};margin-top:2px">GSTIN ${escapeHtml(input.customer.gstin)}</div>` : ""}
      </td>
      <td width="50%" style="vertical-align:top;text-align:right">
        <div style="font-size:12px;color:${MUTED}">Date: <span style="color:${INK}">${escapeHtml(formatDate(input.sentAt))}</span></div>
        ${input.validUntil ? `<div style="font-size:12px;color:${MUTED};margin-top:3px">Valid until: <span style="color:${INK};font-weight:600">${escapeHtml(formatDate(input.validUntil))}</span></div>` : ""}
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:20px 28px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      <thead><tr>
        <th style="${head}">Item</th>
        <th style="${head};text-align:center">Qty</th>
        <th style="${head};text-align:right">Unit</th>
        <th style="${head};text-align:right">GST</th>
        <th style="${head};text-align:right">Amount</th>
      </tr></thead>
      <tbody>
        ${input.lines
          .map(
            (line) => `<tr>
          <td style="${cell}">
            <div style="font-weight:600;color:${DARK}">${escapeHtml(line.productName)}</div>
            <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;color:${MUTED};margin-top:2px">${escapeHtml(line.sku)}</div>
            ${line.discountMinor > 0 ? `<div style="font-size:11px;color:${MUTED};margin-top:2px">Less discount ${money(line.discountMinor)}</div>` : ""}
          </td>
          <td style="${cell};text-align:center">${line.quantity}</td>
          <td style="${cell};text-align:right">${money(line.unitPriceMinor)}</td>
          <td style="${cell};text-align:right">${line.gstRatePercent}%</td>
          <td style="${cell};text-align:right;font-weight:600">${money(line.unitPriceMinor * line.quantity)}</td>
        </tr>`,
          )
          .join("")}
      </tbody>
    </table>
  </td></tr>

  <tr><td style="padding:14px 28px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:280px;margin-left:auto">
      ${totalRow("Subtotal", money(input.subtotalMinor))}
      ${input.discountMinor > 0 ? totalRow("Discount", `&minus; ${money(input.discountMinor)}`) : ""}
      ${totalRow("Taxable value", money(input.subtotalMinor - input.discountMinor))}
      ${totalRow("GST", money(input.taxMinor))}
      <tr><td colspan="2" style="border-top:2px solid ${DARK};height:1px;font-size:0">&nbsp;</td></tr>
      ${totalRow("Total payable", money(input.totalMinor), true)}
    </table>
  </td></tr>

  ${
    input.notes
      ? `<tr><td style="padding:18px 28px 0">
    <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED}">Notes</div>
    <div style="font-size:13px;color:${INK};line-height:1.6;margin-top:5px;white-space:pre-line">${escapeHtml(input.notes)}</div>
  </td></tr>`
      : ""
  }

  <tr><td style="padding:22px 28px 0">
    <a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;background:${DARK};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:5px;font-size:14px;font-weight:600">Review and accept this quotation</a>
  </td></tr>

  ${
    terms.length > 0
      ? `<tr><td style="padding:24px 28px 0">
    <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:${MUTED};padding-bottom:8px;border-bottom:1px solid ${RULE}">Terms and conditions</div>
    <ol style="margin:10px 0 0;padding-left:18px;font-size:12px;color:${INK};line-height:1.7">
      ${terms.map((term) => `<li style="margin-bottom:4px">${escapeHtml(term)}</li>`).join("")}
    </ol>
  </td></tr>`
      : ""
  }

  <tr><td style="padding:20px 28px 0">
    <div style="font-size:12px;color:${MUTED};line-height:1.6;border-top:1px solid ${RULE};padding-top:14px">
      ${
        input.attachmentName
          ? `A PDF of this quotation is attached as <strong style="color:${INK}">${escapeHtml(input.attachmentName)}</strong>, for your records and for your purchase order.<br />`
          : ""
      }
      Our full terms of business apply and are published at
      <a href="${escapeHtml(input.termsUrl)}" style="color:${DARK}">${escapeHtml(input.termsUrl)}</a>.
      This quotation is an offer to supply and is not a tax invoice; a GST invoice is issued once the order is confirmed.
    </div>
  </td></tr>

  ${(() => {
    /*
     * The sign-off.
     *
     * A table rather than a block with margins, because Outlook collapses the
     * one and not the other, and a signature that stacks on top of the terms
     * above it is the most visible way an email can look unprofessional.
     */
    const sign = signature(input);
    return `<tr><td style="padding:22px 28px 26px">
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:2px solid ${DARK}">
      <tr><td style="padding-top:14px">
        ${sign.name ? `<div style="font-size:14px;font-weight:600;color:${DARK}">${escapeHtml(sign.name)}</div>` : ""}
        <div style="font-size:13px;font-weight:600;color:${INK};margin-top:${sign.name ? "2px" : "0"}">${escapeHtml(sign.entity)}</div>
        ${sign.offices
          .map(
            (office) => `<div style="font-size:12px;color:${MUTED};line-height:1.6;margin-top:8px">
          <span style="color:${INK};font-weight:600">${escapeHtml(office.label)}</span><br />${office.lines
            .map((part) => escapeHtml(part))
            .join("<br />")}
        </div>`,
          )
          .join("")}
        <div style="font-size:12px;color:${MUTED};line-height:1.7;margin-top:10px">
          ${sign.contact.map((part) => escapeHtml(part)).join("<br />")}
        </div>
        ${
          sign.certifications
            ? `<div style="font-size:11px;letter-spacing:0.04em;color:${MUTED};margin-top:10px">${escapeHtml(sign.certifications)}</div>`
            : ""
        }
        <div style="font-size:11px;color:${MUTED};line-height:1.6;margin-top:14px">${escapeHtml(sign.notice)}</div>
      </td></tr>
    </table>
  </td></tr>`;
  })()}

</table>
</td></tr></table>
</body></html>`;
}
