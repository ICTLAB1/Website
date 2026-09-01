import "server-only";
import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { recordCrmEvent } from "@/lib/crm/outbox";
import { escapeHtml, salesInbox, sendMail } from "@/lib/mail";
import { logger } from "@/lib/logger";

/**
 * Turning a chat conversation into a deal.
 *
 * The counterpart to `lib/crm/deal-service.ts`'s `createDeal`, which that
 * function cannot serve directly: it requires `actorId`, a member of staff,
 * because every other way a deal is opened here has one behind it. A chat
 * visitor does not, and inventing a system user to satisfy the type would put
 * a fake account into the "who did this" column of the pipeline forever.
 *
 * Deliberately narrow. It creates exactly one deal (source `CHATBOT`) and one
 * activity carrying the transcript, the same two writes `createDeal` makes,
 * inside the same kind of transaction and through the same CRM outbox — a
 * deal opened by the assistant is not a second-class deal, it is a deal.
 */

export type CaptureLeadInput = {
  name: string;
  email: string;
  phone?: string | null;
  companyName?: string | null;
  interest: string;
  /** The conversation so far, as shown to the visitor — for the activity's body. */
  transcript: string;
};

export type CaptureLeadResult = { ok: true; reference: string } | { ok: false; reason: string };

export async function captureLead(input: CaptureLeadInput): Promise<CaptureLeadResult> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2) return { ok: false, reason: "That name looks too short." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "That email address looks wrong." };

  const reference = publicReference("DEAL");
  const title = `Chat enquiry — ${input.companyName?.trim() || name}`;

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        reference,
        title,
        stage: "NEW",
        source: "CHATBOT",
        stageChangedAt: new Date(),
        companyName: input.companyName?.trim() || null,
        contactName: name,
        contactEmail: email,
        contactPhone: input.phone?.trim() || null,
        notes: input.interest.trim().slice(0, 2000) || null,
      },
      select: { id: true, reference: true },
    });

    await tx.activity.create({
      data: {
        kind: "NOTE",
        subject: "Chat conversation with Zoey",
        body: input.transcript.slice(0, 8000),
        dealId: created.id,
        // No `userId` — nobody on staff wrote this one. `Activity.userId` is
        // nullable exactly for a record the application authored.
      },
    });

    await recordCrmEvent(tx, {
      kind: "deal.created",
      entityType: "Deal",
      entityId: created.reference,
      data: {
        reference: created.reference,
        title,
        stage: "NEW",
        source: "CHATBOT",
        organisation: input.companyName?.trim() || null,
        expectedValueMinor: 0,
        currency: "INR",
      },
    });

    return created;
  });

  logger.info("chatbot_lead_captured", { reference: deal.reference });

  const inbox = await salesInbox();
  if (inbox) {
    void sendMail({
      to: inbox,
      subject: `New chat lead — ${input.companyName?.trim() || name}`,
      text: [
        `Deal:     ${deal.reference}`,
        `Name:     ${name}`,
        `Email:    ${email}`,
        `Phone:    ${input.phone?.trim() || "—"}`,
        `Company:  ${input.companyName?.trim() || "—"}`,
        "",
        "What they're looking for:",
        input.interest.trim(),
        "",
        "Full conversation:",
        input.transcript,
      ].join("\n"),
      html: [
        `<p><strong>Deal:</strong> ${escapeHtml(deal.reference)}</p>`,
        `<p><strong>Name:</strong> ${escapeHtml(name)}<br>`,
        `<strong>Email:</strong> ${escapeHtml(email)}<br>`,
        `<strong>Phone:</strong> ${escapeHtml(input.phone?.trim() || "—")}<br>`,
        `<strong>Company:</strong> ${escapeHtml(input.companyName?.trim() || "—")}</p>`,
        `<p><strong>What they're looking for:</strong><br>${escapeHtml(input.interest.trim())}</p>`,
        `<p><strong>Full conversation:</strong></p><pre>${escapeHtml(input.transcript)}</pre>`,
      ].join(""),
    });
  }

  return { ok: true, reference: deal.reference };
}
