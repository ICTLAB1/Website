"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { buildSearchText, rebuildProductSearchText } from "@/lib/search-text";
import { invalidate, tags } from "@/lib/cache";

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
  ]),
  termMonths: z.string().trim().optional(),
  seats: z.coerce.number().int().min(1).max(100000).default(1),
  listPrice: moneyField,
  salePrice: z.string().trim().optional(),
  gstRatePercent: z.coerce.number().int().min(0).max(50).default(18),
  isDefault: z.coerce.boolean().default(false),
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
    termMonths: formData.get("termMonths"),
    seats: formData.get("seats") || 1,
    listPrice: formData.get("listPrice"),
    salePrice: formData.get("salePrice"),
    gstRatePercent: formData.get("gstRatePercent") || 18,
    isDefault: formData.get("isDefault") === "on",
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
    termMonths,
    seats: input.seats,
    currency: "INR",
    listPriceMinor: input.listPrice,
    salePriceMinor,
    gstRatePercent: input.gstRatePercent,
    isDefault: input.isDefault,
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

const enquiryUpdateSchema = z.object({
  reference: z.string().trim().regex(/^ENQ-\d{4}-[A-Z0-9]{6}$/),
  status: z.enum(["NEW", "IN_REVIEW", "QUOTED", "WON", "LOST", "CLOSED"]),
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
  role: z.enum(["CUSTOMER", "SALES", "ADMIN"]),
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
