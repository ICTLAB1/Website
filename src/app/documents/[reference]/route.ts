import { getSessionUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/auth/guards";
import { readDocumentFor } from "@/lib/documents";

/**
 * Serves a customer document.
 *
 * The opposite of the uploads route in every respect that matters. That one
 * serves public artwork from a guessable path and caches it for a year; this
 * one serves purchase orders, quotations and invoices, so:
 *
 *  - it requires a session, and resolves the organisation *inside the query*
 *    rather than checking ownership after fetching. A reference belonging to
 *    another organisation matches nothing and gets the same 404 as one that
 *    was never issued — which is also all a stranger should be able to learn;
 *  - nothing is cached anywhere but the requesting browser, and only for the
 *    length of the session;
 *  - everything is sent as an attachment. A PDF or an XLSX rendered inline is a
 *    document interpreted by this origin, and none of these need to be;
 *  - the type is the one detected from the bytes at upload, never one supplied.
 */

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ reference: string }> }) {
  const { reference } = await context.params;

  const user = await getSessionUser();
  if (!user) return new Response("Not found", { status: 404 });

  const document = await readDocumentFor(reference, { user, staff: isStaff(user) });
  if (!document) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(document.bytes), {
    headers: {
      "content-type": document.mimeType,
      "content-length": String(document.bytes.length),
      // Quoted, and the stored name has already had quotes, separators and
      // control characters taken out of it — see `safeFilename`.
      "content-disposition": `attachment; filename="${document.filename}"`,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "referrer-policy": "no-referrer",
      "cache-control": "private, no-store, max-age=0",
    },
  });
}
