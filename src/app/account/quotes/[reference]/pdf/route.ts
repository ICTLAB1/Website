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
 * Never cached. This document has a customer's commercial terms on it; a shared
 * cache holding one is a shared cache holding somebody's prices.
 *
 * ## `?inline=1`
 *
 * Downloads by default. With `inline=1` the same bytes are served for display
 * in the browser's PDF viewer, which is what the preview on the admin quotation
 * screen embeds. It is deliberately the same route and the same builder — a
 * preview rendered by a second code path would eventually stop matching the
 * document that actually gets sent, and a preview that can disagree with the
 * thing it previews is worse than no preview.
 *
 * ## Security headers are the proxy's, not this route's
 *
 * This route used to set its own `Content-Security-Policy` of `default-src
 * 'none'; sandbox`. It never reached a client: `proxy.ts` runs for this path
 * and calls `headers.set` for both CSP and `X-Frame-Options` on every response,
 * so the site-wide policy always won. The header here was doing nothing, and a
 * header that looks like a control but is not one is worse than its absence —
 * somebody reads it and stops looking.
 *
 * The site-wide policy is the right one for this response anyway: `default-src
 * 'self'`, `object-src 'none'`, `frame-ancestors 'none'`. Notably it does *not*
 * carry `sandbox`, which matters for the inline case — `sandbox` stops the
 * browser's own PDF viewer from running and the preview opens blank.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;

  const user = await getSessionUser();
  if (!user) return new Response("Not found", { status: 404 });

  const document = await buildQuotationPdf(reference, { user, staff: isStaff(user) });
  if (!document) return new Response("Not found", { status: 404 });

  const inline = new URL(request.url).searchParams.get("inline") === "1";

  return new Response(new Uint8Array(document.bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(document.bytes.length),
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="${document.filename}"`,
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "cache-control": "private, no-store, max-age=0",
    },
  });
}
