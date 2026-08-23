"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { schemaFor, toPrismaData } from "@/lib/admin/fields";
import { resolveResource, type ResourceConfig } from "@/lib/admin/resources";
import { delegateFor, invalidRelations } from "@/lib/admin/repository";
import { invalidate } from "@/lib/cache";
import { rebuildSearchTextForBrand, rebuildSearchTextForCategory } from "@/lib/search-text";

/**
 * Generic create, update and archive for registry-declared resources.
 *
 * A `"use server"` module may only export async functions, so one action serves
 * every resource and the target is named by a hidden `__resource` field.
 *
 * ## Why that is safe
 *
 * `__resource` arrives in the request body and is therefore attacker
 * controlled. It is never used to index anything directly: it is matched
 * against the registry by `resolveResource`, which returns null for anything
 * unknown, and the write is refused. The privilege check then comes from the
 * *resolved config* — so an attacker choosing a resource cannot also choose the
 * guard that protects it. Field names are likewise taken from the config, not
 * from the submission, so extra keys in the body (`role`, `deletedAt`, `id`)
 * are dropped rather than written.
 */

async function authorise(
  formData: FormData,
): Promise<{ config: ResourceConfig; staffId: string } | AdminActionState> {
  const config = resolveResource(formData.get("__resource"));
  if (!config) {
    // Deliberately vague: an unknown key should not reveal which keys exist.
    return { status: "error", message: "That resource could not be found." };
  }

  // The guard comes from the resolved config, after the whitelist match.
  const staff = await guard(config.guard);
  if (isFailure(staff)) return staff;

  return { config, staffId: staff.id };
}

function isState(value: unknown): value is AdminActionState {
  return typeof value === "object" && value !== null && "status" in value;
}

