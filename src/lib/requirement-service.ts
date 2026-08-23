import "server-only";

import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { escapeHtml, salesInbox, sendMail } from "@/lib/mail";
import { getSiteConfig } from "@/lib/site-config";
import { logger } from "@/lib/logger";
import type { Requirement, RequirementLine } from "@/lib/rfq";
import type { Prisma } from "@prisma/client";

/**
 * A requirement described rather than picked.
 *
 * The enquiry basket assumes the customer already knows which products they
 * want, which is true of licence renewals and almost never true of anything
 * else. "Fifty laptops for the sales team, 16 GB, by the end of the quarter" is
 * how procurement actually starts, and until now this site had nowhere to put
 * it — so that customer either guessed at the catalogue or rang somebody.
 *
 * Stored as an `Enquiry` rather than as a new model on purpose: it goes through
 * the same statuses, becomes the same quotation, and appears in the same list
 * as everything else. A parallel pipeline for requirements would double every
 * screen and split the sales team's attention across two inboxes.
 */

export type RequirementContact = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  gstin?: string | null;
  city?: string | null;
  country?: string | null;
};

export type RequirementResult = { ok: true; reference: string } | { ok: false; message: string };

export async function createRequirement(
  requirement: Requirement,
  contact: RequirementContact,
  context: { userId?: string | null; companyId?: string | null; kind?: "REQUIREMENT" | "BOQ" },
): Promise<RequirementResult> {
  if (requirement.lines.length === 0) {
    return { ok: false, message: "Add at least one line to your requirement." };
  }

  const reference = publicReference("ENQ");

  /*
   * The summary that goes in `requirements`.
   *
   * Duplication with the JSON payload, deliberately: every existing screen,
   * email and export reads that text column, and a requirement that renders as
   * an empty enquiry everywhere except one new page would be worse than one
   * that is slightly redundant. The JSON is the structured truth; this is the
   * sentence.
   */
  const summary = describeRequirement(requirement);

  const enquiry = await prisma.enquiry.create({
    data: {
      reference,
      kind: context.kind ?? "REQUIREMENT",
      status: "SUBMITTED",
      submittedAt: new Date(),
      requirement: requirement as unknown as Prisma.InputJsonValue,
      contactName: contact.contactName,
      contactEmail: contact.contactEmail,
      contactPhone: contact.contactPhone,
      companyName: contact.companyName,
      gstin: contact.gstin || null,
      city: contact.city || null,
      country: contact.country || "India",
      requirements: summary,
      // The quantity a requirement is really about is per line; the top-level
      // count exists for the basket and is left alone rather than guessed at.
      userId: context.userId ?? null,
      companyId: context.companyId ?? null,
    },
    select: { reference: true },
  });

  logger.info("requirement_created", {
    reference: enquiry.reference,
    lines: requirement.lines.length,
    needsReview: requirement.lines.filter((line) => line.needsReview).length,
  });

  // Best-effort, after the record exists: a mail failure must not lose a
  // requirement somebody spent ten minutes writing.
  void notify(enquiry.reference, requirement, contact).catch((error) => {
    logger.error("requirement_notification_failed", {
      reference: enquiry.reference,
      message: error instanceof Error ? error.message : String(error),
    });
  });

  return { ok: true, reference: enquiry.reference };
}

/** One line as a sentence, e.g. "50 × laptops — Core Ultra 7, 16 GB, 512 GB". */
export function describeLine(line: RequirementLine): string {
  const specs = [
    line.processor,
    line.memory,
    line.storage,
    line.display,
    line.graphics,
    line.operatingSystem,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const brands = line.brands.length > 0 ? ` (${line.brands.join(", ")})` : "";
  const detail = specs.length > 0 ? ` — ${specs.join(", ")}` : "";
  const note = line.note ? ` — ${line.note}` : "";

  return `${line.quantity} × ${line.description}${brands}${detail}${note}`;
}

/** The whole requirement as text, for the columns and emails that hold text. */
export function describeRequirement(requirement: Requirement): string {
  const parts = [requirement.lines.map((line) => `• ${describeLine(line)}`).join("\n")];

  const facts = [
    requirement.requiredBy ? `Required by: ${requirement.requiredBy}` : null,
    requirement.deliveryLocation ? `Deliver to: ${requirement.deliveryLocation}` : null,
    requirement.budgetNote ? `Indicative budget: ${requirement.budgetNote}` : null,
  ].filter((line): line is string => line !== null);

  if (facts.length > 0) parts.push(facts.join("\n"));
  if (requirement.context) parts.push(requirement.context);

  return parts.join("\n\n");
}

async function notify(
  reference: string,
  requirement: Requirement,
  contact: RequirementContact,
): Promise<void> {
  const config = await getSiteConfig();
  const lines = requirement.lines.map((line) => `  • ${describeLine(line)}`).join("\n");
  const review = requirement.lines.filter((line) => line.needsReview).length;

  const internal = await salesInbox();
  if (internal) {
    await sendMail({
      to: internal,
      replyTo: contact.contactEmail,
      subject: `New requirement ${reference} — ${contact.companyName}`,
      text: [
        `Requirement reference: ${reference}`,
        "",
        `Company:   ${contact.companyName}`,
        `Contact:   ${contact.contactName}`,
        `Email:     ${contact.contactEmail}`,
        `Phone:     ${contact.contactPhone}`,
        contact.gstin ? `GSTIN:     ${contact.gstin}` : null,
        "",
        "What they need:",
        lines,
        "",
        requirement.requiredBy ? `Required by: ${requirement.requiredBy}` : null,
        requirement.deliveryLocation ? `Deliver to: ${requirement.deliveryLocation}` : null,
        requirement.budgetNote ? `Indicative budget: ${requirement.budgetNote}` : null,
        requirement.context ? `\nContext:\n${requirement.context}` : null,
        review > 0
          ? `\n${review} line(s) came from an uploaded document and have not been confirmed by the customer. Check them before quoting.`
          : null,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  }

  await sendMail({
    to: contact.contactEmail,
    subject: `We have received your requirement (${reference})`,
    text: [
      `Hello ${contact.contactName},`,
      "",
      `Thank you — your reference is ${reference}.`,
      "",
      "You asked us about:",
      lines,
      "",
      "We will come back to you with options and a written quotation. Nothing is ordered and nothing is charged at this stage.",
      "",
      config.tradingName,
      config.email.sales ?? "",
    ]
      .filter(Boolean)
      .join("\n"),
    html: [
      `<p>Hello ${escapeHtml(contact.contactName)},</p>`,
      `<p>Thank you — your reference is <strong>${escapeHtml(reference)}</strong>.</p>`,
      "<p>You asked us about:</p>",
      "<ul>",
      ...requirement.lines.map((line) => `<li>${escapeHtml(describeLine(line))}</li>`),
      "</ul>",
      "<p>We will come back to you with options and a written quotation. Nothing is ordered and nothing is charged at this stage.</p>",
      `<p>${escapeHtml(config.tradingName)}</p>`,
    ].join(""),
  });
}
