import type { DeviceStatus } from "@prisma/client";

/**
 * Warranty, stated only where it is known.
 *
 * The rule this module exists to hold: a device with no warranty end date on
 * file is **not recorded**, never "out of warranty" and never "covered". Both
 * of those are claims — one loses a customer a repair they were entitled to,
 * the other promises cover nobody has checked — and the honest answer to a
 * missing date is that nobody has entered one.
 */

export type WarrantyState = "unknown" | "active" | "expiring" | "expired";

/** How long before expiry a warranty starts being called out. */
export const WARRANTY_WARNING_DAYS = 60;

const DAY = 24 * 60 * 60 * 1000;

export function warrantyState(
  device: { warrantyEndsAt?: Date | string | null },
  now: Date = new Date(),
): WarrantyState {
  if (!device.warrantyEndsAt) return "unknown";

  const ends = new Date(device.warrantyEndsAt);
  if (Number.isNaN(ends.getTime())) return "unknown";

  const days = Math.ceil((ends.getTime() - now.getTime()) / DAY);
  if (days < 0) return "expired";
  return days <= WARRANTY_WARNING_DAYS ? "expiring" : "active";
}

/** Days until the warranty ends; negative once it has, null when unknown. */
export function warrantyDaysLeft(
  device: { warrantyEndsAt?: Date | string | null },
  now: Date = new Date(),
): number | null {
  if (!device.warrantyEndsAt) return null;
  const ends = new Date(device.warrantyEndsAt);
  if (Number.isNaN(ends.getTime())) return null;
  return Math.ceil((ends.getTime() - now.getTime()) / DAY);
}

export const WARRANTY_LABELS: Record<WarrantyState, string> = {
  unknown: "Not recorded",
  active: "In warranty",
  expiring: "Warranty expiring",
  expired: "Out of warranty",
};

/**
 * What the interface says beside each state.
 *
 * "Not recorded" carries an instruction rather than a shrug, because the thing
 * a customer should do about it — tell us, so we can put it right — is not
 * obvious.
 */
export const WARRANTY_HINTS: Record<WarrantyState, string> = {
  unknown: "No warranty end date on file. Tell us and we will record it.",
  active: "Covered by the manufacturer's warranty on the terms supplied with it.",
  expiring: "Ending soon. Ask us about an extension before it does.",
  expired: "The recorded warranty has ended. Repairs are chargeable unless extended.",
};

export const DEVICE_STATUS_LABELS: Record<DeviceStatus, string> = {
  IN_SERVICE: "In service",
  IN_STOCK: "In stock",
  IN_REPAIR: "In repair",
  RETIRED: "Retired",
  LOST: "Lost or stolen",
};
