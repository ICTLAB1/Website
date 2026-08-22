import { z } from "zod";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/password-policy";

/**
 * Every request body is parsed through one of these schemas before it reaches
 * business logic. Unknown keys are stripped, so a client cannot smuggle extra
 * fields (role, price, status) into a create or update.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const emailSchema = trimmed(254)
  .min(3)
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

/** Loose on purpose: international numbers vary, we only reject obvious junk. */
export const phoneSchema = trimmed(32)
  .min(6, "Enter a valid phone number.")
  .regex(/^[+()\-.\s0-9]+$/, "Enter a valid phone number.");

/** Indian GSTIN: 2-digit state code, 10-char PAN, entity digit, Z, checksum. */
export const gstinSchema = trimmed(15)
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    "Enter a valid 15-character GSTIN.",
  );

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH)
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(PASSWORD_MAX_LENGTH),
  next: z.string().optional(),
});

export const registerSchema = z.object({
  name: trimmed(120).min(2, "Enter your full name."),
  email: emailSchema,
  password: passwordSchema,
  companyName: trimmed(160).min(2, "Enter your company name."),
  phone: phoneSchema.optional().or(z.literal("")),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: trimmed(200).min(20, "This reset link is not valid."),
  password: passwordSchema,
});

export const timelineSchema = z.enum([
  "IMMEDIATE",
  "WITHIN_30_DAYS",
  "WITHIN_90_DAYS",
  "EXPLORING",
]);

/** Quantity guard shared by every basket / enquiry path. */
export const quantitySchema = z
  .number({ invalid_type_error: "Quantity must be a number." })
  .int("Quantity must be a whole number.")
  .min(1, "Quantity must be at least 1.")
  .max(100_000, "For volumes above 100,000 seats, contact enterprise sales.");

export const enquiryItemSchema = z.object({
  sku: trimmed(64).min(1),
  quantity: quantitySchema,
  note: trimmed(500).optional(),
});

export const enquirySchema = z.object({
  contactName: trimmed(120).min(2, "Enter your full name."),
  companyName: trimmed(160).min(2, "Enter your company name."),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  gstin: gstinSchema.optional().or(z.literal("")),
  country: trimmed(80).min(2).default("India"),
  city: trimmed(80).optional().or(z.literal("")),
  userCount: z.coerce.number().int().min(1).max(1_000_000).optional(),
  requirements: trimmed(4000).optional().or(z.literal("")),
  timeline: timelineSchema.default("EXPLORING"),
  items: z
    .array(enquiryItemSchema)
    .min(1, "Add at least one product to your enquiry.")
    .max(60, "An enquiry can contain at most 60 line items."),
  // Honeypot: a real visitor never fills this in.
  website: z.string().max(0).optional(),
});

export const contactSchema = z.object({
  name: trimmed(120).min(2, "Enter your full name."),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  companyName: trimmed(160).optional().or(z.literal("")),
  topic: z.enum(["SALES", "ENTERPRISE", "SUPPORT", "GENERAL"]).default("GENERAL"),
  message: trimmed(4000).min(10, "Tell us a little more (at least 10 characters)."),
  website: z.string().max(0).optional(),
});

export const profileSchema = z.object({
  name: trimmed(120).min(2, "Enter your full name."),
  phone: phoneSchema.optional().or(z.literal("")),
});

export const companySchema = z.object({
  name: trimmed(160).min(2, "Enter the company name."),
  gstin: gstinSchema.optional().or(z.literal("")),
  /*
   * Ten characters, five letters, four digits, one letter. Checked for shape
   * only: whether a PAN is real is a question for the income tax department,
   * and refusing a valid one because of a stricter rule than theirs would be
   * worse than accepting a typo.
   */
  pan: trimmed(10)
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "A PAN is ten characters, e.g. AAAPA1234A.")
    .optional()
    .or(z.literal("")),
  phone: trimmed(24).optional().or(z.literal("")),
  website: trimmed(200).url("Enter a valid URL.").optional().or(z.literal("")),
  addressLine1: trimmed(200).optional().or(z.literal("")),
  addressLine2: trimmed(200).optional().or(z.literal("")),
  city: trimmed(80).optional().or(z.literal("")),
  state: trimmed(80).optional().or(z.literal("")),
  postcode: trimmed(20).optional().or(z.literal("")),
  country: trimmed(80).default("India"),
});

export const supportTicketSchema = z.object({
  subject: trimmed(160).min(4, "Enter a subject."),
  category: z.enum(["LICENSING", "BILLING", "TECHNICAL", "RENEWAL", "OTHER"]),
  message: trimmed(4000).min(10, "Describe the issue in a little more detail."),
});

/** Flattens a Zod error into the shape the API contract expects. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  const flattened = error.flatten();
  const output: Record<string, string[]> = {};
  for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
    if (messages && messages.length > 0) output[key] = messages;
  }
  if (flattened.formErrors.length > 0) output._form = flattened.formErrors;
  return output;
}

/**
 * Direct purchase ("buy now").
 *
 * Like the enquiry schema, this carries no price: the server re-reads the
 * catalogue from the SKU. A purchase order number is optional because not every
 * buyer raises one up front.
 */
export const directOrderSchema = z.object({
  sku: trimmed(64).min(1),
  quantity: quantitySchema,
  contactName: trimmed(120).min(2, "Enter your full name."),
  companyName: trimmed(160).min(2, "Enter your company name."),
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  gstin: gstinSchema.optional().or(z.literal("")),
  poNumber: trimmed(64).optional().or(z.literal("")),
  billingAddress: trimmed(400).optional().or(z.literal("")),
  /*
   * Which route the customer chose at checkout.
   *
   * A preference, not an instruction: the order is created identically either
   * way, and asking to pay by card when the gateway is off or unconfigured
   * simply produces the same order with no payment attached. Nothing about
   * what is owed depends on this field.
   */
  payWithCard: z.coerce.boolean().optional().default(false),
  // Honeypot: a real visitor never fills this in.
  website: z.string().max(0).optional(),
});
