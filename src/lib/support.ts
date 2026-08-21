import type { TicketStatus } from "@prisma/client";

/**
 * What the support desk actually offers.
 *
 * One source of truth for both the public support page, which describes the
 * process, and the account page, where a ticket is raised. The two used to be
 * unrelated: the account form had its own list of categories, and the public
 * page described none — so the page a customer read before signing in could
 * promise anything without the form having to honour it.
 *
 * `TICKET_STATUSES` is typed against the Prisma `TicketStatus` enum, so
 * removing a status from the schema without removing it here will not compile.
 * A published status flow that names a state the database cannot hold is the
 * kind of small dishonesty this whole audit is about.
 */

export const TICKET_CATEGORIES = [
  { value: "LICENSING", label: "Licensing question" },
  { value: "BILLING", label: "Billing or invoice" },
  { value: "TECHNICAL", label: "Technical issue" },
  { value: "RENEWAL", label: "Renewal" },
  { value: "OTHER", label: "Something else" },
] as const;

/** In the order a ticket moves through them. */
export const TICKET_STATUSES: ReadonlyArray<{ value: TicketStatus; label: string; detail: string }> =
  [
    { value: "OPEN", label: "Open", detail: "Raised and waiting to be picked up." },
    { value: "IN_PROGRESS", label: "In progress", detail: "Being worked on." },
    {
      value: "WAITING_ON_CUSTOMER",
      label: "Waiting on you",
      detail: "We need something from you before we can go further.",
    },
    { value: "RESOLVED", label: "Resolved", detail: "Answered or fixed." },
    { value: "CLOSED", label: "Closed", detail: "Finished, and no longer being worked on." },
  ];
