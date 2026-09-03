"use server";

import { revalidatePath } from "next/cache";
import { notifyOrderStatus, notifyTicketUpdated } from "@/lib/emails/transactional";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { fieldErrorsOf } from "@/lib/validation";
import {
  createQuoteFromEnquiry,
  recalculateQuote,
  sendQuote,
  variantUnitPrice,
} from "@/lib/quote-service";
import { addQuoteMessage, reviseQuote } from "@/lib/quote-revision";
import { sendManualFollowUp } from "@/lib/quotes/follow-ups";
import { fulfilOrder } from "@/lib/order-service";
import {
  discountFromPercent,
  documentTotals,
  lineIsStorable,
  priceLine,
  totalsAreStorable,
} from "@/lib/pricing";
import type { AdminActionState } from "@/app/admin/actions";

/**
 * Quotation and order administration.
 *
 * Every action re-checks the staff role on the server. Line pricing is
 * recomputed by the pricing engine on write, so a hand-edited form field cannot
 * put a quotation into a state where its header disagrees with its lines.
 */

const referenceSchema = (prefix: string) =>
  z.string().trim().regex(new RegExp(`^${prefix}-\\d{4}-[A-Z0-9]{6}$`), "Invalid reference.");

async function guard(): Promise<{ id: string } | AdminActionState> {
  const staff = await requireStaff();
  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }
  return { id: staff.id };
}

function isFailure(value: { id: string } | AdminActionState): value is AdminActionState {
  return "status" in value;
}

