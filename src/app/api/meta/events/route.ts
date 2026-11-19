import { z } from "zod";

import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { requireJsonBody } from "@/lib/http/json-body";
import { META_EVENTS, META_ENABLED, REFERENCE_PATTERN, leadEventId } from "@/lib/meta";
import { resolveFbc, sendCapiEvent } from "@/lib/meta-capi";

/**
 * The server half of Meta's `Lead` and `Contact` events.
 *
 * The browser asks for it after it has sent its own copy, and only when the
 * visitor accepted analytics. What this endpoint does not do is believe the
 * caller about anything that matters:
 *
 *  - A `Lead` must name a real, recent enquiry. The email and phone that are
 *    hashed come from that stored record, never from the request, so a caller
 *    cannot make this endpoint vouch for an address of their choosing, and the
 *    response never says what the record held.
 *  - The event id for a `Lead` is derived from the reference, so one enquiry is
 *    one event however many times this is called.
 *  - Same-origin and CSRF-checked like every other state-changing route, and
 *    rate limited per client address.
 *  - Answers success once the request is well formed, whether
 *    or not Meta accepted it: the visitor has nothing to do about it.
 */

const body = z.object({
  event: z.enum([META_EVENTS.lead, META_EVENTS.contact]),
  eventId: z.string().min(8).max(120),
  reference: z.string().regex(REFERENCE_PATTERN).optional(),
  contentName: z.string().max(120).optional(),
  url: z.string().url().max(500),
  fbp: z.string().max(100).optional(),
  fbc: z.string().max(200).optional(),
  fbclid: z.string().max(200).optional(),
  fbclidAt: z.number().optional(),
});

/** How recent an enquiry must be to be reported: a form submitted just now, not one found later. */
const RECENT_MS = 60 * 60 * 1000;

// Per process, like the rate limiter: one send per lead even if the browser repeats the request.
const sentLeads = new Set<string>();

async function contactDetails(
  reference: string,
): Promise<{ email?: string; phone?: string } | null> {
  const since = new Date(Date.now() - RECENT_MS);

  if (reference.startsWith("ENQ-")) {
    const row = await prisma.enquiry.findFirst({
      where: { reference, createdAt: { gte: since } },
      select: { contactEmail: true, contactPhone: true },
    });
    return row ? { email: row.contactEmail, phone: row.contactPhone } : null;
  }

  // A contact-form message is stored as a support ticket whose first lines are
  // "Email: …" and "Phone: …".
  const ticket = await prisma.supportTicket.findFirst({
    where: { reference, createdAt: { gte: since } },
    select: { message: true },
  });
  if (!ticket) return null;
  const find = (label: string) =>
    ticket.message.match(new RegExp(`^${label}: (.+)$`, "m"))?.[1]?.trim();
  return { email: find("Email"), phone: find("Phone") };
}

export const POST = withErrorHandling("meta.events", async (request: Request) => {
  if (!META_ENABLED) return jsonOk({ sent: false });

  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  if (!hit(`meta:${ip}`, 40, 3600).allowed) return jsonOk({ sent: false });

  let raw: unknown;
  try {
    raw = await requireJsonBody(request);
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }
  const parsed = body.safeParse(raw);
  if (!parsed.success) return jsonError("bad_request", "The request could not be read.");
  const input = parsed.data;

  let eventId = input.eventId;
  let email: string | undefined;
  let phone: string | undefined;

  if (input.event === META_EVENTS.lead) {
    if (!input.reference) return jsonError("bad_request", "A lead needs a reference.");
    // The id the browser used is the id this one must carry, or Meta cannot pair them.
    eventId = leadEventId(input.reference);
    if (input.eventId !== eventId) return jsonError("bad_request", "The request could not be read.");
    if (sentLeads.has(eventId)) return jsonOk({ sent: false });

    const details = await contactDetails(input.reference);
    if (!details) return jsonOk({ sent: false });
    sentLeads.add(eventId);
    email = details.email;
    phone = details.phone;
  }

  const sent = await sendCapiEvent({
    event: input.event,
    eventId,
    sourceUrl: input.url,
    ip,
    userAgent: request.headers.get("user-agent") ?? undefined,
    fbp: input.fbp,
    fbc: resolveFbc(input),
    email,
    phone,
    contentName: input.contentName,
  });

  return jsonOk({ sent });
});
