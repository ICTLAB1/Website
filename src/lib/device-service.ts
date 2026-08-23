import "server-only";
import { z } from "zod";
import type { DeviceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { orgScope, type Scoped } from "@/lib/auth/scope";

/**
 * The device register.
 *
 * What it is for: a customer with three hundred laptops needs to know which of
 * them is still covered before they ring us about a broken one, and we need to
 * know which machine a ticket is about before we can help. Both questions are
 * answered by a serial number and a warranty end date, and neither is answered
 * by an order line — one line of forty laptops is forty devices with forty
 * serials, and the order does not hold them.
 *
 * Every field here is entered by somebody. Nothing is derived, inferred or
 * defaulted from a manufacturer's usual terms: see `lib/warranty` for why a
 * blank warranty date stays blank.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

/**
 * A date the customer typed, or nothing.
 *
 * Deliberately not lenient: a string that is not a date becomes null rather
 * than today, because a warranty that silently starts on the day somebody
 * fat-fingered the form is worse than one that was never entered.
 */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

export const DEVICE_STATUSES: DeviceStatus[] = [
  "IN_SERVICE",
  "IN_STOCK",
  "IN_REPAIR",
  "RETIRED",
  "LOST",
];

export const deviceSchema = z
  .object({
    brandName: z.string().trim().min(1, "Say who makes it.").max(80),
    model: z.string().trim().min(1, "Say what model it is.").max(120),
    serial: optionalText(80),
    assetTag: optionalText(80),
    status: z.enum(["IN_SERVICE", "IN_STOCK", "IN_REPAIR", "RETIRED", "LOST"]).default("IN_SERVICE"),
    purchasedAt: optionalDate,
    warrantyStartsAt: optionalDate,
    warrantyEndsAt: optionalDate,
    warrantyNote: optionalText(300),
    assignedTo: optionalText(120),
    department: optionalText(120),
    location: optionalText(120),
    notes: optionalText(2000),
  })
  /*
   * A warranty that ends before it starts is a typo, and recording it would
   * make every calculation downstream wrong. Refused at the edge rather than
   * quietly reordered, because we do not know which of the two dates is the
   * mistake.
   */
  .refine(
    (value) =>
      !value.warrantyStartsAt ||
      !value.warrantyEndsAt ||
      value.warrantyEndsAt.getTime() >= value.warrantyStartsAt.getTime(),
    { message: "The warranty cannot end before it starts.", path: ["warrantyEndsAt"] },
  );

export type DeviceInput = z.infer<typeof deviceSchema>;

/**
 * Reads a device form, whichever side of the site it came from.
 *
 * Field names are shared between the customer screen and the admin one so that
 * one schema serves both; the difference between them is who may write, not
 * what may be written.
 */
export function parseDeviceForm(formData: FormData) {
  return deviceSchema.safeParse({
    brandName: formData.get("brandName"),
    model: formData.get("model"),
    serial: formData.get("serial"),
    assetTag: formData.get("assetTag"),
    status: formData.get("status") || "IN_SERVICE",
    purchasedAt: formData.get("purchasedAt"),
    warrantyStartsAt: formData.get("warrantyStartsAt"),
    warrantyEndsAt: formData.get("warrantyEndsAt"),
    warrantyNote: formData.get("warrantyNote"),
    assignedTo: formData.get("assignedTo"),
    department: formData.get("department"),
    location: formData.get("location"),
    notes: formData.get("notes"),
  });
}

/** The columns every device view needs, listed once. */
export const deviceSelect = {
  reference: true,
  brandName: true,
  model: true,
  serial: true,
  assetTag: true,
  status: true,
  purchasedAt: true,
  warrantyStartsAt: true,
  warrantyEndsAt: true,
  warrantyNote: true,
  assignedTo: true,
  department: true,
  location: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DeviceSelect;

/**
 * Records a device against the caller's organisation.
 *
 * The owner is taken from the session on both columns. Nothing about who the
 * device belongs to is ever read from the form, so a submitted company id
 * cannot move a device into somebody else's register.
 */
export async function createDevice(user: Scoped, input: DeviceInput) {
  return prisma.device.create({
    data: {
      reference: publicReference("DEV"),
      companyId: user.companyId ?? null,
      userId: user.id,
      ...input,
    },
    select: { reference: true },
  });
}

/**
 * Edits a device the caller's organisation owns.
 *
 * The scope is in the WHERE clause, so a reference belonging to another
 * organisation updates nothing and reports that it was not found — the same
 * answer a reference that never existed gets.
 */
export async function updateDeviceFor(
  user: Scoped,
  reference: string,
  input: DeviceInput,
): Promise<boolean> {
  const result = await prisma.device.updateMany({
    where: { reference, deletedAt: null, ...orgScope(user) },
    data: input,
  });
  return result.count > 0;
}

/**
 * Takes a device off the register without destroying it.
 *
 * Soft, because a device is referenced by tickets: a hard delete would leave a
 * year of support history pointing at nothing, and "which machine was that
 * about" is precisely the question the history exists to answer.
 */
export async function removeDeviceFor(user: Scoped, reference: string): Promise<boolean> {
  const result = await prisma.device.updateMany({
    where: { reference, deletedAt: null, ...orgScope(user) },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

export async function listDevicesFor(user: Scoped) {
  return prisma.device.findMany({
    where: { deletedAt: null, ...orgScope(user) },
    /*
     * Warranties first and soonest-expiring at the top, with the ones nobody
     * has dated last. A register sorted by name is a register nobody reads
     * twice; this one opens on the machines that need a decision.
     */
    orderBy: [{ warrantyEndsAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 500,
    select: deviceSelect,
  });
}

export async function getDeviceFor(user: Scoped, reference: string) {
  return prisma.device.findFirst({
    where: { reference, deletedAt: null, ...orgScope(user) },
    select: {
      ...deviceSelect,
      order: { select: { reference: true } },
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { reference: true, subject: true, status: true, createdAt: true },
      },
    },
  });
}

/** Devices in an organisation, for the staff screens. Never org-scoped. */
export async function listDevicesForCompany(companyId: string) {
  return prisma.device.findMany({
    where: { deletedAt: null, companyId },
    orderBy: [{ warrantyEndsAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 500,
    select: deviceSelect,
  });
}