/** Drafts a quotation from an enquiry and opens it for editing. */
export async function draftQuote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = referenceSchema("ENQ").safeParse(formData.get("reference"));
  if (!parsed.success) return { status: "error", message: "That enquiry reference is not valid." };

  const result = await createQuoteFromEnquiry(parsed.data, staff.id);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_drafted",
    entityType: "Quote",
    entityId: result.reference,
    metadata: { enquiry: parsed.data },
    ip: await clientIp(),
  });

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${result.reference}`);
}

const lineSchema = z.object({
  itemId: z.string().trim().min(1),
  /*
   * The name as printed, which is not always the name in the catalogue.
   *
   * A quotation line already carries its own copy of the name rather than
   * reading it back through the product, so that renaming a product next March
   * cannot change what a quotation said last October. This makes that copy
   * editable, which is what the copy was for: a tender wants the name written
   * the way the tender writes it, a re-badged part is sold under a different
   * description, and a service line has no catalogue row behind it at all.
   *
   * Required, unlike the optional columns below. Those clear to null and print
   * nothing; a line with no name prints a blank row, so an empty value is a
   * mistake rather than an instruction.
   */
  productName: z.string().trim().min(1, "A line needs a name.").max(200),
  /*
   * The columns the printed document carries beside the price.
   *
   * Editable here because the catalogue does not always have them and a
   * salesperson often does: a service line has no product row to inherit an SAC
   * code from, and a re-badged part number differs from the catalogue's.
   */
  description: z.string().trim().max(300).optional(),
  brandName: z.string().trim().max(80).optional(),
  hsnCode: z
    .string()
    .trim()
    .max(12)
    .regex(/^[0-9]*$/, "An HSN or SAC code is digits only.")
    .optional(),
  unitLabel: z.string().trim().max(24).optional(),
  quantity: z.coerce.number().int().min(1).max(100_000),
  unitPrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 1250 or 1250.50")
    .transform((value) => Math.round(Number(value) * 100)),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
});

/*
 * A line added by hand, which is most of them after the first draft.
 *
 * A quotation is drafted from what the customer asked for and then almost
 * always grows: the licences they did not know they needed, the migration
 * service that goes with them, the freight. Until now the only way to add one
 * was to send the customer back to the catalogue to enquire again, which is not
 * something a salesperson can ask of somebody who has just given them a
 * requirement over the telephone.
 *
 * Two kinds of line, one form. Give a SKU and the catalogue fills in the name,
 * the price, the tax rate, the HSN code and the unit — the same values, from
 * the same rules, as drafting from an enquiry. Leave it blank and it is a free
 * line: a service, a re-badged part, a delivery charge, none of which has a
 * catalogue row and all of which belong on quotations.
 *
 * Anything typed wins over anything looked up, because the person quoting knows
 * things the catalogue does not.
 */
const newLineSchema = z.object({
  reference: referenceSchema("QTE"),
  /** Empty for a free line. Matched against the catalogue exactly, case-insensitively. */
  sku: z.string().trim().max(64).optional(),
  productName: z.string().trim().max(200).optional(),
  description: z.string().trim().max(300).optional(),
  brandName: z.string().trim().max(80).optional(),
  hsnCode: z
    .string()
    .trim()
    .max(12)
    .regex(/^[0-9]*$/, "An HSN or SAC code is digits only.")
    .optional(),
  unitLabel: z.string().trim().max(24).optional(),
  quantity: z.coerce.number().int().min(1).max(100_000),
  /*
   * Optional, unlike on an edit. Blank against a SKU means "whatever the
   * catalogue says today", which is the common case and saves retyping a figure
   * that is already on the screen. Blank without one is zero — a placeholder
   * line somebody is about to price, which is exactly what drafting from an
   * enquiry produces for an item with no variant.
   */
  unitPrice: z
    .string()
    .trim()
    .regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount such as 1250 or 1250.50")
    .optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  /** Overrides the catalogue rate, and is the only way to set one on a free line. */
  gstRatePercent: z.coerce.number().int().min(0).max(100).optional(),
});

/** Adds a line to a draft quotation, from the catalogue or by hand. */
export async function addQuoteLine(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = newLineSchema.safeParse({
    reference: formData.get("reference"),
    sku: formData.get("sku"),
    productName: formData.get("productName"),
    description: formData.get("description"),
    brandName: formData.get("brandName"),
    hsnCode: formData.get("hsnCode"),
    unitLabel: formData.get("unitLabel"),
    quantity: formData.get("quantity") || 1,
    unitPrice: formData.get("unitPrice"),
    discountPercent: formData.get("discountPercent") || 0,
    gstRatePercent: formData.get("gstRatePercent") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const quote = await prisma.quote.findUnique({
    where: { reference: parsed.data.reference },
    select: {
      id: true,
      reference: true,
      status: true,
      items: {
        select: {
          unitPriceMinor: true,
          quantity: true,
          discountMinor: true,
          gstRatePercent: true,
        },
      },
    },
  });
  if (!quote) return { status: "error", message: "That quotation no longer exists." };
  if (quote.status !== "DRAFT") {
    return {
      status: "error",
      message: "Only a draft quotation can be edited. Raise a new quotation instead.",
    };
  }

  /*
   * The catalogue row behind the SKU, if there is one.
   *
   * `mode: "insensitive"` because a SKU read off a purchase order or a line
   * card arrives in whatever case it was printed in, and refusing
   * `ms-m365-bs-a1` for `MS-M365-BS-A1` teaches nobody anything.
   */
  const variant = parsed.data.sku
    ? await prisma.productVariant.findFirst({
        where: { sku: { equals: parsed.data.sku, mode: "insensitive" } },
        select: {
          id: true,
          sku: true,
          listPriceMinor: true,
          salePriceMinor: true,
          gstRatePercent: true,
          product: {
            select: {
              id: true,
              name: true,
              shortDescription: true,
              hsnCode: true,
              unitLabel: true,
              brand: { select: { name: true } },
            },
          },
        },
      })
    : null;

  if (parsed.data.sku && !variant) {
    return {
      status: "error",
      message: `No catalogue product has the SKU ${parsed.data.sku}. Check it, or leave the SKU blank to add a line of your own.`,
      fieldErrors: { sku: ["Not in the catalogue."] },
    };
  }

  // The name is the line. It can come from the catalogue or from the person
  // quoting, but a line with neither would print a blank row.
  const productName = parsed.data.productName || variant?.product.name || "";
  if (!productName) {
    return {
      status: "error",
      message: "Give the line a name, or a SKU to take one from.",
      fieldErrors: { productName: ["A line needs a name."] },
    };
  }

  const unitPriceMinor =
    parsed.data.unitPrice != null && parsed.data.unitPrice !== ""
      ? Math.round(Number(parsed.data.unitPrice) * 100)
      : variant
        ? variantUnitPrice(variant)
        : 0;

  const gross = unitPriceMinor * parsed.data.quantity;
  const line = priceLine({
    unitPriceMinor,
    quantity: parsed.data.quantity,
    discountMinor: discountFromPercent(gross, parsed.data.discountPercent),
    gstRatePercent: parsed.data.gstRatePercent ?? variant?.gstRatePercent ?? 18,
  });

  /*
   * The 32-bit ceiling, checked before the write rather than discovered by it.
   *
   * Every amount here is an `Int`. Adding a line that takes the document over
   * would otherwise fail inside the transaction with a Postgres range error,
   * which tells a salesperson nothing they can act on. Splitting the quotation
   * is a normal thing to do; it just has to be said.
   */
  if (!lineIsStorable(line)) {
    return {
      status: "error",
      message: "That line alone is worth more than a quotation can hold (about ₹2.14 crore).",
    };
  }
  const projected = documentTotals([...quote.items.map(priceLine), line]);
  if (!totalsAreStorable(projected)) {
    return {
      status: "error",
      message:
        "Adding that line would take this quotation over what one document can hold (about ₹2.14 crore). Please split it across two quotations.",
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.quoteItem.create({
      select: { id: true },
      data: {
        quoteId: quote.id,
        productId: variant?.product.id ?? null,
        variantId: variant?.id ?? null,
        productName,
        /*
         * A free line still needs a SKU: the column is not nullable, and the
         * printed document has a column for it. An em dash is what the PDF
         * already prints for "we do not have this", so it is what goes in
         * rather than an invented code.
         */
        sku: variant?.sku ?? "—",
        // Typed values win over the catalogue's; blank falls through to it, and
        // null where neither has it. The document prints nothing for a null.
        description: parsed.data.description || variant?.product.shortDescription || null,
        brandName: parsed.data.brandName || variant?.product.brand.name || null,
        hsnCode: parsed.data.hsnCode || variant?.product.hsnCode || null,
        unitLabel: parsed.data.unitLabel || variant?.product.unitLabel || null,
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        discountMinor: line.discountMinor,
        gstRatePercent: line.gstRatePercent,
        lineTotalMinor: line.lineTotalMinor,
      },
    });
    await recalculateQuote(quote.id, tx);
    return item;
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_line_added",
    entityType: "QuoteItem",
    entityId: created.id,
    metadata: {
      quote: quote.reference,
      productName,
      sku: variant?.sku ?? null,
      quantity: line.quantity,
      unitPriceMinor: line.unitPriceMinor,
    },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${quote.reference}`);
  return {
    status: "success",
    message: variant
      ? `Added ${productName} and recalculated the totals.`
      : `Added ${productName} as a line of its own, and recalculated the totals.`,
  };
}

