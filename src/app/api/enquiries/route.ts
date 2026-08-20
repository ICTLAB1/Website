import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { createEnquiry } from "@/lib/enquiry-service";
import { enquirySchema, fieldErrorsOf } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Public enquiry submission.
 *
 * Open to anonymous visitors by necessity, so it carries: an Origin check plus
 * a double-submit CSRF token, per-IP rate limiting, a honeypot field, strict
 * schema validation, and server-side re-resolution of every SKU.
 */
export const POST = withErrorHandling("enquiries.create", async (request: Request) => {
  const csrfFailure = await verifyCsrf(request);
  if (csrfFailure) {
    logger.warn("enquiry_csrf_rejected", { reason: csrfFailure });
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`enquiry:${ip}`, LIMITS.enquiry.limit, LIMITS.enquiry.windowSeconds);
  if (!limit.allowed) {
    return jsonError(
      "rate_limited",
      "You have submitted several enquiries recently. Please contact us directly if this is urgent.",
      { headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  // Honeypot: a real visitor never fills a hidden field. Accept silently so a
  // bot cannot distinguish rejection from success.
  if (parsed.data.website) {
    logger.warn("enquiry_honeypot_triggered", {});
    return jsonOk({ reference: "ENQ-0000-XXXXXX" });
  }

  // Associates the enquiry with the signed-in account when there is one, but
  // never trusts a client-supplied user or company id.
  const user = await getSessionUser();

  const result = await createEnquiry(parsed.data, {
    userId: user?.id ?? null,
    companyId: user?.companyId ?? null,
  });

  if (!result.ok) {
    return jsonError("conflict", result.message);
  }

  await recordAudit({
    actorId: user?.id ?? null,
    action: "enquiry.created",
    entityType: "Enquiry",
    entityId: result.reference,
    metadata: { itemCount: parsed.data.items.length },
    ip,
  });

  return jsonOk({ reference: result.reference });
});
