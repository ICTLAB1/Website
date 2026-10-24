import "server-only";

import { prisma } from "@/lib/db";
import { CLOSED_STATUSES } from "@/lib/ticket-service";
import { addMonthsUtc } from "@/lib/utils";

/**
 * Deleting what we have promised to delete.
 *
 * ## Why this file exists
 *
 * The privacy policy publishes a retention table — seven rows, each with a
 * period — and then says, of everything outside a statutory minimum, that it
 * "can be, and is" deleted. Until this file there was nothing in the codebase
 * that deleted any of it. That is not a cosmetic gap: under the Digital
 * Personal Data Protection Act, 2023 a published retention period is a
 * commitment to the person whose data it is, and a commitment nothing
 * implements is a false statement on a public page.
 *
 * ## Three of the seven rows, and why only three
 *
 * | Published row | Here |
 * | --- | --- |
 * | Enquiries that did not lead to an order — 3 years from last contact | yes |
 * | Support tickets — 3 years from closure | yes |
 * | Security and audit logs — 12 months | yes |
 * | Quotations, orders, invoices, licences — 8 years | no: a floor, not a ceiling |
 * | GST records — 72 months from the annual return | no: as above, and the clock starts at a return this application does not hold |
 * | Account and profile data — life of the account, then 12 months | no: needs account closure, which does not exist yet |
 * | Server request logs — 90 days | no: not in this database |
 *
 * The two commercial rows are statutory *minimums*. The policy says so in as
 * many words — "an invoice cannot be deleted from the books because its
 * recipient asked" — so a job that deleted an eight-year-old invoice would be
 * implementing a sentence the policy does not contain. They are reported here
 * as `floor` rules so the table is visibly complete and nobody has to work out
 * from the absence whether they were forgotten.
 *
 * ## Reporting by default
 *
 * `runRetention()` deletes nothing. It counts what is eligible and what is
 * held back, and returns that. Deleting requires `apply: true` at the call
 * site, which the route only passes when the caller asks for it.
 *
 * This is not timidity about the feature; it is the only safe way to turn it
 * on. The first run against production meets a database nobody has ever
 * applied a retention rule to, so every eligible row is from the backlog
 * rather than from the day's traffic, and the count is the only evidence of
 * whether the rules say what their authors meant. A dry run that reports
 * "4,812 enquiries" is a conversation; the same run with `apply` is an
 * irreversible one.
 *
 * ## What is held back, and why that is not a bug
 *
 * Every relation from an enquiry or a ticket to a commercial record is
 * `onDelete: SetNull`, so deleting an enquiry does not cascade into
 * quotations, orders, deals or documents — it orphans them. An orphaned
 * quotation is a document that can still be printed but can no longer be
 * traced to the request it answered, which is worse than keeping the enquiry:
 * the quotation itself is held for eight years either way.
 *
 * So an enquiry carrying a quotation, a deal or an uploaded document is held
 * back, and the policy supports that reading rather than straining it — an
 * enquiry that produced a quotation is the first step of a commercial record,
 * and the row is about enquiries that "did not lead to an order". Tickets are
 * held back for an attached document for the same reason.
 *
 * Held-back rows are counted and reported, not silently skipped. A number that
 * does not fall is how you discover a rule that can never fire.
 */

export type RetentionRuleId = "enquiries" | "support-tickets" | "audit-logs" | "chat-conversations";

export type RetentionRule = {
  id: RetentionRuleId;
  /** The row of the published table this implements, verbatim. */
  published: string;
  /** How long, in months, counted from the date named in `measuredFrom`. */
  months: number;
  /** Which date the period runs from, in the words the policy uses. */
  measuredFrom: string;
};

/**
 * The implemented rules. Months rather than days throughout, because the
 * policy is written in years and months and 36 months is what "3 years" means
 * to the person reading the page — not 1,095 days, which is a different date in
 * three out of every four windows.
 */
