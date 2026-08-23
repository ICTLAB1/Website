"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { TEMPLATE_PROBLEMS, templateProblem } from "@/lib/document-number";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { invalidate, tags } from "@/lib/cache";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Saving the company's business identity.
 *
 * ADMIN only, re-checked on the server. This is not a content edit: it writes
 * the address, the GSTIN and the statutorily-required grievance officer, all of
 * which appear on legal pages, so it sits a rung above the staff-level content
 * actions rather than beside them.
 *
 * Every field is optional, and an empty field is stored as null rather than as
 * an empty string. That distinction is the whole fallback mechanism: null means
 * "not set here", which hands the field back to its environment variable, and
 * lets an administrator undo an edit rather than only overwrite it.
 */

/** Trims, and turns "" into null so a cleared field falls back to the environment. */
/** A rate typed as rupees-and-paise, kept as an integer number of paise. */
const rateField = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? Math.round(Number(value) * 100) : null))
  .refine(
    (value) => value === null || (Number.isInteger(value) && value >= 100 && value <= 100_000),
    { message: "Enter the rate in rupees, for example 83.50. Values between ₹1 and ₹1,000 are accepted." },
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

/**
 * Same, but validated only when something was actually typed.
 *
 * `z.string().email()` on an empty string fails, which would make every save
 * that leaves an optional email blank report an error against a field the
 * administrator never touched.
 */
const optionalEmail = z
  .string()
  .trim()
  .max(180)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: "Enter a valid email address, or leave it blank.",
  });

/**
 * Deliberately permissive: +91 11 4567 8900, 011-45678900 and 9876543210 are
 * all things a business legitimately prints. It rejects letters and obvious
 * nonsense rather than trying to enforce one national format.
 */
const optionalPhone = z
  .string()
  .trim()
  .max(40)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || /^[+()\d][\d\s()+-]{6,}$/.test(value), {
    message: "Enter a telephone number, or leave it blank.",
  });

/**
 * 15 characters: two state digits, a ten-character PAN, an entity digit, "Z",
 * and a checksum character. Worth checking, because a GSTIN is reproduced on
 * invoices and a typo in one is a real problem rather than a cosmetic one.
 */
const optionalGstin = z
  .string()
  .trim()
  .toUpperCase()
  .max(15)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine(
    (value) => value === null || /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z][\dA-Z]$/.test(value),
    { message: "A GSTIN is 15 characters, such as 07AABCU9603R1ZX." },
  );

/** 21 characters, as issued by the Ministry of Corporate Affairs. */
const optionalCin = z
  .string()
  .trim()
  .toUpperCase()
  .max(21)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || /^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/.test(value), {
    message: "A CIN is 21 characters, such as U72900DL2019PTC123456.",
  });

const settingsSchema = z.object({
  emailSales: optionalEmail,
  emailSupport: optionalEmail,
  emailEnterprise: optionalEmail,
  phoneSales: optionalPhone,
  phoneSupport: optionalPhone,

  addressLine1: optionalText(180),
  addressLine2: optionalText(180),
  city: optionalText(90),
  state: optionalText(90),
  postcode: optionalText(20),
  country: optionalText(90),

  gstin: optionalGstin,
  cin: optionalCin,
  supportHours: optionalText(180),
  // Generous: these are real contract terms, not a strapline.
  quoteTerms: optionalText(4000),
  /*
   * The quotation numbering series. Validated against the same rules the
   * renderer applies, so a format that would produce duplicate numbers is
   * refused here rather than discovered when the second quotation fails to
   * save.
   */
  quoteNumberFormat: optionalText(60).refine(
    (value) => value === null || templateProblem(value) === null,
    (value) => ({ message: TEMPLATE_PROBLEMS[templateProblem(value) ?? "bad_characters"] }),
  ),
  secondaryEntityName: optionalText(120),
  secondaryEntityAddress: optionalText(300),
  /*
   * Entered as a decimal — "83.50" is what a person reads off a rate board —
   * and stored as paise. Bounded well outside any plausible rate rather than
   * tightly, so a currency this business starts quoting in future is not
   * refused by a limit somebody chose today; the point is to catch a decimal
   * point in the wrong place, not to predict the market.
   */
  usdRatePaise: rateField,
  aedRatePaise: rateField,

  grievanceName: optionalText(120),
  grievanceEmail: optionalEmail,
  grievancePhone: optionalPhone,
});

/*
 * A second entity is both fields or neither.
 *
 * Refused rather than half-saved, because a name with no address is a claim to
 * a presence nobody can write to, and an address with no name is a mystery. The
 * renderer already declines to print a half-filled pair; this says so at the
 * point somebody can fix it.
 */
const settingsSchemaChecked = settingsSchema.superRefine((value, context) => {
  if (Boolean(value.secondaryEntityName) === Boolean(value.secondaryEntityAddress)) return;

  context.addIssue({
    code: "custom",
    path: [value.secondaryEntityName ? "secondaryEntityAddress" : "secondaryEntityName"],
    message: "Give the second entity both a name and an address, or leave both blank.",
  });
});

const FIELDS = Object.keys(settingsSchema.shape) as Array<keyof typeof settingsSchema.shape>;

export async function saveSiteSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`settings:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  // Read only the fields the schema declares. A form field this action does not
  // know about is ignored rather than written, so a crafted request cannot set
  // a column simply by naming it.
  const parsed = settingsSchemaChecked.safeParse(
    Object.fromEntries(FIELDS.map((field) => [field, formData.get(field) ?? ""])),
  );

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const data = { ...parsed.data, updatedById: admin.id };

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  /*
   * Which fields were filled in, never their values.
   *
   * The audit log is readable by any administrator and its metadata is not the
   * place to keep a second copy of the company's contact details — and a
   * grievance officer's personal telephone number least of all. The names alone
   * answer the question an audit log is for: who changed what, and when.
   */
  await recordAudit({
    actorId: admin.id,
    action: "settings.save",
    entityType: "SiteSettings",
    entityId: "singleton",
    metadata: {
      set: FIELDS.filter((field) => parsed.data[field] !== null),
      cleared: FIELDS.filter((field) => parsed.data[field] === null),
    },
    ip: await clientIp(),
  });

  // The header and the footer read this, so it is on every page.
  invalidate(tags.settings);

  return { status: "success", message: "Saved. The public site is showing these details now." };
}
