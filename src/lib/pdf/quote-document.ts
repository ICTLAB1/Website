import "server-only";

import { prisma } from "@/lib/db";
import { orgScope, type Scoped } from "@/lib/auth/scope";
import { getSiteConfig } from "@/lib/site-config";
import { renderQuotationPdf } from "@/lib/pdf/quotation";

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
      company: {
        select: {
          name: true,
          gstin: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postcode: true,
          country: true,
        },
      },
      enquiry: { select: { contactName: true, contactEmail: true, companyName: true } },
      user: { select: { name: true, email: true } },
      items: {
        orderBy: { productName: "asc" },
        select: {
          productName: true,
          sku: true,
          quantity: true,
          unitPriceMinor: true,
          discountMinor: true,
          gstRatePercent: true,
          lineTotalMinor: true,
        },
      },
    },
  });

  if (!quote) return null;

  const config = await getSiteConfig();

  const address = quote.company
    ? [
        quote.company.addressLine1,
        quote.company.addressLine2,
        [quote.company.city, quote.company.state].filter(Boolean).join(", "),
        quote.company.postcode,
        quote.company.country,
      ]
        .filter((part): part is string => Boolean(part && part.trim()))
        .join("\n")
    : null;

  const bytes = renderQuotationPdf({
    reference: quote.reference,
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
    customer: {
      // Whoever the quotation is actually addressed to, in the order it is
      // known: the account that holds it, then the enquiry it came from.
      name: quote.user?.name ?? quote.enquiry?.contactName ?? "Customer",
      companyName: quote.company?.name ?? quote.enquiry?.companyName ?? null,
      email: quote.user?.email ?? quote.enquiry?.contactEmail ?? "",
      gstin: quote.company?.gstin ?? null,
      address,
    },
    lines: quote.items,
    config,
    terms: config.quoteTerms,
  });

  return { filename: `${quote.reference}.pdf`, bytes };
}