export const RETENTION_RULES: RetentionRule[] = [
  {
    id: "enquiries",
    published: "Enquiries that did not lead to an order — 3 years from last contact",
    months: 36,
    measuredFrom: "last contact",
  },
  {
    id: "support-tickets",
    published: "Support tickets — 3 years from closure",
    months: 36,
    measuredFrom: "closure",
  },
  {
    id: "audit-logs",
    published: "Security and audit logs — 12 months",
    months: 12,
    measuredFrom: "the entry being written",
  },
  {
    id: "chat-conversations",
    published: "Chat conversations with the assistant — 12 months",
    months: 12,
    measuredFrom: "the last message",
  },
];

/**
 * The rows of the published table that are deliberately not deleted, with the
 * reason, so the report accounts for all seven.
 */
export const RETENTION_FLOORS = [
  {
    published: "Quotations, orders, invoices and licence records — 8 years — Companies Act, 2013",
    held: "a statutory minimum, not an expiry: the policy says these cannot be shortened on request",
  },
  {
    published: "GST records — 72 months from the annual return — CGST Act, 2017",
    held: "as above, and the period runs from an annual return this application does not hold",
  },
  {
    published: "Account and profile data — for the life of the account, then 12 months",
    held: "needs an account-closure date; accounts are not closeable yet",
  },
  {
    published: "Server request logs — 90 days",
    held: "held by the reverse proxy and the host, not in this database",
  },
] as const;

export type RetentionRuleReport = {
  id: RetentionRuleId;
  published: string;
  /** Rows older than this are in scope. */
  cutoff: string;
  /** In scope and safe to delete. */
  eligible: number;
  /** In scope but kept, because deleting would orphan a commercial record. */
  heldBack: number;
  /** Actually deleted. Zero on a dry run. */
  deleted: number;
};

export type RetentionRun = {
  ranAt: string;
  /** False only when the caller explicitly asked to delete. */
  dryRun: boolean;
  rules: RetentionRuleReport[];
  floors: typeof RETENTION_FLOORS;
};

/**
 * The instant a rule's period reaches back to. Midnight UTC, from
 * `addMonthsUtc`, so a run at 02:00 and a run at 23:00 on the same day select
 * the same rows — a retention job whose results depend on the hour it happened
 * to run is one nobody can check.
 */
export function cutoffFor(rule: RetentionRule, now: Date): Date {
  return addMonthsUtc(now, -rule.months);
}

/** Enquiries with nothing commercial hanging off them. */
const DELETABLE_ENQUIRY = {
  quotes: { none: {} },
  deals: { none: {} },
  documents: { none: {} },
} as const;

/** Tickets with no uploaded document to orphan. */
const DELETABLE_TICKET = { documents: { none: {} } } as const;

async function runEnquiries(cutoff: Date, apply: boolean) {
  /*
   * `updatedAt` is "last contact". It is not a perfect reading of the phrase —
   * it also moves when staff edit an internal note — but every movement is a
   * member of this business touching the record, and each one pushes the
   * deletion further out rather than nearer. An imprecision that only ever
   * keeps data longer is the right direction for the imprecision to run.
   */
  const inScope = { updatedAt: { lt: cutoff } };

  const [eligible, total] = await Promise.all([
    prisma.enquiry.count({ where: { ...inScope, ...DELETABLE_ENQUIRY } }),
    prisma.enquiry.count({ where: inScope }),
  ]);

  let deleted = 0;
  if (apply && eligible > 0) {
    ({ count: deleted } = await prisma.enquiry.deleteMany({
      where: { ...inScope, ...DELETABLE_ENQUIRY },
    }));
  }

  return { eligible, heldBack: total - eligible, deleted };
}

