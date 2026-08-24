import { z } from "zod";

import { CRM_EVENT_KINDS, type CrmEventKind } from "@/lib/crm/events";

/**
 * What this application will accept from the customer's own CRM.
 *
 * The outbound half of this integration is a broadcast: things happened here,
 * and the CRM is told. This half is the opposite and has to be treated as such
 * — it is another system reaching in and changing a pipeline that people here
 * make decisions from. So the rules are here, in a file with no database and no
 * network in it, where they can be read and tested as rules rather than
 * inferred from a route handler.
 *
 * Three decisions are worth stating outright, because each one is a "no" and a
 * reader will otherwise assume the opposite.
 *
 * ## Deals are not created from outside
 *
 * `deal.created` is refused. A deal here carries an owner, a source, and a link
 * to a company record — and a deal arriving from the CRM has none of those in a
 * form this side can trust. Inventing them produces a customer record nobody
 * entered, which is the one thing this codebase does not do. A deal that starts
 * life in the CRM belongs to the CRM until somebody here decides it is real.
 *
 * ## Money does not move from outside
 *
 * Nothing inbound may change `expectedValueMinor`. The pipeline figures on the
 * dashboard are what this business forecasts from, and a forecast that a second
 * system can rewrite without anybody here approving it is not a forecast. A
 * delivery carrying a value is applied for everything else and the value is
 * refused, in words, on the settings screen.
 *
 * ## The older event loses
 *
 * Deliveries arrive late and out of order — that is what a retrying sender
 * does. `occurredAt` travels inside the signed envelope, so an event describing
 * a state older than the one already recorded here is ignored rather than
 * applied. Without this, a retry of yesterday's "moved to QUOTED" silently
 * undoes this morning's "WON".
 */

/** The kinds this side is willing to act on, as opposed to merely understand. */
export const ACCEPTED_INBOUND_KINDS = [
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "activity.logged",
] as const satisfies readonly CrmEventKind[];

export type AcceptedInboundKind = (typeof ACCEPTED_INBOUND_KINDS)[number];

/** Stages this side recognises. Mirrors the `DealStage` enum deliberately. */
const STAGES = ["NEW", "QUALIFYING", "QUOTED", "NEGOTIATION", "WON", "LOST"] as const;

/**
 * The envelope, validated rather than trusted.
 *
 * Identical in shape to what this platform sends, because the far end was given
 * that shape to implement — a receiver that accepts something subtly different
 * from what it documents is how two systems end up disagreeing about a field
 * neither of them will admit to owning.
 */
export const inboundEnvelopeSchema = z.object({
  version: z.number().int(),
  id: z.string().trim().min(1).max(200),
  kind: z.string().trim().min(1).max(80),
  occurredAt: z.string().trim().min(1),
  entity: z.object({
    type: z.string().trim().min(1).max(40),
    id: z.string().trim().min(1).max(120),
  }),
  data: z.record(z.string(), z.unknown()).default({}),
});

export type InboundEnvelope = z.infer<typeof inboundEnvelopeSchema>;

export type InboundDecision =
  /** Verified, understood, and here is what to do. */
  | { verdict: "apply"; action: InboundAction; note?: string }
  /** Verified and understood; nothing needs doing. */
  | { verdict: "ignore"; detail: string }
  /** Verified, and this application will not do it. */
  | { verdict: "refuse"; detail: string };

export type InboundAction =
  | { type: "stage"; reference: string; stage: (typeof STAGES)[number]; lostReason: string | null }
  | { type: "activity"; reference: string; subject: string; body: string | null; occurredAt: Date };

const isStage = (value: unknown): value is (typeof STAGES)[number] =>
  typeof value === "string" && (STAGES as readonly string[]).includes(value);

/**
 * What a delivery means, given what this side already knows.
 *
 * `current` is the state as recorded here, or null when the deal is unknown.
 * Passed in rather than read, so every branch of this can be exercised without
 * a database — including the ones that are hard to arrange in one.
 */
