import { z } from "zod";
import type { EnquiryStatus } from "@prisma/client";

/**
 * Requirements: the shape, the wording and what may follow what.
 *
 * A requirement is the thing a customer actually has — "fifty laptops for the
 * sales team, Core Ultra, 16 GB, by the end of the quarter" — rather than a
 * list of part numbers. Most procurement starts here and only becomes a list of
 * products after somebody who knows the catalogue has read it, which is the
 * work this platform is for.
 */

// ------------------------------------------------------------ the payload ---

const text = (max: number) => z.string().trim().max(max);

/**
 * One line of a requirement.
 *
 * A requirement usually has more than one: laptops *and* the Microsoft 365 that
 * goes on them, quoted together. Each line carries what the customer knows and
 * nothing it does not — every specification field is optional, because
 * "twenty laptops for architects" is a real requirement and refusing it until
 * somebody picks a processor is how a form loses an order.
 */
export const requirementLineSchema = z.object({
  /** What it is, in the customer's words: "laptops", "Adobe Acrobat". */
  description: text(200).min(2, "Say what you need."),
  quantity: z.number().int().min(1, "How many?").max(100_000),
  /** Brands they would prefer, where they have a preference. */
  brands: z.array(text(60)).max(8).optional().default([]),
  processor: text(120).optional(),
  memory: text(60).optional(),
  storage: text(60).optional(),
  display: text(60).optional(),
  graphics: text(120).optional(),
  operatingSystem: text(80).optional(),
  /** Anything the fields above do not cover. */
  note: text(600).optional(),
  /**
   * Set when a line came out of an uploaded document rather than being typed.
   *
   * Extraction is never trusted: a line marked this way is shown as needing
   * review, and no quotation is produced from one until a person has confirmed
   * it. See the bill-of-quantities upload.
   */
  needsReview: z.boolean().optional().default(false),
});

export type RequirementLine = z.infer<typeof requirementLineSchema>;

export const requirementSchema = z.object({
  lines: z.array(requirementLineSchema).min(1, "Add at least one line.").max(60),
  /** Where it is going, in the customer's words. */
  deliveryLocation: text(200).optional(),
  /** When they need it. A date, or a phrase like "end of Q3". */
  requiredBy: text(80).optional(),
  /**
   * An indicative budget, as typed.
   *
   * Free text and not money: a customer writing "around 25 lakh" is giving us
   * something useful, and a numeric field would either reject it or force them
   * to invent a precision they do not have. Nothing computes on it.
   */
  budgetNote: text(120).optional(),
  /** Anything else: standards to meet, a tender to answer, an existing estate. */
  context: text(2000).optional(),
});

export type Requirement = z.infer<typeof requirementSchema>;

/** Parses a stored payload, returning null rather than throwing. */
export function parseRequirement(value: unknown): Requirement | null {
  const parsed = requirementSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// ------------------------------------------------------------- the states ---

/**
 * What each status is called where a customer can see it.
 *
 * Deliberately not the enum member with the underscores taken out: "needs
 * information" is what it is called internally and "we need something from you"
 * is what it means to the person waiting, and only one of those belongs on
 * their screen.
 */
export const RFQ_STATUS_LABELS: Record<EnquiryStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  NEEDS_INFORMATION: "We need something from you",
  QUOTATION_PREPARING: "Quotation being prepared",
  QUOTATION_SENT: "Quotation sent",
  ACCEPTED: "Accepted",
  REJECTED: "Not proceeding",
  EXPIRED: "Expired",
  CONVERTED_TO_ORDER: "Converted to order",
  CLOSED: "Closed",
};

/** The same states, described for whoever is working on them. */
export const RFQ_STATUS_HINTS: Record<EnquiryStatus, string> = {
  DRAFT: "Started and not submitted. Nobody here has seen it.",
  SUBMITTED: "Received. Nobody has picked it up yet.",
  UNDER_REVIEW: "Somebody is reading it and working out what it needs.",
  NEEDS_INFORMATION: "We have asked the customer something and are waiting.",
  QUOTATION_PREPARING: "Being priced.",
  QUOTATION_SENT: "The quotation has gone out and is with the customer.",
  ACCEPTED: "The customer has accepted a quotation against it.",
  REJECTED: "The customer is not proceeding.",
  EXPIRED: "Nothing happened for long enough that the pricing no longer stands.",
  CONVERTED_TO_ORDER: "It became an order.",
  CLOSED: "Finished with, for any other reason.",
};

/** Statuses that are still live work. */
export const RFQ_OPEN_STATUSES: EnquiryStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_INFORMATION",
  "QUOTATION_PREPARING",
  "QUOTATION_SENT",
];

export const RFQ_STATUSES: EnquiryStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "NEEDS_INFORMATION",
  "QUOTATION_PREPARING",
  "QUOTATION_SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED_TO_ORDER",
  "CLOSED",
];

/**
 * Which statuses a member of staff may move a requirement to.
 *
 * Two are missing from every list on purpose. `DRAFT` is not a destination:
 * once a customer has submitted something, nobody here may put it back to
 * "never submitted". `CONVERTED_TO_ORDER` is set by the order being raised, not
 * by somebody choosing it from a menu — a status that says an order exists must
 * only be reachable by an order existing.
 */
export function allowedTransitions(from: EnquiryStatus): EnquiryStatus[] {
  const working: EnquiryStatus[] = [
    "UNDER_REVIEW",
    "NEEDS_INFORMATION",
    "QUOTATION_PREPARING",
    "QUOTATION_SENT",
    "REJECTED",
    "EXPIRED",
    "CLOSED",
  ];

  switch (from) {
    case "DRAFT":
      // Somebody else's unsent draft. Staff may close it and nothing else.
      return ["CLOSED"];
    case "CONVERTED_TO_ORDER":
      // The order is the record now. Reopening the requirement it came from
      // would leave two things claiming to be the state of the same deal.
      return [];
    case "ACCEPTED":
      return ["CONVERTED_TO_ORDER", "CLOSED"];
    default:
      return working.filter((status) => status !== from);
  }
}

/** Whether a status change is one the interface is allowed to make. */
export function canTransition(from: EnquiryStatus, to: EnquiryStatus): boolean {
  return allowedTransitions(from).includes(to);
}

// ------------------------------------------------------ the public form ---

/**
 * How many line slots the requirement form offers.
 *
 * Lives here rather than beside the action because a `"use server"` module may
 * only export async functions, and because the page, the form and the action
 * all have to agree on one number.
 */
export const REQUIREMENT_LINE_SLOTS = 3;

/** What the requirement form gets back from its action. */
export type RequirementState = {
  status: "idle" | "success" | "error";
  message?: string;
  reference?: string;
  fieldErrors?: Record<string, string[]>;
};
