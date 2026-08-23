import "server-only";

import { prisma } from "@/lib/db";
import { orgScope, type Scoped } from "@/lib/auth/scope";
import { getSiteConfig } from "@/lib/site-config";
import { getBankingDetails } from "@/lib/banking-config";
import { letterheadImage, loadPublicImage } from "@/lib/pdf/assets";
import { currentPartnerBadge, currentPartnerLabel } from "@/lib/brand-partner";
import { certificationLogo } from "@/lib/certification-logo";
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
     * The partner designations, and nothing else about brands.
     *
     * An earlier version fetched every brand so the quotation could print a
     * wall of logos. It read as a logo dump on a page that was two-thirds
     * empty: a quotation is a priced offer, and the brands relevant to it are
     * the ones on its own lines, which the table already names. The full
     * supplier list belongs on the website, where a reader has gone looking
     * for it.
     */
    /*
     * Every brand this business is recorded as a partner of, badge or no badge.
     *
     * Two rows come out of one query. A brand with an issued badge appears as a
     * designation, in the publisher's own artwork and wording. A brand with a
     * recorded designation but no badge appears as its plain mark under
     * "our technology partners" — which says this business supplies it without
     * putting words in the publisher's mouth. A brand with neither appears
     * nowhere: the catalogue is not a partner list.
     */
    prisma.brand.findMany({
      where: { deletedAt: null, partnerPublic: true, partnerLabel: { not: null } },
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
   * The partner marks, excluding anybody already shown as a designation.
   *
   * Printing Microsoft's badge in one area and its logo in the next says the
   * same thing twice and makes the row look padded. The designation is the
   * stronger statement, so the brand keeps that and drops out of this row.
   */
  const designated = new Set(accreditations.map((entry) => entry.name));
  const technologyPartners = brands
    .filter((brand) => currentPartnerLabel(brand) && !designated.has(brand.name))
    .map((brand) => {
      const image = brand.logoUrl ? loadPublicImage(brand.logoUrl) : null;
      return image ? { name: brand.name, image } : null;
    })
    .filter((entry): entry is { name: string; image: NonNullable<typeof entry>["image"] } => entry !== null);

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
    /*
     * Two different references, kept apart.
     *
     * `referenceNo` is our enquiry number and `customerReference` is theirs —
     * the purchase order or tender the quotation answers. They used to collapse
     * into one field, which meant a customer's own number displaced ours and a
     * reader could not tell which of the two they were looking at.
     */
    referenceNo: quote.enquiry?.reference ?? null,
    customerReference: quote.customerReference ?? null,
    /*
     * Not held anywhere yet: the quotation carries payment terms but has no
     * delivery-terms field, and inventing "As specified" would be filler on a
     * commercial document. The cell is simply absent until there is one.
     */
    deliveryTerms: null,
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
    /*
     * Each certification with its own wordmark, where one has been supplied.
     *
     * Resolved here rather than in the renderer, which never touches a
     * filesystem — the same arrangement as the letterhead and the partner
     * badges above. A standard with no artwork on file gets `null` and the
     * letterhead falls back to setting the standards in type.
     */
    /*
     * The certificates, each with its mark where one is on file. Resolved here
     * rather than in the renderer, which never touches a filesystem.
     */
    certifications: certifications.map((entry) => ({
      ...entry,
      image: loadPublicImage(certificationLogo(entry.standard)),
    })),
    technologyPartners,
    logo: letterheadImage(),
    accreditations,
    banking: getBankingDetails(),
    terms: config.quoteTerms,
  });

  /*
   * A filename somebody can find again.
   *
   * This file now arrives as an attachment as well as a download, so it lands
   * in a customer's inbox among a dozen others and in their downloads folder
   * among a hundred. "QTE-2026-AB12CD.pdf" says nothing about what it is;
   * "Quotation-TZ-QT-2026-0007.pdf" says both what it is and which one.
   *
   * The printed document number when there is one, because that is the number
   * the customer's purchase order will quote, and the internal reference when
   * there is not. Anything a filesystem or a mail client would object to is
   * replaced rather than dropped, so two documents cannot collapse to one name.
   */
  const label = (quote.documentNo ?? quote.reference).replace(/[^A-Za-z0-9._-]+/g, "-");
  return { filename: `Quotation-${label}.pdf`, bytes };
}
