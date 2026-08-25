import "server-only";

import type { QuoteFollowUpKind } from "@prisma/client";

import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import {
  quoteFollowUpHtml,
  quoteFollowUpSubject,
  quoteFollowUpText,
  type QuoteFollowUpInput,
} from "@/lib/emails/quote-follow-up";
import { logger } from "@/lib/logger";
import { sendMail } from "@/lib/mail";
import { getMailConfig } from "@/lib/mail-config";
import { expireStaleQuotes } from "@/lib/quote-service";
import { getSiteConfig } from "@/lib/site-config";

/**
 * Chasing a quotation nobody has answered.
 *
 * ## The rule this file exists to keep
 *
 * A follow-up is a message to a real customer about real money, sent by a
 * machine on a clock. Everything here is arranged around one property: it must
 * be impossible for a customer to receive a chase that is not true at the
 * moment it is sent. So the state is re-read immediately before every send —
 * the quotation is still SENT, still inside its validity, still unanswered,
 * still not paused — rather than trusted from the query that selected it. A
 * scheduler run and a salesperson pressing "accepted" can happen in the same
 * second, and the customer must not then be asked why they have not replied.
 *
 * ## Automatic and manual are the same message
 *
 * They differ in who caused them and whether a human wrote a line at the top.
 * Both go through `deliverFollowUp`, so a change to the wording, the recipient
 * rules or the record cannot apply to one and not the other.
 *
 * ## Nothing is sent twice
 *
 * Each automatic chase is one step of the schedule, and `(quoteId, step)` is
 * unique in the database. Two overlapping scheduler runs therefore race to
 * insert the same row and one of them loses, which is the outcome to want: the
 * record is written *before* the mail is handed over, so the constraint decides
 * who sends and there is no window in which both do.
 */

const DAY = 24 * 60 * 60 * 1000;

export type FollowUpSettings = {
  enabled: boolean;
  schedule: number[];
  minimumGapDays: number;
  stopOnReply: boolean;
};

export const FOLLOW_UP_DEFAULTS: FollowUpSettings = {
  enabled: false,
  schedule: [3, 7, 14],
  minimumGapDays: 2,
  stopOnReply: true,
};

/**
 * The schedule as configured, or the defaults where nobody has configured it.
 *
 * The defaults are off. A deployment that has never visited the settings screen
 * sends nothing, which is the only safe reading of "we have not decided yet".
 */
export async function getFollowUpSettings(): Promise<FollowUpSettings> {
  const row = await prisma.quoteFollowUpSettings.findUnique({ where: { id: "singleton" } });
  if (!row) return FOLLOW_UP_DEFAULTS;

  return {
    enabled: row.enabled,
    /*
     * Sorted and de-duplicated on the way out rather than on the way in.
     *
     * The form validates, but this row is also reachable from a database
     * client, and a schedule of [7, 3, 3] would otherwise send step 2 before
     * step 1 and send it twice. Ordering here means the rest of the file can
     * treat index+1 as "which chase this is" without qualification.
     */
    schedule: [...new Set(row.schedule)].filter((days) => days > 0).sort((a, b) => a - b),
    minimumGapDays: row.minimumGapDays,
    stopOnReply: row.stopOnReply,
  };
}

