import "server-only";
import type { TicketStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { orgScope, type Scoped } from "@/lib/auth/scope";

/**
 * Support tickets, as a conversation rather than a form submission.
 *
 * Before this, raising a ticket was a one-way message: the customer typed
 * something, we replied by email, and the account showed a status that changed
 * for reasons nobody could see. The thread fixes the part that mattered — what
 * was actually said, by whom, and when — and it is the same thread on both
 * sides, so "we never got that reply" stops being arguable.
 *
 * `firstReplyAt` is set the first time somebody here writes on a ticket. It is
 * the only honest basis for a response-time figure, and it is recorded rather
 * than derived so that it cannot be improved retrospectively by editing
 * anything else.
 */

/** The columns every ticket view needs. */
const ticketSelect = {
  reference: true,
  subject: true,
  category: true,
  message: true,
  status: true,
  priority: true,
  createdAt: true,
  firstReplyAt: true,
  resolvedAt: true,
  user: { select: { name: true } },
  device: { select: { reference: true, brandName: true, model: true, serial: true } },
  messages: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      fromStaff: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  },
  documents: {
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      reference: true,
      kind: true,
      filename: true,
      bytes: true,
      note: true,
      verifiedAt: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  },
} as const;

/** One ticket, scoped in the lookup like every other account read. */
export async function getTicketFor(user: Scoped, reference: string) {
  return prisma.supportTicket.findFirst({
    where: { reference, ...orgScope(user) },
    select: ticketSelect,
  });
}

/** The same ticket for staff, who are not scoped to an organisation. */
export async function getTicketForStaff(reference: string) {
  return prisma.supportTicket.findUnique({
    where: { reference },
    select: {
      ...ticketSelect,
      id: true,
      companyId: true,
      company: { select: { name: true } },
    },
  });
}

/** Statuses on which a ticket is finished and no longer takes replies. */
export const CLOSED_STATUSES: TicketStatus[] = ["RESOLVED", "CLOSED"];

export function ticketIsClosed(status: TicketStatus | string): boolean {
  return CLOSED_STATUSES.includes(status as TicketStatus);
}

export type TicketWriteResult =
  | { ok: true; reference: string; ticketId: string }
  | { ok: false; reason: string };

/**
 * The customer writes on their own ticket.
 *
 * A reply from the customer reopens a ticket that was waiting on them — the
 * status said "waiting on customer" and the customer has now answered, so
 * leaving it there would hide the very thing it was flagging. A resolved or
 * closed ticket is not reopened by a message: that is a new problem, or the
 * same one recurring, and either way it deserves its own reference rather than
 * being appended to a thread somebody has already signed off.
 */
export async function addCustomerMessage(
  reference: string,
  user: Scoped,
  body: string,
): Promise<TicketWriteResult> {
  const ticket = await prisma.supportTicket.findFirst({
    where: { reference, ...orgScope(user) },
    select: { id: true, reference: true, status: true },
  });
  if (!ticket) return { ok: false, reason: "That ticket could not be found." };

  if (ticketIsClosed(ticket.status)) {
    return {
      ok: false,
      reason:
        "This ticket has been closed. Please raise a new one so it reaches somebody — replying here would go unnoticed.",
    };
  }

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: ticket.id, body, userId: user.id, fromStaff: false },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: ticket.status === "WAITING_ON_CUSTOMER" ? { status: "IN_PROGRESS" } : {},
    }),
  ]);

  return { ok: true, reference: ticket.reference, ticketId: ticket.id };
}

/**
 * Somebody here writes on a ticket.
 *
 * Not scoped: staff answer every organisation's tickets, which is the job. The
 * first such message stamps `firstReplyAt`, once and never again.
 */
export async function addStaffMessage(
  reference: string,
  staffId: string,
  body: string,
  options: { status?: TicketStatus } = {},
): Promise<TicketWriteResult> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { reference },
    select: { id: true, reference: true, status: true, firstReplyAt: true, resolvedAt: true },
  });
  if (!ticket) return { ok: false, reason: "That ticket could not be found." };

  const status = options.status ?? (ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status);

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: { ticketId: ticket.id, body, userId: staffId, fromStaff: true },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status,
        firstReplyAt: ticket.firstReplyAt ?? new Date(),
        /*
         * Stamped when it becomes resolved or closed, cleared if it is
         * reopened, so the column always means "closed as of this date" rather
         * than "was resolved once".
         *
         * Closing keeps a resolution date it already has — a ticket resolved on
         * Tuesday and closed on Friday was resolved on Tuesday — but stamps one
         * when there is none. A ticket taken straight from OPEN to CLOSED used
         * to end up closed with no closure date, which left it outside the
         * three-year retention period the privacy policy publishes: the period
         * runs from closure, and a closure with no date has nothing to count
         * from. See `src/lib/privacy/retention.ts`.
         */
        resolvedAt: closedAt(status, ticket.resolvedAt),
      },
    }),
  ]);

  return { ok: true, reference: ticket.reference, ticketId: ticket.id };
}

/**
 * What `resolvedAt` becomes when a ticket moves to `status`.
 *
 * Separate from the update so it can be tested without a database, because the
 * three cases are easy to collapse into two by accident and the one that gets
 * lost is the one nothing notices.
 */
export function closedAt(
  status: TicketStatus,
  current: Date | null,
  now: Date = new Date(),
): Date | null {
  if (status === "RESOLVED") return now;
  if (status === "CLOSED") return current ?? now;
  return null;
}

/**
 * How long a ticket waited for its first reply, in hours.
 *
 * Null while nobody has replied. Deliberately not "0 hours": an unanswered
 * ticket has no response time, and reporting one as instant would be a lie
 * that flatters us.
 */
export function firstReplyHours(ticket: {
  createdAt: Date | string;
  firstReplyAt?: Date | string | null;
}): number | null {
  if (!ticket.firstReplyAt) return null;
  const raised = new Date(ticket.createdAt).getTime();
  const replied = new Date(ticket.firstReplyAt).getTime();
  if (Number.isNaN(raised) || Number.isNaN(replied)) return null;
  return Math.max(0, Math.round(((replied - raised) / (60 * 60 * 1000)) * 10) / 10);
}
