"use server";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { canTransact } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/audit";
import { extractFromText } from "@/lib/boq";
import { MAX_DOCUMENT_BYTES, storeDocument } from "@/lib/documents";
import { createRequirement } from "@/lib/requirement-service";
import { requirementSchema, type RequirementState } from "@/lib/rfq";
import { emailSchema, fieldErrorsOf, phoneSchema } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * A requirement that arrives as a file.
 *
 * Two things happen, and the order matters. The document is stored first and
 * attached to the enquiry, so whatever the customer actually sent is on file
 * and readable by whoever quotes it. Only then is anything read out of it, and
 * only from delimited text — every line produced is marked as needing review,
 * because a quantity misread from a spreadsheet and quoted back as fact is
 * worse than not having read it at all.
 *
 * A PDF, a native spreadsheet or a photograph is stored and attached with no
 * extraction whatsoever. Nothing here guesses at a format it cannot actually
 * parse, and nothing invents a line item.
 */

const contactSchema = z.object({
  contactName: z.string().trim().min(2, "Enter your name.").max(120),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  companyName: z.string().trim().min(2, "Enter your organisation.").max(160),
  gstin: z.string().trim().max(15).optional().or(z.literal("")),
  context: z.string().trim().max(2000).optional().or(z.literal("")),
  requiredBy: z.string().trim().max(80).optional().or(z.literal("")),
  deliveryLocation: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function uploadRequirement(
  _previous: RequirementState,
  formData: FormData,
): Promise<RequirementState> {
  const user = await getSessionUser();
  const ip = await clientIp();

  const limit = hit(
    `boq:${user?.id ?? ip ?? "anonymous"}`,
    LIMITS.enquiry.limit,
    LIMITS.enquiry.windowSeconds,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "You have sent several requirements recently. Please contact us directly if this is urgent.",
    };
  }

  if (user && !(await canTransact(user))) {
    return {
      status: "error",
      message:
        "Please confirm your email address before sending a requirement. We have sent you a link; you can request another from your account.",
    };
  }
  if (user && !canInCompany(user, "enquiries.act")) {
    return {
      status: "error",
      message: "Your access is read-only. Ask a colleague with procurement access to send this.",
    };
  }

  const contact = contactSchema.safeParse({
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    companyName: formData.get("companyName"),
    gstin: String(formData.get("gstin") ?? "").toUpperCase(),
    context: formData.get("context"),
    requiredBy: formData.get("requiredBy"),
    deliveryLocation: formData.get("deliveryLocation"),
  });
  if (!contact.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(contact.error),
    };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "Choose the file to upload.",
      fieldErrors: { document: ["Choose a file."] },
    };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      status: "error",
      message: "That file is larger than 10 MB. Send us a link to it instead, or split it up.",
      fieldErrors: { document: ["Too large"] },
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  /*
   * Delimited text is the only thing read automatically, and only when the
   * bytes really are text. Everything else is stored and looked at by a person.
   */
  const isDelimited = /\.(csv|txt)$/i.test(file.name);
  const extraction = isDelimited ? extractFromText(buffer.toString("utf8")) : { lines: [], skipped: [] };

  const lines =
    extraction.lines.length > 0
      ? extraction.lines
      : [
          {
            description: `See the attached file: ${file.name.slice(0, 120)}`,
            quantity: 1,
            brands: [],
            needsReview: true,
          },
        ];

  const requirement = requirementSchema.safeParse({
    lines,
    requiredBy: contact.data.requiredBy || undefined,
    deliveryLocation: contact.data.deliveryLocation || undefined,
    context: contact.data.context || undefined,
  });
  if (!requirement.success) {
    logger.error("boq_requirement_invalid", { lines: lines.length });
    return {
      status: "error",
      message: "We could not read that file into a requirement. Send it to us by email and we will handle it.",
    };
  }

  const result = await createRequirement(requirement.data, contact.data, {
    userId: user?.id ?? null,
    companyId: user?.companyId ?? null,
    kind: "BOQ",
  });
  if (!result.ok) return { status: "error", message: result.message };

  const enquiry = await prisma.enquiry.findUnique({
    where: { reference: result.reference },
    select: { id: true },
  });

  const stored = await storeDocument({
    buffer,
    filename: file.name,
    kind: "BOQ",
    companyId: user?.companyId ?? null,
    userId: user?.id ?? null,
    enquiryId: enquiry?.id ?? null,
    note: extraction.skipped.length > 0 ? `${extraction.skipped.length} row(s) not read` : null,
  });

  if (!stored.ok) {
    /*
     * The requirement stands even when the file does not.
     *
     * Somebody has told us what they need and given us their details; losing
     * that because the attachment was a format we do not take would be the
     * wrong trade. The enquiry says the file is missing so whoever picks it up
     * asks for it.
     */
    await prisma.enquiry.update({
      where: { reference: result.reference },
      data: {
        internalNotes: `The customer's upload could not be stored (${stored.reason}). Ask them to resend it.`,
      },
    });
    logger.warn("boq_document_rejected", { reference: result.reference, reason: stored.reason });

    return {
      status: "success",
      reference: result.reference,
      message: `Your reference is ${result.reference}. We could not read that file format, so we will email you to ask for it in another form.`,
    };
  }

  await recordAudit({
    actorId: user?.id ?? null,
    action: "requirement.uploaded",
    entityType: "Enquiry",
    entityId: result.reference,
    metadata: { extracted: extraction.lines.length, skipped: extraction.skipped.length },
    ip,
  });

  const extracted =
    extraction.lines.length > 0
      ? ` We read ${extraction.lines.length} line${extraction.lines.length === 1 ? "" : "s"} from it, which we will confirm with you before quoting.`
      : "";

  return {
    status: "success",
    reference: result.reference,
    message: `Thank you — your reference is ${result.reference}.${extracted}`,
  };
}