/** What a quotation needs to carry for a follow-up to be worth sending. */
const followUpSelect = {
  id: true,
  reference: true,
  status: true,
  sentAt: true,
  validUntil: true,
  currency: true,
  totalMinor: true,
  followUpsPausedAt: true,
  owner: { select: { name: true } },
  enquiry: { select: { contactEmail: true, contactName: true } },
  followUps: { select: { step: true, sentAt: true } },
  messages: {
    where: { fromStaff: false },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} as const;

type FollowUpQuote = {
  id: string;
  reference: string;
  status: string;
  sentAt: Date | null;
  validUntil: Date | null;
  currency: string;
  totalMinor: number;
  followUpsPausedAt: Date | null;
  owner: { name: string } | null;
  enquiry: { contactEmail: string; contactName: string } | null;
  followUps: Array<{ step: number | null; sentAt: Date }>;
  messages: Array<{ createdAt: Date }>;
};

/** Why a quotation is not being chased, in the words the admin panel shows. */
export type FollowUpBlock =
  | "not-sent"
  | "answered"
  | "expired"
  | "paused"
  | "no-address"
  | "customer-replied"
  | "schedule-complete"
  | "too-soon"
  | "not-due";

/**
 * Whether this quotation may be chased at all, by anybody.
 *
 * Separate from whether an automatic chase is *due*, because the two questions
 * have different answers and both are worth showing: a salesperson looking at a
 * quotation the schedule will not touch for another four days should be able to
 * send one now, and one looking at a quotation that has been accepted should
 * not be offered the button at all.
 */
export function followUpBlock(quote: FollowUpQuote, now: Date): FollowUpBlock | null {
  if (quote.status === "ACCEPTED" || quote.status === "DECLINED") return "answered";
  if (quote.status !== "SENT" || !quote.sentAt) return "not-sent";
  if (!quote.enquiry?.contactEmail) return "no-address";
  /*
   * An expired quotation is not chased.
   *
   * The pricing on it no longer stands, so a note asking whether the customer
   * would like to proceed is an offer this business has already withdrawn. The
   * honest move at that point is a fresh quotation, which is a different action
   * with a different document.
   */
  if (quote.validUntil && quote.validUntil.getTime() <= now.getTime()) return "expired";
  return null;
}

/**
 * Which automatic chase is due now, or null.
 *
 * Returns the *earliest* unsent step whose day has arrived, never the latest. A
 * quotation that sat through a scheduler outage should resume the sequence, not
 * skip to the end and tell a customer this is their final reminder when it is
 * their first.
 */
export function dueStep(
  quote: FollowUpQuote,
  settings: FollowUpSettings,
  now: Date,
): { step: number } | { blocked: FollowUpBlock } {
  const blocked = followUpBlock(quote, now);
  if (blocked) return { blocked };
  if (quote.followUpsPausedAt) return { blocked: "paused" };

  const sentAt = quote.sentAt!;

  if (settings.stopOnReply && quote.messages.length > 0) {
    return { blocked: "customer-replied" };
  }

  const done = new Set(
    quote.followUps
      .map((row) => row.step)
      .filter((step): step is number => typeof step === "number"),
  );

  const next = settings.schedule.findIndex((_, index) => !done.has(index + 1));
  if (next === -1) return { blocked: "schedule-complete" };

  const dueAt = sentAt.getTime() + settings.schedule[next]! * DAY;
  if (dueAt > now.getTime()) return { blocked: "not-due" };

  /*
   * The floor between two messages, whoever sent them.
   *
   * Measured from the last follow-up of any kind, so a salesperson who rang
   * and then wrote yesterday is not followed by the scheduler today. The step
   * is not consumed — it stays due and goes out once the gap has passed.
   */
  const last = quote.followUps.reduce<Date | null>(
    (latest, row) => (latest === null || row.sentAt > latest ? row.sentAt : latest),
    null,
  );
  if (last && now.getTime() - last.getTime() < settings.minimumGapDays * DAY) {
    return { blocked: "too-soon" };
  }

  return { step: next + 1 };
}

export type FollowUpResult =
  | { ok: true; reference: string; step: number | null }
  | { ok: false; reason: string };

/**
 * Writes the record, then sends the message.
 *
 * That order matters and is not the intuitive one. If the record is written
 * first and the send fails, the worst case is a chase that never went out and a
 * row saying it was not delivered — visible, and recoverable by sending
 * another. If the message is sent first and the write fails, the customer has
 * been chased and this application does not know, which is how a customer gets
 * chased twice for the same thing.
 */
async function deliverFollowUp(
  quote: FollowUpQuote,
  options: { kind: QuoteFollowUpKind; step: number | null; note: string | null; actorId: string | null },
): Promise<FollowUpResult> {
  const recipient = quote.enquiry?.contactEmail;
  if (!recipient || !quote.sentAt) {
    return { ok: false, reason: "That quotation has no contact address to write to." };
  }

  let record;
  try {
    record = await prisma.quoteFollowUp.create({
      data: {
        quoteId: quote.id,
        kind: options.kind,
        step: options.step,
        toEmail: recipient,
        note: options.note,
        sentById: options.actorId,
      },
      select: { id: true },
    });
  } catch {
    /*
     * The unique index did its job: another run took this step. Not an error
     * worth reporting upwards — the customer is being chased exactly once,
     * which is what was wanted.
     */
    return { ok: false, reason: "That follow-up has already been sent." };
  }

  const config = await getSiteConfig();
  const input: QuoteFollowUpInput = {
    reference: quote.reference,
    currency: quote.currency,
    totalMinor: quote.totalMinor,
    validUntil: quote.validUntil,
    sentAt: quote.sentAt,
    customer: { name: quote.enquiry?.contactName ?? null, email: recipient },
    quoteUrl: `${appUrl()}/account/quotes/${quote.reference}`,
    step: options.step,
    note: options.note,
    sender: quote.owner ? { name: quote.owner.name } : null,
    config,
  };

  /*
   * Copied to the same address every quotation is copied to.
   *
   * A follow-up is part of the same correspondence as the document it chases,
   * and a business that wants its sales inbox on the quotation wants it on the
   * reminder too — otherwise the thread in that mailbox stops halfway.
   */
  const copyTo = (await getMailConfig()).quoteCopy;

  const { delivered } = await sendMail({
    to: recipient,
    ...(copyTo && copyTo.toLowerCase() !== recipient.toLowerCase() ? { cc: [copyTo] } : {}),
    subject: quoteFollowUpSubject(input),
    text: quoteFollowUpText(input),
    html: quoteFollowUpHtml(input),
  });

  await prisma.quoteFollowUp.update({ where: { id: record.id }, data: { delivered } });

  logger.info("quote_follow_up_sent", {
    reference: quote.reference,
    kind: options.kind,
    step: options.step,
    delivered,
  });

  return { ok: true, reference: quote.reference, step: options.step };
}

/**
 * Sends a follow-up because somebody here decided to, now.
 *
 * The checks are the same ones the scheduler applies, minus the timing: staff
 * may chase whenever they judge it useful, but not on a quotation that has been
 * answered, expired or has nowhere to go. Pausing does not block this either —
 * see the column's comment.
 */
export async function sendManualFollowUp(
  reference: string,
  actorId: string,
  note: string | null,
): Promise<FollowUpResult> {
  const quote = (await prisma.quote.findUnique({
    where: { reference },
    select: followUpSelect,
  })) as FollowUpQuote | null;

  if (!quote) return { ok: false, reason: "That quotation no longer exists." };

  const blocked = followUpBlock(quote, new Date());
  if (blocked) return { ok: false, reason: blockReason(blocked) };

  return deliverFollowUp(quote, { kind: "MANUAL", step: null, note, actorId });
}

/** The same blocks, in words for a person reading the panel. */
export function blockReason(block: FollowUpBlock): string {
  switch (block) {
    case "not-sent":
      return "Only a quotation that has been sent and is still open can be followed up.";
    case "answered":
      return "That quotation has already been answered.";
    case "expired":
      return "That quotation has expired. Raise a revision rather than chasing pricing that no longer stands.";
    case "paused":
      return "Automatic follow-ups are paused on this quotation.";
    case "no-address":
      return "That quotation has no contact address to write to.";
    case "customer-replied":
      return "The customer has written on this quotation, so the schedule has stopped.";
    case "schedule-complete":
      return "Every follow-up on the schedule has been sent.";
    case "too-soon":
      return "A follow-up went out too recently to send another.";
    case "not-due":
      return "The next follow-up is not due yet.";
  }
}

export type FollowUpRun = {
  expired: number;
  considered: number;
  sent: number;
  failed: number;
  skipped: boolean;
};

/**
 * One pass of the schedule. Point a scheduler at the route that calls this.
 *
 * Expiry runs first and is not optional: a quotation whose validity lapsed
 * overnight must be marked expired *before* the query that decides who to
 * chase, or the run will send a reminder about pricing that stopped standing a
 * few hours earlier.
 */
export async function runQuoteFollowUps(now = new Date()): Promise<FollowUpRun> {
  const expired = await expireStaleQuotes();
  const settings = await getFollowUpSettings();

  if (!settings.enabled || settings.schedule.length === 0) {
    return { expired, considered: 0, sent: 0, failed: 0, skipped: true };
  }

  /*
   * Everything still open and old enough for the first step, narrowed in the
   * database as far as it can be and decided in `dueStep` after that. The
   * remaining conditions — which steps have gone, when the last one went,
   * whether the customer has written — are per-row arithmetic rather than
   * something to express as SQL, and the population here is small: quotations
   * sent, unanswered, and inside their validity.
   */
  const earliest = settings.schedule[0]!;
  const candidates = (await prisma.quote.findMany({
    where: {
      status: "SENT",
      followUpsPausedAt: null,
      sentAt: { not: null, lte: new Date(now.getTime() - earliest * DAY) },
      OR: [{ validUntil: null }, { validUntil: { gt: now } }],
    },
    select: followUpSelect,
    orderBy: { sentAt: "asc" },
  })) as FollowUpQuote[];

  let sent = 0;
  let failed = 0;

  for (const quote of candidates) {
    const due = dueStep(quote, settings, now);
    if ("blocked" in due) continue;

    /*
     * Re-read immediately before sending.
     *
     * The list above was assembled at the top of the run, and a run can take
     * a while when there are many. A quotation accepted, declined or paused in
     * between must not be chased, and the cheapest way to be sure is to ask
     * again rather than to reason about how long the loop took.
     */
    const fresh = (await prisma.quote.findUnique({
      where: { id: quote.id },
      select: followUpSelect,
    })) as FollowUpQuote | null;
    if (!fresh) continue;

    const stillDue = dueStep(fresh, settings, new Date());
    if ("blocked" in stillDue) continue;

    const result = await deliverFollowUp(fresh, {
      kind: "AUTOMATIC",
      step: stillDue.step,
      note: null,
      actorId: null,
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { expired, considered: candidates.length, sent, failed, skipped: false };
}
