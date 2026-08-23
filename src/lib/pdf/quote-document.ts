import "server-only";

import { prisma } from "@/lib/db";
import { orgScope, type Scoped } from "@/lib/auth/scope";
import { getSiteConfig } from "@/lib/site-config";
import { getBankingDetails } from "@/lib/banking-config";
import { letterheadImage, loadPublicImage } from "@/lib/pdf/assets";
import { currentPartnerBadge, currentPartnerLabel } from "@/lib/brand-partner";
import { renderQuotationPdf, type QuotationParty } from "@/lib/pdf/quotation";

/**
 * The quotation PDF, built from the row.
 *
 * Generated on request rather than stored, and that is safe here for one
 * specific reason: a quotation row is never edited after it is sent. A revision
 * is a new row — see `lib/quote-revision` — so rendering version 1 today
 * produces exactly the document version 1 always produced. If quotations were
 * editable in place this would have to be a stored artefact instead.
 *
 * Scoped in the query like every other customer read. A draft is excluded for
 * the customer: an unsent draft is internal working material, and a PDF of one
 * is the same thing in a more forwardable form.
 */

type AddressRow = {
  attention: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
  gstin: string | null;
};

/** An address in postal order, skipping the parts that are not held. */
function addressLines(address: AddressRow | null, fallback: string[] = []): string[] {
  if (!address) return fallback;

  return [
    address.attention,
    address.line1,
    address.line2,
    [[address.city, address.state].filter(Boolean).join(", "), address.postcode]
      .filter(Boolean)
      .join(" "),
    address.country,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

/**
 * Whether two addresses are actually different.
 *
 * Compared on the text that gets printed rather than on the row ids, because a
 * customer who has saved the same address twice under two labels has one
 * address, and a shipping panel repeating the billing one is noise that hides
 * the case it exists to show.
 */
function differs(a: string[], b: string[]): boolean {
  const flatten = (lines: string[]) => lines.join("|").toLowerCase().replace(/\s+/g, " ").trim();
  return flatten(a) !== flatten(b);
}

export async function buildQuotationPdf(
  reference: string,
  actor: { user: Scoped; staff: boolean },
): Promise<{ filename: string; bytes: Buffer } | null> {
  const quote = await prisma.quote.findFirst({
    where: actor.staff
      ? { reference }
      : { reference, status: { not: "DRAFT" }, ...orgScope(actor.user) },
    select: {
      reference: true,
      version: true,
      status: true,
      currency: true,
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      validUntil: true,
      sentAt: true,
      createdAt: true,
      notes: true,
      paymentTerms: true,
      documentNo: true,
      customerReference: true,
      owner: { select: { name: true } },
      company: {
        select: {
          name: true,
          gstin: true,
          pan: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postcode: true,
          country: true,
          accountManager: { select: { name: true } },
          addresses: {
            where: { deletedAt: null },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: {
              kind: true,
              isDefault: true,
              attention: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              postcode: true,
              country: true,
              gstin: true,
            },
          },
          contacts: {
            orderBy: { createdAt: "asc" },
            select: { kind: true, name: true, email: true, phone: true },
          },
        },
      },
      enquiry: {
        select: {
          reference: true,
          contactName: true,
          contactEmail: true,
          contactPhone: true,
          companyName: true,
        },
      },
      user: { select: { name: true, email: true, phone: true } },
      items: {
        orderBy: { productName: "asc" },
        select: {
          productName: true,
          description: true,
          brandName: true,
          sku: true,
          hsnCode: true,
          quantity: true,
          unitLabel: true,
          unitPriceMinor: true,
          discountMinor: true,
          gstRatePercent: true,
          lineTotalMinor: true,
        },
      },
    },
  });

  if (!quote) return null;

  const [config, certifications, brands] = await Promise.all([
    getSiteConfig(),
    /*
     * Only certificates that are current.
     *
     * An expired certificate on a live quotation is a claim the business can no
     * longer support, and it goes to exactly the sort of reader — a customer's
     * compliance officer — who will check it.
     */
    prisma.certification.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { displayOrder: "asc" },
      select: { standard: true, title: true, reference: true },
    }),
    /*
     * Every brand this business deals in, and the partner designations among
     * them.
     *
     * Not filtered by product count, deliberately. On a quotation this is a
     * statement of what can be sourced, not a listing of what is on the shelf —
     * a customer asking for Fortinet wants to know we can supply it, and the
     * absence of a public catalogue page for it says nothing about that. The
     * caption under the strip is what keeps the claim accurate: these are
     * brands we supply, and the accreditations above are stated separately.
     */
    prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        logoUrl: true,
        partnerLabel: true,
        partnerConfirmedAt: true,
        partnerPublic: true,
        partnerBadgeUrl: true,
      },
    }),
  ]);

  /*
   * Accreditations first, and only where the designation may currently be
   * stated. `currentPartnerBadge` applies the same lapse rule as the website,
   * so a designation that has come down there cannot still be printing here.
   */
  const accreditations = brands
    .map((brand) => {
      const label = currentPartnerLabel(brand);
      const badge = currentPartnerBadge(brand);
      const image = badge ? loadPublicImage(badge) : null;
      return label && image ? { name: brand.name, label, image } : null;
    })
    .filter((entry): entry is { name: string; label: string; image: NonNullable<typeof entry>["image"] } =>
      entry !== null,
    );

  /*
   * Then the catalogue. Most brand artwork on this site is SVG, which a PDF
   * cannot hold, so the ones that will print are shown and the rest are named
   * — a complete list either way, which is the point.
   */
  const brandLogos: Array<{ name: string; image: NonNullable<ReturnType<typeof loadPublicImage>> }> = [];
  const otherBrands: string[] = [];

  for (const brand of brands) {
    const image = loadPublicImage(brand.logoUrl);
    if (image) brandLogos.push({ name: brand.name, image });
    else otherBrands.push(brand.name);
  }

  const company = quote.company;

  const companyAddress = company
    ? [
        company.addressLine1,
        company.addressLine2,
        [[company.city, company.state].filter(Boolean).join(", "), company.postcode]
          .filter(Boolean)
          .join(" "),
        company.country,
      ].filter((line): line is string => Boolean(line && line.trim()))
    : [];

  const stored = company?.addresses ?? [];
  const billingRow =
    stored.find((row) => row.kind === "BILLING" && row.isDefault) ??
    stored.find((row) => row.kind === "BILLING") ??
    stored.find((row) => row.kind === "BOTH") ??
    null;
  const deliveryRow =
    stored.find((row) => row.kind === "DELIVERY" && row.isDefault) ??
    stored.find((row) => row.kind === "DELIVERY") ??
    null;

  const procurement = company?.contacts.find((contact) => contact.kind === "PROCUREMENT") ?? null;
  const finance = company?.contacts.find((contact) => contact.kind === "FINANCE") ?? null;

  const name = company?.name ?? quote.enquiry?.companyName ?? quote.user?.name ?? "Customer";
  const contactName = quote.user?.name ?? quote.enquiry?.contactName ?? procurement?.name ?? null;
  const contactEmail = quote.user?.email ?? quote.enquiry?.contactEmail ?? procurement?.email ?? null;
  const contactPhone =
    quote.user?.phone ?? quote.enquiry?.contactPhone ?? procurement?.phone ?? company?.phone ?? null;

  const quotedTo: QuotationParty = {
    name,
    addressLines: companyAddress,
    gstin: company?.gstin ?? null,
    pan: company?.pan ?? null,
    contactName,
    phone: contactPhone,
    email: contactEmail,
    state: company?.state ?? null,
  };

  const billingLines = addressLines(billingRow, companyAddress);
  const billing: QuotationParty = {
    ...quotedTo,
    addressLines: billingLines,
    // A place of business with its own registration is billed under that one.
    gstin: billingRow?.gstin ?? company?.gstin ?? null,
    state: billingRow?.state ?? company?.state ?? null,
    contactName: finance?.name ?? contactName,
    email: finance?.email ?? contactEmail,
    phone: finance?.phone ?? contactPhone,
  };

  const deliveryLines = addressLines(deliveryRow, []);
  const shipping: QuotationParty | null =
    deliveryLines.length > 0 && differs(deliveryLines, billingLines)
      ? {
          ...quotedTo,
          addressLines: deliveryLines,
          gstin: deliveryRow?.gstin ?? company?.gstin ?? null,
          state: deliveryRow?.state ?? company?.state ?? null,
        }
      : null;

  const bytes = renderQuotationPdf({
    reference: quote.reference,
    documentNo: quote.documentNo,
    /*
     * The customer's own number where they gave us one, ours otherwise.
     *
     * Their RFQ or tender number is what their procurement system files this
     * against, so echoing it back is what makes the quotation findable at their
     * end. Our enquiry reference is the fallback, not the preference.
     */
    referenceNo: quote.customerReference ?? quote.enquiry?.reference ?? null,
    version: quote.version,
    status: quote.status,
    currency: quote.currency,
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
    validUntil: quote.validUntil,
    issuedAt: quote.sentAt ?? quote.createdAt,
    notes: quote.notes,
    paymentTerms: quote.paymentTerms,
    /*
     * Whoever owns the quotation, then whoever owns the relationship. Both are
     * people who have actually been assigned; nobody is named by default,
     * because a customer ringing the name on a quotation expects that person to
     * know about it.
     */
    salesExecutive: quote.owner?.name ?? company?.accountManager?.name ?? null,
    quotedTo,
    billing,
    shipping,
    lines: quote.items,
    config,
    certifications,
    logo: letterheadImage(),
    accreditations,
    brandLogos,
    otherBrands,
    banking: getBankingDetails(),
    terms: config.quoteTerms,
  });

  return { filename: `${quote.reference}.pdf`, bytes };
}
