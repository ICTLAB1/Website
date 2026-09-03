"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EnquiryStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { canTransition, RFQ_STATUSES, RFQ_STATUS_LABELS } from "@/lib/rfq";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { buildSearchText, rebuildProductSearchText } from "@/lib/search-text";
import { invalidate, tags } from "@/lib/cache";
import { safeProductImage } from "@/lib/product-image";

/**
 * Administrative mutations.
 *
 * Each action re-checks the caller's role on the server before touching
 * anything. Hiding a control in the UI is never treated as an access control,
 * and no action trusts a role, price or status supplied by the client beyond
 * what its schema explicitly allows.
 */

import type { AdminActionState } from "@/lib/admin/types";

// Re-exported so existing imports from this module keep working.
export type { AdminActionState };

const moneyField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 1250 or 1250.50")
  .transform((value) => Math.round(Number(value) * 100));

const productSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(120).optional(),
  brandId: z.string().trim().min(1, "Choose a brand."),
  categoryId: z.string().trim().min(1, "Choose a category."),
  shortDescription: z.string().trim().min(10).max(300),
  /*
   * Optional overrides for the search result. Empty means "use the name and
   * short description", which is what almost every row does.
   */
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(200).optional().or(z.literal("")),
  description: z.string().trim().min(20).max(20000),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  availability: z.enum(["IN_STOCK", "MADE_TO_ORDER", "ON_REQUEST", "DISCONTINUED"]),
  purchaseMode: z.enum(["DIRECT", "ENQUIRY", "BOTH"]),
  featured: z.coerce.boolean().default(false),
  popularity: z.coerce.number().int().min(0).max(1000).default(0),
  features: z.string().max(6000).optional(),
  compatibility: z.string().max(6000).optional(),
  keywords: z.string().max(1000).optional(),
  licensingNotes: z.string().max(6000).optional(),
  deliveryNotes: z.string().max(4000).optional(),
  supportNotes: z.string().max(4000).optional(),

  /*
   * Tax classification and unit of measure.
   *
   * Held on the catalogue so a quotation inherits them rather than having them
   * retyped per deal — which is how two quotations for the same licence end up
   * under two different HSN codes. Digits only, and blank is a valid answer:
   * a code this application invented would be a classification the business
   * never made.
   */
  hsnCode: z
    .string()
    .trim()
    .max(12)
    .regex(/^[0-9]*$/, "An HSN or SAC code is digits only.")
    .optional(),
  unitLabel: z.string().trim().max(24).optional(),

  // Hardware. All optional and all blank on software, which is most of the
  // catalogue — an empty form factor is what says "this is a licence".
  formFactor: z
    .enum([
      "LAPTOP",
      "MOBILE_WORKSTATION",
      "DESKTOP_TOWER",
      "DESKTOP_SFF",
      "DESKTOP_MINI",
      "DESKTOP_WORKSTATION",
      "ALL_IN_ONE",
    ])
    .optional(),
  series: z.string().trim().max(60).optional(),
  partNumber: z.string().trim().max(60).optional(),
  imageUrl: z.string().trim().max(200).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
});

function toLines(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 60);
}