export async function saveResource(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const authorised = await authorise(formData);
  if (isState(authorised)) return authorised;
  const { config, staffId } = authorised;

  const recordId = String(formData.get("__id") ?? "").trim() || null;

  // Only declared fields are read out of the submission.
  const raw: Record<string, unknown> = {};
  for (const field of config.fields) {
    raw[field.name] = formData.get(field.name) ?? undefined;
  }

  const parsed = schemaFor(config.fields).safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const data = toPrismaData(config.fields, parsed.data);

  const relationErrors = await invalidRelations(config.fields, data);
  if (Object.keys(relationErrors).length > 0) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: relationErrors,
    };
  }

  const delegate = delegateFor(config);

  // --- Slug handling -------------------------------------------------------
  let slug: string | null = null;
  if (config.slugField) {
    const slugFieldDescriptor = config.fields.find(
      (field) => field.kind === "slug" && field.name === config.slugField,
    );
    const source = slugFieldDescriptor?.kind === "slug" ? slugFieldDescriptor.from : "name";
    const provided = String(data[config.slugField] ?? "");
    slug = slugify(provided || String(data[source] ?? ""));

    if (!slug) {
      return {
        status: "error",
        message: "Please correct the highlighted fields.",
        fieldErrors: { [config.slugField]: ["Enter a URL slug."] },
      };
    }

    const clash = await delegate.findFirst({
      where: { [config.slugField]: slug, ...(recordId ? { id: { not: recordId } } : {}) },
      select: { id: true },
    });
    if (clash) {
      return {
        status: "error",
        message: "Please correct the highlighted fields.",
        fieldErrors: { [config.slugField]: ["This slug is already in use."] },
      };
    }

    data[config.slugField] = slug;
  }

  // --- Per-resource rules --------------------------------------------------
  if (config.key === "categories" && recordId && data.parentId === recordId) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: { parentId: ["A category cannot be its own parent."] },
    };
  }

  if (config.key === "faqs") {
    const attached =
      Boolean(data.brandId) || Boolean(data.serviceId) || Boolean(data.productId) || Boolean(data.topic);
    if (!attached) {
      return {
        status: "error",
        message: "Attach this FAQ to a brand, service, product or topic.",
        fieldErrors: { topic: ["Choose an owner, or enter a topic."] },
      };
    }
  }

  if (config.key === "posts") {
    // A post marked published with no date would never appear, because the
    // public query filters on publishedAt <= now.
    if (data.status === "PUBLISHED" && !data.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  /*
   * A testimonial cannot be published without a recorded consent.
   *
   * Refused here rather than defaulted, which is the difference between this
   * and the rule above it: a missing publish date on an article is a slip with
   * an obvious right answer, and a missing consent date on a testimonial is the
   * absence of the one thing that makes publishing it permissible. Filling it
   * in with today's date would manufacture the record it is asking for.
   *
   * `publishedTestimonials` asks for `consentOn: { not: null }` as well, so a
   * row edited straight in the database still cannot reach a visitor. This is
   * the half that tells a person why.
   */
  if (config.key === "testimonials" && data.status === "PUBLISHED" && !data.consentOn) {
    return {
      status: "error",
      message: "Record the consent before publishing this.",
      fieldErrors: {
        consentOn: [
          "Enter the date this customer agreed we could publish their words, name and organisation.",
        ],
      },
    };
  }

  const saved = recordId
    ? await delegate.update({ where: { id: recordId }, data, select: { id: true } })
    : await delegate.create({ data, select: { id: true } });

  const savedId = String(saved.id);

  await recordAudit({
    actorId: staffId,
    action: recordId ? `admin.${config.key}_updated` : `admin.${config.key}_created`,
    entityType: config.model,
    entityId: savedId,
    metadata: { slug },
    ip: await clientIp(),
  });

  // Renaming a brand or category staleifies the denormalised search haystack of
  // every product beneath it.
  if (config.key === "brands" && recordId) await rebuildSearchTextForBrand(recordId);
  if (config.key === "categories" && recordId) await rebuildSearchTextForCategory(recordId);

  invalidate(...config.tagsFor({ slug }));
  revalidatePath(`/admin/${config.key}`);

  if (!recordId) redirect(`/admin/${config.key}/${savedId}`);
  return { status: "success", message: `${config.label.singular} saved.` };
}

/**
 * Archives or restores a record.
 *
 * Soft delete is used wherever the model supports it, so historical orders and
 * enquiries keep resolving the record they referred to. Resources without
 * `deletedAt` (FAQs, banners) are removed outright, because nothing else
 * references them.
 */
export async function deleteResource(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const authorised = await authorise(formData);
  if (isState(authorised)) return authorised;
  const { config, staffId } = authorised;

  const recordId = String(formData.get("__id") ?? "").trim();
  if (!recordId) return { status: "error", message: "No record specified." };

  const delegate = delegateFor(config);
  const existing = await delegate.findUnique({ where: { id: recordId } });
  if (!existing) return { status: "error", message: "That record no longer exists." };

  const slug = config.slugField ? String(existing[config.slugField] ?? "") : null;

  if (config.softDelete) {
    const restoring = existing.deletedAt !== null;

    if (!restoring) {
      const blocker = await archiveBlocker(config, recordId);
      if (blocker) return { status: "error", message: blocker };
    }

    await delegate.update({
      where: { id: recordId },
      data: { deletedAt: restoring ? null : new Date() },
    });

    await recordAudit({
      actorId: staffId,
      action: restoring ? `admin.${config.key}_restored` : `admin.${config.key}_archived`,
      entityType: config.model,
      entityId: recordId,
      ip: await clientIp(),
    });

    invalidate(...config.tagsFor({ slug }));
    revalidatePath(`/admin/${config.key}`);
    return {
      status: "success",
      message: restoring ? `${config.label.singular} restored.` : `${config.label.singular} archived.`,
    };
  }

  await delegate.delete({ where: { id: recordId } });

  await recordAudit({
    actorId: staffId,
    action: `admin.${config.key}_deleted`,
    entityType: config.model,
    entityId: recordId,
    ip: await clientIp(),
  });

  invalidate(...config.tagsFor({ slug }));
  revalidatePath(`/admin/${config.key}`);
  return { status: "success", message: `${config.label.singular} deleted.` };
}

/**
 * Refuses an archive that would strand live records.
 *
 * Archiving a brand that still has active products would hide the brand page
 * while leaving those products reachable and pointing at it — a broken state
 * that is much harder to notice than a refusal at the point of action.
 */
async function archiveBlocker(config: ResourceConfig, id: string): Promise<string | null> {
  if (config.key === "brands") {
    const count = await prisma.product.count({
      where: { brandId: id, deletedAt: null, status: "ACTIVE" },
    });
    if (count > 0) {
      return `This brand still has ${count} active ${count === 1 ? "product" : "products"}. Archive or reassign them first.`;
    }
  }

  if (config.key === "categories") {
    const [products, children] = await Promise.all([
      prisma.product.count({ where: { categoryId: id, deletedAt: null, status: "ACTIVE" } }),
      prisma.category.count({ where: { parentId: id, deletedAt: null } }),
    ]);
    if (products > 0) {
      return `This category still has ${products} active ${products === 1 ? "product" : "products"}. Move them first.`;
    }
    if (children > 0) {
      return `This category still has ${children} sub${children === 1 ? "category" : "categories"}. Move them first.`;
    }
  }

  return null;
}