/** Edits one quotation line, then recomputes the document totals. */
export async function updateQuoteLine(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = lineSchema.safeParse({
    itemId: formData.get("itemId"),
    productName: formData.get("productName"),
    description: formData.get("description"),
    brandName: formData.get("brandName"),
    hsnCode: formData.get("hsnCode"),
    unitLabel: formData.get("unitLabel"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    discountPercent: formData.get("discountPercent") || 0,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const item = await prisma.quoteItem.findUnique({
    where: { id: parsed.data.itemId },
    select: {
      id: true,
      gstRatePercent: true,
      quote: {
        select: {
          id: true,
          reference: true,
          status: true,
          items: {
            select: {
              id: true,
              unitPriceMinor: true,
              quantity: true,
              discountMinor: true,
              gstRatePercent: true,
            },
          },
        },
      },
    },
  });
  if (!item) return { status: "error", message: "That line no longer exists." };

  // A sent quotation is a commitment; re-pricing it silently would undermine
  // the validity period the customer was given.
  if (item.quote.status !== "DRAFT") {
    return {
      status: "error",
      message: "Only a draft quotation can be edited. Raise a new quotation instead.",
    };
  }

  const gross = parsed.data.unitPrice * parsed.data.quantity;
  const line = priceLine({
    unitPriceMinor: parsed.data.unitPrice,
    quantity: parsed.data.quantity,
    discountMinor: discountFromPercent(gross, parsed.data.discountPercent),
    gstRatePercent: item.gstRatePercent,
  });

  // The same ceiling `addQuoteLine` checks. A quantity typed with an extra zero
  // reaches it just as easily as an extra line, and the Postgres range error it
  // would otherwise raise says nothing a salesperson can act on.
  if (!lineIsStorable(line)) {
    return {
      status: "error",
      message: "That line alone is worth more than a quotation can hold (about ₹2.14 crore).",
    };
  }
  const projected = documentTotals(
    item.quote.items.map((other) => (other.id === item.id ? line : priceLine(other))),
  );
  if (!totalsAreStorable(projected)) {
    return {
      status: "error",
      message:
        "That change would take this quotation over what one document can hold (about ₹2.14 crore). Please split it across two quotations.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.update({
      where: { id: item.id },
      data: {
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        discountMinor: line.discountMinor,
        lineTotalMinor: line.lineTotalMinor,
        productName: parsed.data.productName,
        // Cleared rather than left standing when emptied: a blank field means
        // "we do not have this", and the document prints nothing for it.
        description: parsed.data.description || null,
        brandName: parsed.data.brandName || null,
        hsnCode: parsed.data.hsnCode || null,
        unitLabel: parsed.data.unitLabel || null,
      },
    });
    await recalculateQuote(item.quote.id, tx);
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_line_updated",
    entityType: "QuoteItem",
    entityId: item.id,
    // The name is in the audit record because it is now editable, and a line
    // whose name was changed after pricing is exactly the thing somebody will
    // later need to reconstruct.
    metadata: {
      quote: item.quote.reference,
      productName: parsed.data.productName,
      unitPriceMinor: line.unitPriceMinor,
    },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${item.quote.reference}`);
  return { status: "success", message: "Line updated and totals recalculated." };
}

export async function removeQuoteLine(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) return { status: "error", message: "No line specified." };

  const item = await prisma.quoteItem.findUnique({
    where: { id: itemId },
    select: { id: true, quote: { select: { id: true, reference: true, status: true } } },
  });
  if (!item) return { status: "error", message: "That line no longer exists." };
  if (item.quote.status !== "DRAFT") {
    return { status: "error", message: "Only a draft quotation can be edited." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.delete({ where: { id: item.id } });
    await recalculateQuote(item.quote.id, tx);
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_line_removed",
    entityType: "QuoteItem",
    entityId: item.id,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${item.quote.reference}`);
  return { status: "success", message: "Line removed." };
}

const validitySchema = z.object({
  reference: referenceSchema("QTE"),
  validUntil: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker."),
  notes: z.string().max(4000).optional(),
  /*
   * What the customer is agreeing to on payment, printed on the document.
   *
   * Free text, and deliberately not defaulted: terms are negotiated per deal,
   * and a default printed on a quotation is a commitment nobody made. Blank
   * prints no line at all.
   */
  paymentTerms: z.string().trim().max(160).optional(),
  /** The member of staff answerable for it. Empty means nobody is named. */
  ownerId: z.string().trim().max(60).optional(),
  /**
   * The customer's own RFQ or tender number.
   *
   * Printed as "Reference No." in place of ours, because that is what their
   * procurement system files the quotation against.
   */
  customerReference: z.string().trim().max(80).optional(),
});

export async function updateQuoteTerms(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = validitySchema.safeParse({
    reference: formData.get("reference"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
    paymentTerms: formData.get("paymentTerms"),
    ownerId: formData.get("ownerId"),
    customerReference: formData.get("customerReference"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const validUntil = new Date(`${parsed.data.validUntil}T23:59:59Z`);
  if (Number.isNaN(validUntil.getTime())) {
    return { status: "error", message: "That validity date could not be read." };
  }

  /*
   * The named owner has to be somebody who works here.
   *
   * A customer ringing the name on a quotation expects to reach the person it
   * names, so an id that does not resolve to a member of staff clears the field
   * rather than being stored — a name on a document is a promise about who will
   * answer.
   */
  let ownerId: string | null = null;
  if (parsed.data.ownerId) {
    const owner = await prisma.user.findFirst({
      where: { id: parsed.data.ownerId, role: { not: "CUSTOMER" } },
      select: { id: true },
    });
    if (!owner) {
      return { status: "error", message: "That sales executive could not be found." };
    }
    ownerId = owner.id;
  }

  await prisma.quote.update({
    where: { reference: parsed.data.reference },
    data: {
      validUntil,
      notes: parsed.data.notes?.trim() || null,
      paymentTerms: parsed.data.paymentTerms?.trim() || null,
      customerReference: parsed.data.customerReference?.trim() || null,
      ownerId,
    },
  });

  revalidatePath(`/admin/quotes/${parsed.data.reference}`);
  return { status: "success", message: "Quotation terms updated." };
}

export async function issueQuote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = referenceSchema("QTE").safeParse(formData.get("reference"));
  if (!parsed.success) return { status: "error", message: "That reference is not valid." };

  const result = await sendQuote(parsed.data, staff.id);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_sent",
    entityType: "Quote",
    entityId: parsed.data,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${parsed.data}`);
  revalidatePath("/admin/quotes");
  return { status: "success", message: "Quotation issued and sent to the customer." };
}


const revisionSchema = z.object({
  reference: referenceSchema("QTE"),
  note: z.string().trim().max(600).optional(),
});

/**
 * Raises the next version of a quotation.
 *
 * A copy, never an edit: see `lib/quote-revision` for why. Redirects to the new
 * version, because the old one is now history and editing it is exactly what
 * this exists to prevent.
 */
export async function reviseQuotation(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = revisionSchema.safeParse({
    reference: formData.get("reference"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { status: "error", message: "That revision could not be raised." };

  const result = await reviseQuote(parsed.data.reference, staff.id, parsed.data.note ?? null);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_revised",
    entityType: "Quote",
    entityId: result.reference,
    metadata: { from: parsed.data.reference, version: result.version },
    ip: await clientIp(),
  });

  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${parsed.data.reference}`);
  redirect(`/admin/quotes/${result.reference}`);
}

const followUpSchema = z.object({
  reference: referenceSchema("QTE"),
  /*
   * Short on purpose.
   *
   * This paragraph opens a chase, not a second quotation. Anything longer than
   * a few sentences is a reply to a question the customer has asked, and that
   * belongs in the quotation thread where the question is — which is a
   * different action and leaves a different record.
   */
  note: z.string().trim().max(800).optional(),
});

/**
 * Chases a quotation now, because somebody here decided to.
 *
 * Separate from the schedule and not counted against it: a salesperson who
 * rings and then writes has not used up the customer's patience with automatic
 * mail, and the gap rule in `lib/quotes/follow-ups` pushes the next automatic
 * one back rather than cancelling it.
 */
export async function sendQuoteFollowUp(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = followUpSchema.safeParse({
    reference: formData.get("reference"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "That follow-up could not be sent.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const note = parsed.data.note?.length ? parsed.data.note : null;
  const result = await sendManualFollowUp(parsed.data.reference, staff.id, note);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_followed_up",
    entityType: "Quote",
    entityId: parsed.data.reference,
    metadata: { manual: true, withNote: note !== null },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${parsed.data.reference}`);
  return { status: "success", message: "Follow-up sent to the customer." };
}

const pauseSchema = z.object({
  reference: referenceSchema("QTE"),
  /*
   * The desired end state, not a toggle.
   *
   * A form that says "flip it" acts on whatever the page happened to be
   * showing, and two people looking at the same quotation then undo each
   * other. Saying which state is wanted makes a repeated submission harmless.
   */
  paused: z.enum(["yes", "no"]),
});

/** Stops or restarts the automatic chasing on one quotation. */
export async function setQuoteFollowUpsPaused(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = pauseSchema.safeParse({
    reference: formData.get("reference"),
    paused: formData.get("paused"),
  });
  if (!parsed.success) return { status: "error", message: "That change could not be made." };

  const paused = parsed.data.paused === "yes";
  const updated = await prisma.quote.updateMany({
    where: { reference: parsed.data.reference },
    data: { followUpsPausedAt: paused ? new Date() : null },
  });
  if (updated.count === 0) {
    return { status: "error", message: "That quotation no longer exists." };
  }

  await recordAudit({
    actorId: staff.id,
    action: paused ? "admin.quote_follow_ups_paused" : "admin.quote_follow_ups_resumed",
    entityType: "Quote",
    entityId: parsed.data.reference,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${parsed.data.reference}`);
  return {
    status: "success",
    message: paused
      ? "Automatic follow-ups paused on this quotation."
      : "Automatic follow-ups resumed on this quotation.",
  };
}

const replySchema = z.object({
  reference: referenceSchema("QTE"),
  body: z.string().trim().min(2, "Write your reply.").max(4000),
});

/** Answers a customer's question on a quotation, in the thread they asked in. */
export async function replyOnQuote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = replySchema.safeParse({
    reference: formData.get("reference"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const result = await addQuoteMessage(
    parsed.data.reference,
    { id: staff.id, staff: true },
    { kind: "REPLY", body: parsed.data.body },
  );
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_replied",
    entityType: "Quote",
    entityId: parsed.data.reference,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${parsed.data.reference}`);
  return { status: "success", message: "Reply added to the quotation." };
}


const verifySchema = z.object({
  reference: z.string().trim().regex(/^DOC-\d{4}-[A-Z0-9]{6}$/, "Invalid reference."),
});

/**
 * Marks a customer's purchase order as checked.
 *
 * The point of the flag: an order confirmed on the strength of an upload
 * nobody opened is an order confirmed on somebody's word. Until this is set,
 * both sides see "awaiting verification", which is the truth.
 */
export async function verifyPurchaseOrder(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = verifySchema.safeParse({ reference: formData.get("reference") });
  if (!parsed.success) return { status: "error", message: "That reference is not valid." };

  const document = await prisma.document.findFirst({
    where: { reference: parsed.data.reference, kind: "PURCHASE_ORDER", deletedAt: null },
    select: { id: true, verifiedAt: true, order: { select: { reference: true } } },
  });
  if (!document) return { status: "error", message: "That document no longer exists." };
  if (document.verifiedAt) return { status: "error", message: "That purchase order is already verified." };

  await prisma.document.update({
    where: { id: document.id },
    data: { verifiedAt: new Date() },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.purchase_order_verified",
    entityType: "Document",
    entityId: parsed.data.reference,
    ip: await clientIp(),
  });

  if (document.order) revalidatePath(`/admin/orders/${document.order.reference}`);
  return { status: "success", message: "Purchase order marked as verified." };
}

const orderStatusSchema = z.object({
  reference: referenceSchema("ORD"),
  status: z.enum(["PENDING", "CONFIRMED", "PROVISIONING", "CANCELLED", "REFUNDED"]),
  internalNotes: z.string().max(4000).optional(),
});

export async function updateOrderStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = orderStatusSchema.safeParse({
    reference: formData.get("reference"),
    status: formData.get("status"),
    internalNotes: formData.get("internalNotes"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That update could not be applied." };
  }

  const order = await prisma.order.findUnique({
    where: { reference: parsed.data.reference },
    select: { status: true, billingName: true, billingEmail: true },
  });
  if (!order) return { status: "error", message: "That order no longer exists." };
  // Fulfilment is a separate action because it creates licence records.
  if (order.status === "FULFILLED") {
    return { status: "error", message: "A fulfilled order's status cannot be changed here." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { reference: parsed.data.reference },
      data: {
        status: parsed.data.status,
        internalNotes: parsed.data.internalNotes?.trim() || null,
      },
    });

    /*
     * Marking the order REFUNDED and leaving its captured payment saying
     * CAPTURED is exactly the drift a reconciliation later has to catch by
     * hand — the two fields would then disagree about the one fact that
     * matters most. This is a record of what happened, not a request to
     * refund: the actual money movement still happens at the gateway (its
     * dashboard, or Payment.status can be corrected directly against
     * whichever payment it applies to — see markPaymentRefunded below),
     * before an order is set to REFUNDED here.
     */
    if (parsed.data.status === "REFUNDED") {
      await tx.payment.updateMany({
        where: { order: { reference: parsed.data.reference }, status: "CAPTURED" },
        data: { status: "REFUNDED" },
      });
    }
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.order_status_changed",
    entityType: "Order",
    entityId: parsed.data.reference,
    metadata: { from: order.status, to: parsed.data.status },
    ip: await clientIp(),
  });

  /*
   * Tell the customer, unless nothing changed.
   *
   * Re-saving the form to edit an internal note would otherwise send them a
   * second "your order is confirmed" for an order that was already confirmed,
   * which is how a system trains people to ignore its email.
   */
  /*
   * PENDING is excluded deliberately. Moving an order *back* to awaiting is an
   * internal correction — a status set by mistake, an order reopened while
   * something is checked — and telling a customer "your order is now pending"
   * explains nothing and worries them. Every other transition is news they can
   * act on.
   */
  if (parsed.data.status !== order.status && parsed.data.status !== "PENDING") {
    await notifyOrderStatus({
      reference: parsed.data.reference,
      status: parsed.data.status,
      billingName: order.billingName,
      billingEmail: order.billingEmail,
    });
  }

  revalidatePath(`/admin/orders/${parsed.data.reference}`);
  revalidatePath("/admin/orders");
  return { status: "success", message: "Order updated." };
}

const paymentRefundSchema = z.object({
  paymentId: z.string().trim().min(1),
  reference: referenceSchema("ORD"),
});

/**
 * Recording that a specific payment has been refunded.
 *
 * A record of fact, not a request: this deployment has no refund API
 * integration with either gateway, so the money movement itself still
 * happens at the gateway — its own dashboard — first. This is what keeps
 * Payment.status agreeing with that afterwards, for the one payment it names,
 * without requiring the whole order to move to REFUNDED (an order can carry
 * more than one payment attempt; only a captured one is ever refundable).
 */
export async function markPaymentRefunded(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = paymentRefundSchema.safeParse({
    paymentId: formData.get("paymentId"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) return { status: "error", message: "That update could not be applied." };

  const payment = await prisma.payment.findFirst({
    where: { id: parsed.data.paymentId, order: { reference: parsed.data.reference } },
    select: { id: true, status: true, amountMinor: true, currency: true },
  });
  if (!payment) return { status: "error", message: "That payment could not be found on this order." };
  if (payment.status !== "CAPTURED") {
    return { status: "error", message: "Only a captured payment can be marked refunded." };
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.payment_marked_refunded",
    entityType: "Payment",
    entityId: payment.id,
    metadata: { order: parsed.data.reference, amountMinor: payment.amountMinor, currency: payment.currency },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/orders/${parsed.data.reference}`);
  return { status: "success", message: "Payment marked as refunded." };
}

/** Fulfils an order, creating a licence per line and a renewal per term. */
export async function fulfilOrderAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = referenceSchema("ORD").safeParse(formData.get("reference"));
  if (!parsed.success) return { status: "error", message: "That reference is not valid." };

  const result = await fulfilOrder(parsed.data, staff.id);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.order_fulfilled",
    entityType: "Order",
    entityId: parsed.data,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/orders/${parsed.data}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return {
    status: "success",
    message: "Order fulfilled. Licence and renewal records have been created.",
  };
}

const ticketSchema = z.object({
  reference: referenceSchema("TKT"),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

/** Updates a support ticket's status and priority. */
export async function updateSupportTicket(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = ticketSchema.safeParse({
    reference: formData.get("reference"),
    status: formData.get("status"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That update could not be applied." };
  }

  const existing = await prisma.supportTicket.findUnique({
    where: { reference: parsed.data.reference },
    select: {
      status: true,
      subject: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!existing) return { status: "error", message: "That ticket no longer exists." };

  await prisma.supportTicket.update({
    where: { reference: parsed.data.reference },
    data: { status: parsed.data.status, priority: parsed.data.priority },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.ticket_updated",
    entityType: "SupportTicket",
    entityId: parsed.data.reference,
    metadata: { from: existing.status, to: parsed.data.status },
    ip: await clientIp(),
  });

  /*
   * Only on a real change, and only for the two states worth interrupting
   * somebody for — `notifyTicketUpdated` decides which. Silence on
   * WAITING_ON_CUSTOMER is the expensive one: a ticket parked waiting for a
   * customer who was never told they were the blocker.
   */
  if (parsed.data.status !== existing.status && existing.user) {
    await notifyTicketUpdated({
      reference: parsed.data.reference,
      subject: existing.subject,
      status: parsed.data.status,
      customerName: existing.user.name,
      customerEmail: existing.user.email,
    });
  }

  revalidatePath("/admin/support");
  return { status: "success", message: "Ticket updated." };
}
