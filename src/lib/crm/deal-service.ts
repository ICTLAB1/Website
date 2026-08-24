import "server-only";

import type { ActivityKind, DealSource, DealStage, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { isClosed } from "@/lib/crm/pipeline";
import { recordCrmEvent } from "@/lib/crm/outbox";

/**
 * Deals and their history: everything that writes to the pipeline.
 *
 * Three rules live here rather than in the screens, because each of them is a
 * property of the business rather than of a form, and a second screen would
 * otherwise get one of them subtly wrong.
 *
 * 1. **A stage change is always dated.** `stageChangedAt` is what "sitting in
 *    Negotiation for five weeks" is measured from, and it is the number the
 *    pipeline is actually read for. It moves when — and only when — the stage
 *    moves.
 * 2. **A loss carries its reason.** Recording losses without reasons teaches
 *    the business nothing, which is the entire purpose of recording them.
 * 3. **Every stage change writes itself into the timeline.** A deal that moved
 *    from Quoted to Lost between Tuesday and Wednesday, with nobody able to say
 *    why or who, is a deal whose history has a hole in it.
 */

export type DealResult =
  | { ok: true; reference: string; id: string }
  | { ok: false; reason: string };

/**
 * At least one thing to attach an activity to.
 *
 * Enforced here rather than in the schema, where four nullable foreign keys
 * cannot express "one of these". An activity attached to nothing cannot be
 * found again, which makes logging it worse than not logging it — the person
 * who wrote it believes it is recorded.
 */
function hasSubject(input: { dealId?: string | null; companyId?: string | null; contactId?: string | null }) {
  return Boolean(input.dealId || input.companyId || input.contactId);
}

export async function createDeal(input: {
  title: string;
  stage?: DealStage;
  source?: DealSource;
  companyId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  ownerId?: string | null;
  expectedValueMinor?: number;
  expectedCloseOn?: Date | null;
  enquiryId?: string | null;
  notes?: string | null;
  actorId: string;
}): Promise<DealResult> {
  const title = input.title.trim();
  if (title.length === 0) return { ok: false, reason: "A deal needs a title." };

  /*
   * A deal must be about somebody. Either a company row, or at minimum the name
   * of the organisation as it was given on the phone — otherwise the pipeline
   * fills with rows nobody can act on.
   */
  if (!input.companyId && !input.companyName?.trim()) {
    return { ok: false, reason: "Name the organisation, or pick an existing customer." };
  }

  const stage = input.stage ?? "NEW";
  if (isClosed(stage)) {
    // Not a technical limitation — a deal created directly as won or lost has
    // no history, and the pipeline's numbers are built out of history.
    return { ok: false, reason: "A new deal starts open. Move it to Won or Lost once it closes." };
  }

  const reference = publicReference("DEAL");

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        reference,
        title,
        stage,
        source: input.source ?? "DIRECT",
        stageChangedAt: new Date(),
        companyId: input.companyId || null,
        companyName: input.companyName?.trim() || null,
        contactName: input.contactName?.trim() || null,
        contactEmail: input.contactEmail?.trim().toLowerCase() || null,
        contactPhone: input.contactPhone?.trim() || null,
        ownerId: input.ownerId || null,
        expectedValueMinor: Math.max(0, Math.round(input.expectedValueMinor ?? 0)),
        expectedCloseOn: input.expectedCloseOn ?? null,
        enquiryId: input.enquiryId || null,
        notes: input.notes?.trim() || null,
      },
      select: { id: true, reference: true },
    });

    await tx.activity.create({
      data: {
        kind: "SYSTEM",
        subject: "Deal created",
        dealId: created.id,
        companyId: input.companyId || null,
        userId: input.actorId,
      },
    });

    /*
     * Inside the transaction, so the event and the thing it describes either
     * both happen or neither does. An event written outside it can describe a
     * deal that then rolled back, and the far end believes in a deal that does
     * not exist.
     */
    await recordCrmEvent(tx, {
      kind: "deal.created",
      entityType: "Deal",
      entityId: created.reference,
      data: {
        reference: created.reference,
        title,
        stage,
        source: input.source ?? "DIRECT",
        organisation: input.companyName?.trim() || null,
        expectedValueMinor: Math.max(0, Math.round(input.expectedValueMinor ?? 0)),
        currency: "INR",
      },
    });

    return created;
  });

  return { ok: true, id: deal.id, reference: deal.reference };
}

/**
 * Moves a deal to a new stage.
 *
 * Idempotent on a no-op: setting the stage a deal is already in changes
 * nothing, rather than resetting `stageChangedAt` and making a stalled deal
 * look freshly worked. That is not a nicety — a double-submitted form would
 * otherwise erase the one number that says the deal is stuck.
 */
