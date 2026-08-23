import { getSessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/guards";
import { buildQuotationPdf } from "@/lib/pdf/quote-document";

/**
 * The quotation as a PDF.
 *
 * Same access rule as the quotation page itself, resolved in the query: another
 * organisation's reference matches nothing and gets the same 404 as one that
 * was never issued. Staff reach the same document through the same builder, so
 * there is no second implementation to drift.
 *
 * Sent as an attachment and never cached. This document has a customer's
 * commercial terms on it; a shared cache holding one is a shared cache holding
 * somebody's prices.
 */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;

  const user = await getSessionUser();
  if (!user) return new Response("Not found", { status: 404 });

  const document = await buildQuotationPdf(reference, { user, staff: isStaff(user) });
  if (!document) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(document.bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(document.bytes.length),
      "content-disposition": `attachment; filename="${document.filename}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "referrer-policy": "no-referrer",
      "cache-control": "private, no-store, max-age=0",
    },
  });
}