export async function saveProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const productId = String(formData.get("productId") ?? "").trim() || null;

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    brandId: formData.get("brandId"),
    categoryId: formData.get("categoryId"),
    shortDescription: formData.get("shortDescription"),
    seoTitle: formData.get("seoTitle"),
    seoDescription: formData.get("seoDescription"),
    description: formData.get("description"),
    status: formData.get("status"),
    availability: formData.get("availability"),
    purchaseMode: formData.get("purchaseMode"),
    featured: formData.get("featured") === "on",
    popularity: formData.get("popularity") || 0,
    features: formData.get("features"),
    compatibility: formData.get("compatibility"),
    keywords: formData.get("keywords"),
    licensingNotes: formData.get("licensingNotes"),
    deliveryNotes: formData.get("deliveryNotes"),
    supportNotes: formData.get("supportNotes"),
    hsnCode: formData.get("hsnCode"),
    unitLabel: formData.get("unitLabel"),
    // An empty select posts "", which is not a member of the enum — mapped to
    // undefined so "not hardware" validates rather than failing the form.
    formFactor: formData.get("formFactor") || undefined,
    series: formData.get("series"),
    partNumber: formData.get("partNumber"),
    imageUrl: formData.get("imageUrl"),
    sourceUrl: formData.get("sourceUrl"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  const keywords = (input.keywords ?? "")
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);

  const slug = slugify(input.slug || input.name);
  if (!slug) {
    return { status: "error", message: "Could not derive a URL slug from that name." };
  }

  // Slugs are part of a public URL, so a collision must be reported rather than
  // silently overwriting another product.
  const clash = await prisma.product.findFirst({
    where: { slug, ...(productId ? { id: { not: productId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      status: "error",
      message: "Another product already uses that URL slug. Choose a different one.",
      fieldErrors: { slug: ["This slug is already in use."] },
    };
  }

  const data = {
    name: input.name,
    slug,
    brandId: input.brandId,
    categoryId: input.categoryId,
    shortDescription: input.shortDescription,
    // Stored as null rather than "", so the read path has one absent value to
    // check instead of two.
    seoTitle: input.seoTitle?.trim() ? input.seoTitle.trim() : null,
    seoDescription: input.seoDescription?.trim() ? input.seoDescription.trim() : null,
    description: input.description,
    status: input.status,
    availability: input.availability,
    purchaseMode: input.purchaseMode,
    featured: input.featured,
    popularity: input.popularity,
    features: toLines(input.features),
    compatibility: toLines(input.compatibility),
    keywords,
    licensingNotes: input.licensingNotes?.trim() || null,
    deliveryNotes: input.deliveryNotes?.trim() || null,
    supportNotes: input.supportNotes?.trim() || null,
    hsnCode: input.hsnCode?.trim() || null,
    unitLabel: input.unitLabel?.trim() || null,
    formFactor: input.formFactor ?? null,
    series: input.series?.trim() || null,
    partNumber: input.partNumber?.trim() || null,
    /*
     * Refused rather than sanitised, and rejected outright rather than stored
     * and ignored at render. `safeProductImage` is what the page will apply
     * anyway, so a value it declines would silently become a blank frame with
     * no explanation to whoever typed it.
     */
    imageUrl: input.imageUrl?.trim() ? safeProductImage(input.imageUrl.trim()) : null,
    sourceUrl: input.sourceUrl?.trim() || null,
    searchText: await buildSearchText({
      name: input.name,
      brandId: input.brandId,
      categoryId: input.categoryId,
      keywords,
      shortDescription: input.shortDescription,
      ...(productId ? { productId } : {}),
    }),
  };

  const saved = productId
    ? await prisma.product.update({ where: { id: productId }, data, select: { id: true } })
    : await prisma.product.create({ data, select: { id: true } });

  await recordAudit({
    actorId: staff.id,
    action: productId ? "admin.product_updated" : "admin.product_created",
    entityType: "Product",
    entityId: saved.id,
    metadata: { slug, status: input.status },
    ip: await clientIp(),
  });

  // Tag invalidation rather than a list of paths: every surface that read the
  // catalogue - homepage, brand pages, landing pages, search - refreshes
  // without this action having to know they exist.
  invalidate(tags.catalogue, tags.product(slug));
  revalidatePath("/admin/products");

  if (!productId) redirect(`/admin/products/${saved.id}`);
  return { status: "success", message: "Product saved." };
}

/** Archiving is a soft delete: history and past orders keep referring to it. */
export async function archiveProduct(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  const productId = String(formData.get("productId") ?? "").trim();
  if (!productId) return { status: "error", message: "No product specified." };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true, deletedAt: true },
  });
  if (!product) return { status: "error", message: "That product no longer exists." };

  const restoring = product.deletedAt !== null;
  await prisma.product.update({
    where: { id: productId },
    data: {
      deletedAt: restoring ? null : new Date(),
      status: restoring ? "DRAFT" : "ARCHIVED",
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: restoring ? "admin.product_restored" : "admin.product_archived",
    entityType: "Product",
    entityId: productId,
    ip: await clientIp(),
  });

  invalidate(tags.catalogue, tags.product(product.slug));
  revalidatePath("/admin/products");
  return {
    status: "success",
    message: restoring ? "Product restored as a draft." : "Product archived.",
  };
}

/** Free text, trimmed, blank collapsed to null — a hardware field left empty on a licence. */
const hardwareField = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((value) => (value ? value : null));

const variantSchema = z.object({
  sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore."),
  name: z.string().trim().min(2).max(160),
  licenceType: z.enum([
    "SUBSCRIPTION_ANNUAL",
    "SUBSCRIPTION_MONTHLY",
    "PERPETUAL",
    "VOLUME",
    "CSP",
    "OEM",
    "EDUCATION",
    "MAINTENANCE",
    "HARDWARE",
  ]),
  audience: z.enum(["COMMERCIAL", "EDUCATION", "NON_PROFIT"]).default("COMMERCIAL"),
  termMonths: z.string().trim().optional(),
  seats: z.coerce.number().int().min(1).max(100000).default(1),
  listPrice: moneyField,
  salePrice: z.string().trim().optional(),
  gstRatePercent: z.coerce.number().int().min(0).max(50).default(18),
  isDefault: z.coerce.boolean().default(false),
  partNumber: hardwareField,
  processor: hardwareField,
  memory: hardwareField,
  storage: hardwareField,
  graphics: hardwareField,
  operatingSystem: hardwareField,
  opticalDrive: hardwareField,
  powerSupply: hardwareField,
  warranty: hardwareField,
  raidController: hardwareField,
  systemManagement: hardwareField,
  configNote: hardwareField,
});

export async function saveVariant(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();

  const productId = String(formData.get("productId") ?? "").trim();
  const variantId = String(formData.get("variantId") ?? "").trim() || null;
  if (!productId) return { status: "error", message: "No product specified." };

  const parsed = variantSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    licenceType: formData.get("licenceType"),
    audience: formData.get("audience") || "COMMERCIAL",
    termMonths: formData.get("termMonths"),
    seats: formData.get("seats") || 1,
    listPrice: formData.get("listPrice"),
    salePrice: formData.get("salePrice"),
    gstRatePercent: formData.get("gstRatePercent") || 18,
    isDefault: formData.get("isDefault") === "on",
    partNumber: formData.get("partNumber"),
    processor: formData.get("processor"),
    memory: formData.get("memory"),
    storage: formData.get("storage"),
    graphics: formData.get("graphics"),
    operatingSystem: formData.get("operatingSystem"),
    opticalDrive: formData.get("opticalDrive"),
    powerSupply: formData.get("powerSupply"),
    warranty: formData.get("warranty"),
    raidController: formData.get("raidController"),
    systemManagement: formData.get("systemManagement"),
    configNote: formData.get("configNote"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;

  const termMonths = input.termMonths ? Number(input.termMonths) : null;
  if (termMonths !== null && (!Number.isInteger(termMonths) || termMonths < 1 || termMonths > 120)) {
    return {
      status: "error",
      message: "Term must be between 1 and 120 months, or left blank for a perpetual licence.",
      fieldErrors: { termMonths: ["Enter 1–120 months, or leave blank."] },
    };
  }

  let salePriceMinor: number | null = null;
  if (input.salePrice && input.salePrice.trim() !== "") {
    const saleParsed = moneyField.safeParse(input.salePrice);
    if (!saleParsed.success) {
      return {
        status: "error",
        message: "Enter a valid sale price, or leave it blank.",
        fieldErrors: { salePrice: ["Enter an amount such as 1250 or 1250.50"] },
      };
    }
    salePriceMinor = saleParsed.data;
    // A "sale" price above list would render a fabricated discount badge.
    if (salePriceMinor >= input.listPrice) {
      return {
        status: "error",
        message: "The sale price must be lower than the list price.",
        fieldErrors: { salePrice: ["Must be lower than the list price."] },
      };
    }
  }

  const sku = input.sku.toUpperCase();
  const skuClash = await prisma.productVariant.findFirst({
    where: { sku, ...(variantId ? { id: { not: variantId } } : {}) },
    select: { id: true },
  });
  if (skuClash) {
    return {
      status: "error",
      message: "That SKU is already in use.",
      fieldErrors: { sku: ["This SKU already exists."] },
    };
  }

  const data = {
    productId,
    sku,
    name: input.name,
    licenceType: input.licenceType,
    audience: input.audience,
    termMonths,
    seats: input.seats,
    currency: "INR",
    listPriceMinor: input.listPrice,
    salePriceMinor,
    gstRatePercent: input.gstRatePercent,
    isDefault: input.isDefault,
    partNumber: input.partNumber,
    processor: input.processor,
    memory: input.memory,
    storage: input.storage,
    graphics: input.graphics,
    operatingSystem: input.operatingSystem,
    opticalDrive: input.opticalDrive,
    powerSupply: input.powerSupply,
    warranty: input.warranty,
    raidController: input.raidController,
    systemManagement: input.systemManagement,
    configNote: input.configNote,
  };

  const saved = await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.productVariant.updateMany({
        where: { productId, ...(variantId ? { id: { not: variantId } } : {}) },
        data: { isDefault: false },
      });
    }

    const variant = variantId
      ? await tx.productVariant.update({ where: { id: variantId }, data, select: { id: true } })
      : await tx.productVariant.create({ data, select: { id: true } });

    // Append to the price history so every change is auditable.
    await tx.price.create({
      data: {
        variantId: variant.id,
        currency: "INR",
        listPriceMinor: data.listPriceMinor,
        salePriceMinor: data.salePriceMinor,
        gstRatePercent: data.gstRatePercent,
        changedById: staff.id,
        note: variantId ? "Price updated in admin." : "Initial price.",
      },
    });

    return variant;
  });

  await recordAudit({
    actorId: staff.id,
    action: variantId ? "admin.variant_updated" : "admin.variant_created",
    entityType: "ProductVariant",
    entityId: saved.id,
    metadata: { sku, listPriceMinor: data.listPriceMinor },
    ip: await clientIp(),
  });

  // `searchText` embeds every SKU, so changing one here would otherwise leave
  // the product unfindable by its new SKU until someone re-saved the product.
  await rebuildProductSearchText(productId);

  // Previously this revalidated /products but not /products/{slug}, so a price
  // change never reached the detail page the customer actually reads.
  const owner = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });
  invalidate(tags.catalogue, ...(owner ? [tags.product(owner.slug)] : []));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: "Licence option saved." };
}

