import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { contactSchema, fieldErrorsOf } from "@/lib/validation";
import { publicReference } from "@/lib/auth/tokens";
import { escapeHtml, salesInbox, sendMail } from "@/lib/mail";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Public contact form.
 *
 * Stored as a support ticket so nothing is lost when email delivery is not
 * configured, and notified by email when it is.
 */
export const POST = withErrorHandling("contact.create", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`contact:${ip}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "You have sent several messages recently. Please try again later.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  // Honeypot — accepted silently so a bot cannot tell it was rejected.
  if (parsed.data.website) {
    logger.warn("contact_honeypot_triggered", {});
    return jsonOk({ reference: "TKT-0000-XXXXXX" });
  }

  const input = parsed.data;
  const user = await getSessionUser();
  const reference = publicReference("TKT");

  await prisma.supportTicket.create({
    data: {
      reference,
      userId: user?.id ?? null,
      subject: `${input.topic}: message from ${input.name}`,
      category: input.topic,
      message: [
        `Name: ${input.name}`,
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : null,
        input.companyName ? `Company: ${input.companyName}` : null,
        "",
        input.message,
      ]
        .filter((line) => line !== null)
        .join("\n"),
      priority: input.topic === "ENTERPRISE" ? "HIGH" : "NORMAL",
    },
  });

  const internal = await salesInbox();
  if (internal) {
    void sendMail({
      to: internal,
      replyTo: input.email,
      subject: `Website enquiry ${reference} — ${input.topic}`,
      text: [
        `Reference: ${reference}`,
        `Topic:     ${input.topic}`,
        `Name:      ${input.name}`,
        `Email:     ${input.email}`,
        input.phone ? `Phone:     ${input.phone}` : null,
        input.companyName ? `Company:   ${input.companyName}` : null,
        "",
        input.message,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  }

  void sendMail({
    to: input.email,
    subject: `We have received your message (${reference})`,
    text: [
      `Hello ${input.name},`,
      "",
      `Thank you for getting in touch. Your reference is ${reference}.`,
      "",
      "Our team will respond to this email address. Please quote your reference in any follow-up.",
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(input.name)},</p>`,
      `<p>Thank you for getting in touch. Your reference is <strong>${escapeHtml(reference)}</strong>.</p>`,
      "<p>Our team will respond to this email address. Please quote your reference in any follow-up.</p>",
    ].join(""),
  });

  await recordAudit({
    action: "contact.message_received",
    entityType: "SupportTicket",
    entityId: reference,
    metadata: { topic: input.topic },
    ip,
    actorId: user?.id ?? null,
  });

  return jsonOk({ reference });
});
