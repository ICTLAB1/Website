import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { requireJsonBody } from "@/lib/http/json-body";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { careerScreeningSchema, fieldErrorsOf } from "@/lib/validation";
import { publicReference } from "@/lib/auth/tokens";
import { escapeHtml, notifyInternal, sendMail } from "@/lib/mail";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * First-round screening answers from /careers.
 *
 * Stored as a support ticket in the CAREERS category, the same way the contact
 * form is, so there is no new table and HR reads it where the team already
 * reads messages. Applications themselves still happen on the HR portal; this
 * is the short questionnaire before one.
 */
export const POST = withErrorHandling("careers.screening", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`careers:${ip}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "You have submitted several times recently. Please try again later.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await requireJsonBody(request);
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = careerScreeningSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  if (parsed.data.website) {
    logger.warn("careers_honeypot_triggered", {});
    return jsonOk({ reference: "TKT-0000-XXXXXX" });
  }

  const input = parsed.data;
  const reference = publicReference("TKT");
  const lines = [
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Phone: ${input.phone}`,
    `Role or area of interest: ${input.roleInterest}`,
    `Total experience: ${input.experience}`,
    `Current city: ${input.currentLocation}`,
    `Notice period: ${input.noticePeriod}`,
    input.currentCtc ? `Current CTC: ${input.currentCtc}` : null,
    input.expectedCtc ? `Expected CTC: ${input.expectedCtc}` : null,
    input.profileUrl ? `Profile or resume link: ${input.profileUrl}` : null,
    "",
    "Relevant experience:",
    input.relevantExperience,
    "",
    "Why TechZoid:",
    input.whyTechzoid,
  ].filter((line): line is string => line !== null);

  await prisma.supportTicket.create({
    data: {
      reference,
      userId: null,
      subject: `Careers screening: ${input.roleInterest} (${input.name})`,
      category: "CAREERS",
      message: lines.join("\n"),
      priority: "NORMAL",
    },
  });

  void notifyInternal({
    replyTo: input.email,
    subject: `Careers screening ${reference}: ${input.roleInterest}`,
    text: [`Reference: ${reference}`, ...lines].join("\n"),
  });

  void sendMail({
    to: input.email,
    subject: `We have received your answers (${reference})`,
    text: [
      `Hello ${input.name},`,
      "",
      `Thank you for your interest in TechZoid. Your reference is ${reference}.`,
      "",
      "Our HR team will read your answers and reply to this email address. This is not an application: apply to a listed role on our careers page.",
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(input.name)},</p>`,
      `<p>Thank you for your interest in TechZoid. Your reference is <strong>${escapeHtml(reference)}</strong>.</p>`,
      "<p>Our HR team will read your answers and reply to this email address. This is not an application: apply to a listed role on our careers page.</p>",
    ].join(""),
  });

  await recordAudit({
    action: "careers.screening_received",
    entityType: "SupportTicket",
    entityId: reference,
    metadata: { role: input.roleInterest },
    ip,
    actorId: null,
  });

  return jsonOk({ reference });
});