export function decideInbound(
  envelope: InboundEnvelope,
  current: { stage: string; stageChangedAt: Date } | null,
): InboundDecision {
  if (envelope.version !== 1) {
    return { verdict: "refuse", detail: `Unsupported envelope version ${envelope.version}.` };
  }

  if (!(CRM_EVENT_KINDS as readonly string[]).includes(envelope.kind)) {
    return { verdict: "refuse", detail: `Unknown event kind "${envelope.kind}".` };
  }

  if (envelope.kind === "deal.created") {
    return {
      verdict: "refuse",
      detail:
        "Deals are not created from outside. A deal here needs an owner, a source and a customer " +
        "record, and none of those can be taken on trust from another system.",
    };
  }

  if (!(ACCEPTED_INBOUND_KINDS as readonly string[]).includes(envelope.kind)) {
    return { verdict: "refuse", detail: `"${envelope.kind}" is not accepted inbound.` };
  }

  const occurredAt = new Date(envelope.occurredAt);
  if (Number.isNaN(occurredAt.getTime())) {
    return { verdict: "refuse", detail: `"${envelope.occurredAt}" is not a date.` };
  }

  if (envelope.entity.type !== "Deal") {
    return { verdict: "refuse", detail: `Only Deal events are accepted; got "${envelope.entity.type}".` };
  }

  const reference = envelope.entity.id.trim();
  if (!current) {
    return {
      verdict: "refuse",
      detail: `No deal here has the reference ${reference}.`,
    };
  }

  if (envelope.kind === "activity.logged") {
    const subject = typeof envelope.data.subject === "string" ? envelope.data.subject.trim() : "";
    if (subject.length === 0) {
      return { verdict: "refuse", detail: "An activity with no subject says nothing." };
    }
    const body = typeof envelope.data.body === "string" ? envelope.data.body.trim() : "";
    return {
      verdict: "apply",
      action: { type: "activity", reference, subject, body: body || null, occurredAt },
    };
  }

  /*
   * A stage change, from whichever of the three kinds carries one.
   *
   * `deal.won` and `deal.lost` are not separate instructions — they are the
   * same instruction with the stage implied, which is exactly why the sender
   * emits both them and `deal.stage_changed`. Deriving the stage here keeps the
   * far end from having to agree with this side about a string.
   */
  const target =
    envelope.kind === "deal.won"
      ? "WON"
      : envelope.kind === "deal.lost"
        ? "LOST"
        : envelope.data.to;

  if (!isStage(target)) {
    return { verdict: "refuse", detail: `"${String(target)}" is not a stage.` };
  }

  /*
   * Money, refused loudly rather than dropped quietly.
   *
   * A sender that includes a value and gets a bare "applied" back will keep
   * including it, and will reasonably believe this side is honouring it.
   */
  const carriesValue =
    envelope.data.expectedValueMinor !== undefined || envelope.data.value !== undefined;

  if (current.stage === target) {
    return {
      verdict: "ignore",
      detail: `Already ${target}.`,
    };
  }

  /*
   * Late deliveries lose. Equal timestamps apply: a sender whose clock matches
   * ours to the millisecond is not the case worth guarding against, and
   * refusing on equality means a legitimate same-second change never lands.
   */
  if (occurredAt.getTime() < current.stageChangedAt.getTime()) {
    return {
      verdict: "ignore",
      detail:
        `Older than the change recorded here — this event is from ` +
        `${occurredAt.toISOString()}, the deal moved to ${current.stage} at ` +
        `${current.stageChangedAt.toISOString()}.`,
    };
  }

  const lostReason =
    typeof envelope.data.lostReason === "string" ? envelope.data.lostReason.trim() : "";

  if (target === "LOST" && lostReason.length === 0) {
    return {
      verdict: "refuse",
      detail: "A loss with no reason teaches nothing. Send a lostReason.",
    };
  }

  return {
    verdict: "apply",
    action: { type: "stage", reference, stage: target, lostReason: lostReason || null },
    note: carriesValue
      ? "The stage was applied. The value it carried was not: expected value is set here, not from outside."
      : undefined,
  };
}
