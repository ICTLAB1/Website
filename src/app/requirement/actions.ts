"use server";

import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { canTransact } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/audit";
import { createRequirement } from "@/lib/requirement-service";
import {
  REQUIREMENT_LINE_SLOTS,
  requirementSchema,
  type RequirementLine,
  type RequirementState,
} from "@/lib/rfq";
import { emailSchema, fieldErrorsOf, phoneSchema } from "@/lib/validation";

/**
 * Submitting a requirement.
 *
 * The form is deliberately forgiving: three line slots, of which one must be
 * filled, and every specification optional. A procurement officer who knows
 * they need "twenty laptops for the architects" and nothing else about them
 * still has a requirement worth quoting, and a form that refuses it until they
 * pick a processor is a form that loses the order to a phone call.
 *
 * Open to visitors who are not signed in, like the enquiry basket and the
 * contact form: making somebody register before they can ask a question is how
 * a supplier finds out about a tender after it closed.
 */

const contactSchema = z.object({
  contactName: z.string().trim().min(2, "Enter your name.").max(120),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  companyName: z.string().trim().min(2, "Enter your organisation.").max(160),
  gstin: z.string().trim().max(15).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

/** Reads one line slot, or null when the slot was left empty. */
function readLine(formData: FormData, index: number): unknown | null {
  const description = String(formData.get(`lines.${index}.description`) ?? "").trim();
  if (description.length === 0) return null;

  const quantityRaw = String(formData.get(`lines.${index}.quantity`) ?? "").trim();
  const quantity = Number.parseInt(quantityRaw, 10);

  const optional = (name: string) => {
    const value = String(formData.get(`lines.${index}.${name}`) ?? "").trim();
    return value.length > 0 ? value : undefined;
  };

  const brands = String(formData.get(`lines.${index}.brands`) ?? "")
    .split(",")
    .map((brand) => brand.trim())
    .filter((brand) => brand.length > 0)
    .slice(0, 8);

  return {
    description,
    // A blank or unreadable quantity becomes 1 rather than an error: somebody
    // asking about "a server" has told us the quantity, in words.
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    brands,
    processor: optional("processor"),
    memory: optional("memory"),
    storage: optional("storage"),
    display: optional("display"),
    graphics: optional("graphics"),
    operatingSystem: optional("operatingSystem"),
    note: optional("note"),
    needsReview: false,
  } satisfies Partial<RequirementLine> & { description: string; quantity: number };
}

export async function submitRequirement(
  _previous: RequirementState,
  formData: FormData,
): Promise<RequirementState> {
  const user = await getSessionUser();
  const ip = await clientIp();

  const limit = hit(
    `requirement:${user?.id ?? ip ?? "anonymous"}`,
    LIMITS.enquiry.limit,
    LIMITS.enquiry.windowSeconds,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "You have sent several requirements recently. Please contact us directly if this is urgent.",
    };
  }

  /*
   * The same two gates the enquiry API applies, for the same reasons: an
   * unconfirmed address is a typo waiting to receive somebody else's quotation,
   * and a read-only colleague may not commit their organisation to anything.
   */
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
    city: formData.get("city"),
  });
  if (!contact.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(contact.error),
    };
  }

  const lines = Array.from({ length: REQUIREMENT_LINE_SLOTS }, (_, index) =>
    readLine(formData, index),
  ).filter((line) => line !== null);

  if (lines.length === 0) {
    return {
      status: "error",
      message: "Tell us what you need — at least one line.",
      fieldErrors: { "lines.0.description": ["Say what you need."] },
    };
  }

  const requirement = requirementSchema.safeParse({
    lines,
    deliveryLocation: String(formData.get("deliveryLocation") ?? "").trim() || undefined,
    requiredBy: String(formData.get("requiredBy") ?? "").trim() || undefined,
    budgetNote: String(formData.get("budgetNote") ?? "").trim() || undefined,
    context: String(formData.get("context") ?? "").trim() || undefined,
  });
  if (!requirement.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(requirement.error),
    };
  }

  const result = await createRequirement(requirement.data, contact.data, {
    // Never from the form: the organisation comes from the session or not at all.
    userId: user?.id ?? null,
    companyId: user?.companyId ?? null,
  });

  if (!result.ok) return { status: "error", message: result.message };

  await recordAudit({
    actorId: user?.id ?? null,
    action: "requirement.created",
    entityType: "Enquiry",
    entityId: result.reference,
    metadata: { lines: requirement.data.lines.length },
    ip,
  });

  return {
    status: "success",
    reference: result.reference,
    message: `Thank you — your reference is ${result.reference}. We have emailed a copy to ${contact.data.contactEmail}.`,
  };
}
