"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { orgScope } from "@/lib/auth/scope";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { MAX_DOCUMENT_BYTES, storeDocument } from "@/lib/documents";
import { fieldErrorsOf } from "@/lib/validation";
import type { ActionState } from "@/app/account/actions";

/**
 * A customer attaching their purchase order.
 *
 * The document, not just the number. A PO number typed into a field is a
 * reference to a document nobody here has; the document is what finance will
 * ask for when the invoice is queried, and what proves what was ordered on
 * whose authority.
 *
 * Uploading does **not** confirm the order. Somebody here opens it, checks that
 * it says what the order says, and marks it verified — an order confirmed on
 * the strength of an unread upload is an order confirmed on somebody's word.
 */

const schema = z.object({
  reference: z.string().trim().regex(/^ORD-\d{4}-[A-Z0-9]{6}$/, "Invalid reference."),
  poNumber: z.string().trim().max(64).optional().or(z.literal("")),
});

export async function uploadPurchaseOrder(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/orders");

  if (!canInCompany(user, "orders.act")) {
    return {
      status: "error",
      message:
        "Your access does not include sending purchase orders. Ask a colleague with procurement or finance access.",
    };
  }

  const limit = hit(`po:${user.id}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many uploads in a short period. Please try again shortly." };
  }

  const parsed = schema.safeParse({
    reference: formData.get("reference"),
    poNumber: formData.get("poNumber"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  // Scoped to the organisation in the lookup: another company's order reference
  // matches nothing rather than matching and being refused.
  const order = await prisma.order.findFirst({
    where: { reference: parsed.data.reference, ...orgScope(user) },
    select: { id: true, reference: true, status: true, poNumber: true },
  });
  if (!order) return { status: "error", message: "That order could not be found." };

  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { status: "error", message: "That order is closed. Contact us if this is a mistake." };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "Choose the purchase order file.",
      fieldErrors: { document: ["Choose a file."] },
    };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      status: "error",
      message: "That file is larger than 10 MB.",
      fieldErrors: { document: ["Too large"] },
    };
  }

  const stored = await storeDocument({
    buffer: Buffer.from(await file.arrayBuffer()),
    filename: file.name,
    kind: "PURCHASE_ORDER",
    companyId: user.companyId,
    userId: user.id,
    orderId: order.id,
    note: parsed.data.poNumber ? `PO ${parsed.data.poNumber}` : null,
  });

  if (!stored.ok) {
    return {
      status: "error",
      message:
        stored.reason === "unsupported"
          ? "We could not read that file. Send a PDF, an image or an Office document."
          : "That file could not be stored. Please try again.",
      fieldErrors: { document: ["Not accepted"] },
    };
  }

  /*
   * The number is recorded alongside, and only when the order has none. A
   * second upload should not silently change the number on an order finance
   * has already been invoiced against.
   */
  if (parsed.data.poNumber && !order.poNumber) {
    await prisma.order.update({
      where: { id: order.id },
      data: { poNumber: parsed.data.poNumber },
    });
  }

  await recordAudit({
    actorId: user.id,
    action: "order.purchase_order_uploaded",
    entityType: "Order",
    entityId: order.reference,
    ip: await clientIp(),
  });

  revalidatePath(`/account/orders/${order.reference}`);
  revalidatePath("/account/orders");

  return {
    status: "success",
    message:
      "Thank you — your purchase order is on file. We will check it against the order and confirm.",
  };
}