export async function moveDealStage(input: {
  reference: string;
  stage: DealStage;
  lostReason?: string | null;
  /**
   * Who did it, or null when nobody here did.
   *
   * Null is the customer's CRM asking for the change through the inbound
   * webhook. The history entry is still written — the change happened and has
   * to be visible — with no author, which is the truth. Attributing it to
   * whichever administrator last saved the integration settings would put a
   * person's name against a decision they did not make.
   */
  actorId: string | null;
  /**
   * Whether to tell the customer's CRM about this.
   *
   * True for a change somebody made here. False for one the CRM itself just
   * asked for — otherwise the change goes straight back out to the system that
   * sent it, which sends it back, and the two halves of a two-way integration
   * become a loop that neither side can see the start of.
   *
   * A flag rather than a separate code path, because everything else about the
   * change is identical and must stay identical: the loss reason is still
   * required, `stageChangedAt` still moves, and the history still records who
   * did it. Duplicating this function for the inbound case is how one of those
   * rules quietly stops applying to half the changes.
   */
  emit?: boolean;
}): Promise<DealResult> {
  const deal = await prisma.deal.findUnique({
    where: { reference: input.reference },
    select: { id: true, reference: true, stage: true, companyId: true },
  });
  if (!deal) return { ok: false, reason: "That deal no longer exists." };

  if (deal.stage === input.stage) {
    return { ok: true, id: deal.id, reference: deal.reference };
  }

  const lostReason = input.lostReason?.trim() || null;
  if (input.stage === "LOST" && !lostReason) {
    return { ok: false, reason: "Say why it was lost. A loss with no reason teaches nothing." };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.deal.update({
      where: { id: deal.id },
      data: {
        stage: input.stage,
        stageChangedAt: now,
        // Cleared when a deal reopens, so a deal that went Lost and came back
        // does not carry a reason contradicting its own stage.
        lostReason: input.stage === "LOST" ? lostReason : null,
        closedAt: isClosed(input.stage) ? now : null,
      },
    });

    await tx.activity.create({
      data: {
        kind: "SYSTEM",
        subject: `Stage changed: ${deal.stage} → ${input.stage}`,
        body: lostReason,
        occurredAt: now,
        dealId: deal.id,
        companyId: deal.companyId,
        userId: input.actorId || null,
      },
    });

    /*
     * Two events on a close, not one. `deal.stage_changed` is the fact; the
     * `deal.won` / `deal.lost` pair are what a receiving system actually
     * subscribes to, and making it derive them from a string comparison on the
     * stage is how the far end ends up with its own copy of this file's rules.
     */
    if (input.emit !== false) {
      await recordCrmEvent(tx, {
        kind: "deal.stage_changed",
        entityType: "Deal",
        entityId: deal.reference,
        data: { reference: deal.reference, from: deal.stage, to: input.stage },
      });

      if (isClosed(input.stage)) {
        await recordCrmEvent(tx, {
          kind: input.stage === "WON" ? "deal.won" : "deal.lost",
          entityType: "Deal",
          entityId: deal.reference,
          data: { reference: deal.reference, lostReason },
        });
      }
    }
  });

  return { ok: true, id: deal.id, reference: deal.reference };
}

export async function updateDeal(input: {
  reference: string;
  title?: string;
  source?: DealSource;
  ownerId?: string | null;
  expectedValueMinor?: number;
  expectedCloseOn?: Date | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  actorId: string;
}): Promise<DealResult> {
  const deal = await prisma.deal.findUnique({
    where: { reference: input.reference },
    select: { id: true, reference: true },
  });
  if (!deal) return { ok: false, reason: "That deal no longer exists." };

  const data: Prisma.DealUpdateInput = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length === 0) return { ok: false, reason: "A deal needs a title." };
    data.title = title;
  }
  if (input.source !== undefined) data.source = input.source;
  if (input.ownerId !== undefined) {
    data.owner = input.ownerId ? { connect: { id: input.ownerId } } : { disconnect: true };
  }
  if (input.expectedValueMinor !== undefined) {
    data.expectedValueMinor = Math.max(0, Math.round(input.expectedValueMinor));
  }
  if (input.expectedCloseOn !== undefined) data.expectedCloseOn = input.expectedCloseOn;
  if (input.contactName !== undefined) data.contactName = input.contactName?.trim() || null;
  if (input.contactEmail !== undefined) {
    data.contactEmail = input.contactEmail?.trim().toLowerCase() || null;
  }
  if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone?.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes?.trim() || null;

  /*
   * The stage is deliberately not settable here. It goes through
   * `moveDealStage`, which dates the change and writes it into the history —
   * and a second path that quietly did neither is exactly how those two
   * guarantees stop being true.
   */
  await prisma.deal.update({ where: { id: deal.id }, data });

  return { ok: true, id: deal.id, reference: deal.reference };
}