async function runSupportTickets(cutoff: Date, apply: boolean) {
  /*
   * Closure, read off `resolvedAt` rather than the status alone: a ticket
   * marked CLOSED with no resolution date has no date for the period to run
   * from, and guessing one from `updatedAt` would delete it on the strength of
   * a guess. It stays, and shows up in neither count, which is correct —
   * nothing about it is three years past a closure that was never recorded.
   */
  const inScope = {
    status: { in: CLOSED_STATUSES },
    resolvedAt: { not: null, lt: cutoff },
  };

  const [eligible, total] = await Promise.all([
    prisma.supportTicket.count({ where: { ...inScope, ...DELETABLE_TICKET } }),
    prisma.supportTicket.count({ where: inScope }),
  ]);

  let deleted = 0;
  if (apply && eligible > 0) {
    ({ count: deleted } = await prisma.supportTicket.deleteMany({
      where: { ...inScope, ...DELETABLE_TICKET },
    }));
  }

  return { eligible, heldBack: total - eligible, deleted };
}

async function runAuditLogs(cutoff: Date, apply: boolean) {
  /*
   * Nothing holds an audit entry back. It references a user with SetNull and
   * is referenced by nothing, and the policy's twelve months is a ceiling
   * rather than a floor — an audit log kept for five years is itself a
   * retention breach, not diligence.
   */
  const inScope = { createdAt: { lt: cutoff } };

  const eligible = await prisma.auditLog.count({ where: inScope });

  let deleted = 0;
  if (apply && eligible > 0) {
    ({ count: deleted } = await prisma.auditLog.deleteMany({ where: inScope }));
  }

  return { eligible, heldBack: 0, deleted };
}

async function runChatConversations(cutoff: Date, apply: boolean) {
  /*
   * Measured from the last message rather than the first, because a
   * conversation resumed after a month is a month old, not two.
   *
   * Nothing holds one back. The transcript of a conversation that became a
   * lead is also copied onto the deal as an Activity when the lead is
   * captured, and that copy lives under the commercial retention period where
   * it belongs; this row is the observational one and twelve months of it is
   * a ceiling rather than a floor. `leadReference` is a string rather than a
   * relation precisely so this deletion can never reach a commercial record.
   */
  const inScope = { updatedAt: { lt: cutoff } };

  const eligible = await prisma.chatConversation.count({ where: inScope });

  let deleted = 0;
  if (apply && eligible > 0) {
    ({ count: deleted } = await prisma.chatConversation.deleteMany({ where: inScope }));
  }

  return { eligible, heldBack: 0, deleted };
}

const RUNNERS: Record<RetentionRuleId, (cutoff: Date, apply: boolean) => Promise<{
  eligible: number;
  heldBack: number;
  deleted: number;
}>> = {
  enquiries: runEnquiries,
  "support-tickets": runSupportTickets,
  "audit-logs": runAuditLogs,
  "chat-conversations": runChatConversations,
};

/**
 * Report what the published retention periods cover, and — only when asked —
 * delete it.
 *
 * Rules run one after another rather than in parallel, and each is counted
 * immediately before it deletes. A run that fails halfway has applied the
 * rules it reached and reports them; there is no transaction around the whole
 * thing, because wrapping three independent deletions of thousands of rows in
 * one transaction buys atomicity nobody needs and holds locks on `Enquiry`
 * while the audit table is being swept.
 */
export async function runRetention(
  options: { apply?: boolean; now?: Date } = {},
): Promise<RetentionRun> {
  const apply = options.apply === true;
  const now = options.now ?? new Date();

  const rules: RetentionRuleReport[] = [];
  for (const rule of RETENTION_RULES) {
    const cutoff = cutoffFor(rule, now);
    const outcome = await RUNNERS[rule.id](cutoff, apply);
    rules.push({
      id: rule.id,
      published: rule.published,
      cutoff: cutoff.toISOString(),
      ...outcome,
    });
  }

  return { ranAt: now.toISOString(), dryRun: !apply, rules, floors: RETENTION_FLOORS };
}
