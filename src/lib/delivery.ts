import type { OrderStatus } from "@prisma/client";

/**
 * Where a consignment has got to.
 *
 * Derived from dates rather than from a separate status column, because a date
 * is a fact somebody entered and a status is an opinion somebody has to
 * remember to update. An order dispatched on the 4th is dispatched whatever the
 * status field says, and an order with no dispatch date has not been dispatched
 * however confident anybody is.
 *
 * The stages are deliberately few. "Out for delivery", "at the hub", "arrived at
 * facility" are the courier's own story and we do not hold it; inventing a
 * granularity we cannot back would be the same as inventing tracking.
 */

export type DeliveryStage = "not_dispatched" | "dispatched" | "delivered" | "not_applicable";

export type DeliveryFacts = {
  status?: OrderStatus | string | null;
  dispatchedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
};

export function deliveryStage(order: DeliveryFacts): DeliveryStage {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") return "not_applicable";
  if (order.deliveredAt) return "delivered";
  if (order.dispatchedAt) return "dispatched";
  return "not_dispatched";
}

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  not_dispatched: "Not yet dispatched",
  dispatched: "In transit",
  delivered: "Delivered",
  not_applicable: "Not being delivered",
};

/**
 * What each stage means, said rather than implied.
 *
 * "Not yet dispatched" on a licence-only order would be alarming and wrong, so
 * the copy for that stage carries no promise about when — the expected date,
 * where one has been entered, is shown separately and is the only date we will
 * stand behind.
 */
export const DELIVERY_STAGE_HINTS: Record<DeliveryStage, string> = {
  not_dispatched: "Nothing has left us yet. We will record the courier and consignment number here when it does.",
  dispatched: "On its way. The consignment number below is the courier's, and their tracking is the live one.",
  delivered: "Recorded as delivered. Tell us within a working day if anything is missing or damaged.",
  not_applicable: "This order was cancelled or refunded, so nothing is being delivered against it.",
};

export const DELIVERY_STAGE_TONES: Record<DeliveryStage, "neutral" | "warning" | "accent" | "success"> = {
  not_dispatched: "neutral",
  dispatched: "accent",
  delivered: "success",
  not_applicable: "warning",
};

/**
 * Whether a tracking URL is safe to put behind a link.
 *
 * Staff type this in, and a link that somebody with panel access can set to
 * `javascript:` is a stored cross-site scripting hole aimed squarely at the
 * customer. Only absolute http(s) URLs get through; anything else is shown as
 * text beside the consignment number, so the information is not lost.
 */
export function safeTrackingUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (trimmed.length > 500) return null;
  return parsed.toString();
}

/**
 * Whether an expected date has been passed without a delivery being recorded.
 *
 * Shown to the customer as plainly as it is to us. A date we gave and missed is
 * not something to quietly drop off the page — the customer already knows.
 */
export function deliveryOverdue(order: DeliveryFacts & { expectedAt?: Date | string | null }, now: Date = new Date()): boolean {
  if (!order.expectedAt) return false;
  if (order.deliveredAt) return false;
  if (deliveryStage(order) === "not_applicable") return false;

  const expected = new Date(order.expectedAt);
  if (Number.isNaN(expected.getTime())) return false;
  return expected.getTime() < now.getTime();
}