/**
 * Starts a deal from an enquiry that has already arrived.
 *
 * Copies what the enquiry knows so nobody retypes it, and links the two so the
 * deal can always be traced back to what the customer actually asked for.
 *
 * Refuses a second deal for the same enquiry. Not because one enquiry cannot
 * become two pieces of business — it can, and a second deal may be created by
 * hand — but because this button gets pressed twice, and the resulting pair of
 * identical deals would both be counted in the forecast.
 */
export async function createDealFromEnquiry(input: {
  enquiryReference: string;
  ownerId: string;
  actorId: string;
}): Promise<DealResult> {
  const enquiry = await prisma.enquiry.findUnique({
    where: { reference: input.enquiryReference },
    select: {
      id: true,
      reference: true,
      companyName: true,
      companyId: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      requirements: true,
      deals: { select: { reference: true }, take: 1 },
    },
  });
  if (!enquiry) return { ok: false, reason: "That enquiry no longer exists." };

  if (enquiry.deals.length > 0) {
    return {
      ok: false,
      reason: `This enquiry is already on the pipeline as ${enquiry.deals[0]!.reference}.`,
    };
  }

  return createDeal({
    title: `${enquiry.companyName} — ${enquiry.reference}`,
    source: "WEBSITE_ENQUIRY",
    stage: "QUALIFYING",
    companyId: enquiry.companyId,
    companyName: enquiry.companyName,
    contactName: enquiry.contactName,
    contactEmail: enquiry.contactEmail,
    contactPhone: enquiry.contactPhone,
    ownerId: input.ownerId,
    enquiryId: enquiry.id,
    notes: enquiry.requirements,
    actorId: input.actorId,
  });
}

// ── activities ──────────────────────────────────────────────────────────────

export type ActivityResult = { ok: true; id: string } | { ok: false; reason: string };

export async function logActivity(input: {
  kind: ActivityKind;
  subject: string;
  body?: string | null;
  occurredAt?: Date;
  dueAt?: Date | null;
  dealId?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  /** Null when the entry came from the customer's CRM rather than a person. */
  actorId: string | null;
}): Promise<ActivityResult> {
  const subject = input.subject.trim();
  if (subject.length === 0) return { ok: false, reason: "Say what happened." };

  if (input.kind === "SYSTEM") {
    /*
     * Only the application writes these. A person able to author one could put
     * a false "Quotation sent" into a history that exists to be evidence of
     * what was actually done.
     */
    return { ok: false, reason: "System entries are written by the application, not by hand." };
  }

  if (!hasSubject(input)) {
    return { ok: false, reason: "Attach this to a deal, a customer or a contact." };
  }

  if (input.kind === "TASK" && !input.dueAt) {
    return { ok: false, reason: "A follow-up needs a date, or nobody will see it again." };
  }

  const activity = await prisma.activity.create({
    data: {
      kind: input.kind,
      subject,
      body: input.body?.trim() || null,
      occurredAt: input.occurredAt ?? new Date(),
      dueAt: input.dueAt ?? null,
      dealId: input.dealId || null,
      companyId: input.companyId || null,
      contactId: input.contactId || null,
      userId: input.actorId || null,
    },
    select: { id: true },
  });

  /*
   * Logging an activity is contact, and contact is what `stageChangedAt`
   * cannot see: a deal being actively worked in one stage for six weeks is not
   * the same as one nobody has touched. `Deal.updatedAt` is what the "gone
   * quiet" reading uses alongside the stage clock, so it is nudged here.
   */
  if (input.dealId) {
    await prisma.deal.update({ where: { id: input.dealId }, data: { updatedAt: new Date() } });
  }

  return { ok: true, id: activity.id };
}

/** Marks a follow-up done. Idempotent: completing a done task changes nothing. */
export async function completeActivity(input: {
  id: string;
  actorId: string;
}): Promise<ActivityResult> {
  const activity = await prisma.activity.findUnique({
    where: { id: input.id },
    select: { id: true, completedAt: true, dueAt: true },
  });
  if (!activity) return { ok: false, reason: "That follow-up no longer exists." };
  if (!activity.dueAt) return { ok: false, reason: "That entry is not a follow-up." };
  if (activity.completedAt) return { ok: true, id: activity.id };

  await prisma.activity.update({
    where: { id: activity.id },
    data: { completedAt: new Date() },
  });

  return { ok: true, id: activity.id };
}