const specSchema = z.object({
  label: z.string().trim().min(1).max(80),
  // "Configuration dependent" is a legitimate value and often the honest
  // one — see the model's own comment — so this is not required to look
  // like a measurement.
  value: z.string().trim().min(1).max(300),
  displayOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export async function saveSpec(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireStaff();

  const productId = String(formData.get("productId") ?? "").trim();
  const specId = String(formData.get("specId") ?? "").trim() || null;
  if (!productId) return { status: "error", message: "No product specified." };

  const parsed = specSchema.safeParse({
    label: formData.get("label"),
    value: formData.get("value"),
    displayOrder: formData.get("displayOrder") || 0,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const { label, value, displayOrder } = parsed.data;

  const clash = await prisma.productSpec.findFirst({
    where: { productId, label, ...(specId ? { id: { not: specId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      status: "error",
      message: "This product already has a specification with that label.",
      fieldErrors: { label: ["Already used — edit that row instead, or choose a different label."] },
    };
  }

  const data = { productId, label, value, displayOrder };
  if (specId) {
    await prisma.productSpec.update({ where: { id: specId }, data });
  } else {
    await prisma.productSpec.create({ data });
  }

  const owner = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  invalidate(tags.catalogue, ...(owner ? [tags.product(owner.slug)] : []));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: "Specification saved." };
}

export async function deleteSpec(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireStaff();

  const productId = String(formData.get("productId") ?? "").trim();
  const specId = String(formData.get("specId") ?? "").trim();
  if (!productId || !specId) return { status: "error", message: "Nothing to delete." };

  await prisma.productSpec.delete({ where: { id: specId, productId } });

  const owner = await prisma.product.findUnique({ where: { id: productId }, select: { slug: true } });
  invalidate(tags.catalogue, ...(owner ? [tags.product(owner.slug)] : []));
  revalidatePath(`/admin/products/${productId}`);
  return { status: "success", message: "Specification removed." };
}

const enquiryUpdateSchema = z.object({
  reference: z.string().trim().regex(/^ENQ-\d{4}-[A-Z0-9]{6}$/),
  status: z.enum(RFQ_STATUSES as [EnquiryStatus, ...EnquiryStatus[]]),
  internalNotes: z.string().max(6000).optional(),
});

export async function updateEnquiry(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();

  const parsed = enquiryUpdateSchema.safeParse({
    reference: formData.get("reference"),
    status: formData.get("status"),
    internalNotes: formData.get("internalNotes"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That update could not be applied." };
  }

  /*
   * The move is checked against where it is coming from, not merely against the
   * enum. A status that says an order exists must only be reachable by an order
   * existing, and a submitted requirement must not be pushed back to a draft
   * the customer never saw.
   */
  const current = await prisma.enquiry.findUnique({
    where: { reference: parsed.data.reference },
    select: { status: true },
  });
  if (!current) return { status: "error", message: "That enquiry no longer exists." };

  if (parsed.data.status !== current.status && !canTransition(current.status, parsed.data.status)) {
    return {
      status: "error",
      message: `A requirement that is ${RFQ_STATUS_LABELS[current.status].toLowerCase()} cannot be moved to ${RFQ_STATUS_LABELS[parsed.data.status].toLowerCase()}.`,
    };
  }

  await prisma.enquiry.update({
    where: { reference: parsed.data.reference },
    data: {
      status: parsed.data.status,
      internalNotes: parsed.data.internalNotes?.trim() || null,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.enquiry_updated",
    entityType: "Enquiry",
    entityId: parsed.data.reference,
    metadata: { status: parsed.data.status },
    ip: await clientIp(),
  });

  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${parsed.data.reference}`);
  return { status: "success", message: "Enquiry updated." };
}

const roleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum([
    "CUSTOMER",
    "SALES",
    "SALES_MANAGER",
    "DIRECTOR",
    "PROCUREMENT",
    "OPERATIONS",
    "ACCOUNTS",
    "SUPPORT",
    "ADMIN",
  ]),
});

/**
 * Role changes are restricted to ADMIN, and an administrator cannot change
 * their own role - which prevents both privilege escalation by a SALES account
 * and an administrator accidentally locking the organisation out.
 */
export async function updateUserRole(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const parsed = roleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { status: "error", message: "That change could not be applied." };

  if (parsed.data.userId === admin.id) {
    return { status: "error", message: "You cannot change your own role." };
  }

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, deletedAt: null },
    select: { id: true, role: true },
  });
  if (!target) return { status: "error", message: "That user no longer exists." };

  // Never remove the last administrator.
  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN", deletedAt: null } });
    if (adminCount <= 1) {
      return { status: "error", message: "There must be at least one administrator." };
    }
  }

  await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });

  // A role change takes effect immediately rather than at the next sign-in.
  await prisma.session.updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    actorId: admin.id,
    action: "admin.role_changed",
    entityType: "User",
    entityId: target.id,
    metadata: { from: target.role, to: parsed.data.role },
    ip: await clientIp(),
  });

  revalidatePath("/admin/users");
  return { status: "success", message: "Role updated and existing sessions revoked." };
}
