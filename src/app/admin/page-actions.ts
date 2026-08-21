"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { PageSectionType, PageStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { slugify } from "@/lib/utils";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { schemaFor, toLines, toPrismaData } from "@/lib/admin/fields";
import { PAGE_FIELDS } from "@/lib/admin/page-fields";
import { BLOCK_SCHEMAS, BLOCK_SEEDS, isBlockType } from "@/lib/blocks/schemas";
import { BLOCK_FORMS, pruneEmpty, writePath } from "@/lib/blocks/form-shapes";
import { invalidate, tags } from "@/lib/cache";

/**
 * Page and block editing.
 *
 * Content changes here alter what every visitor sees, so every action requires
 * ADMIN rather than staff.
 */

async function admin(): Promise<{ id: string } | AdminActionState> {
  return guard("admin");
}

function invalidatePage(slug: string | null) {
  // Both the page itself and the lists that enumerate pages (sitemap,
  // generateStaticParams) depend on the same tag.
  invalidate(tags.pages, ...(slug ? [tags.page(slug)] : []));
}

// ---------------------------------------------------------------- metadata

export async function savePage(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const pageId = String(formData.get("__id") ?? "").trim() || null;

  const raw: Record<string, unknown> = {};
  for (const field of PAGE_FIELDS) raw[field.name] = formData.get(field.name) ?? undefined;

  const parsed = schemaFor(PAGE_FIELDS).safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const data = toPrismaData(PAGE_FIELDS, parsed.data);

  // A page path may contain slashes, so each segment is slugified separately
  // rather than flattening the whole path into one slug.
  const rawSlug = String(data.slug ?? "") || String(data.title ?? "");
  const slug = rawSlug
    .split("/")
    .map((segment) => slugify(segment))
    .filter(Boolean)
    .join("/");

  if (!slug) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: { slug: ["Enter a URL path."] },
    };
  }

  const clash = await prisma.page.findFirst({
    where: { slug, ...(pageId ? { id: { not: pageId } } : {}) },
    select: { id: true },
  });
  if (clash) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: { slug: ["Another page already uses this path."] },
    };
  }

  const status: PageStatus = data.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  const payload = {
    slug,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    keywords: toLines(String(formData.get("keywords") ?? ""), 20),
    brandId: (data.brandId as string | null) ?? null,
    faqTopic: (data.faqTopic as string | null) ?? null,
    status,
  };

  const saved = pageId
    ? await prisma.page.update({
        where: { id: pageId },
        data: payload,
        select: { id: true, slug: true, publishedAt: true },
      })
    : await prisma.page.create({
        data: { ...payload, breadcrumb: [] },
        select: { id: true, slug: true, publishedAt: true },
      });

  // A page published for the first time gets a publication date, so ordering
  // and "recently published" views have something to sort on.
  if (status === "PUBLISHED" && !saved.publishedAt) {
    await prisma.page.update({ where: { id: saved.id }, data: { publishedAt: new Date() } });
  }

  await recordAudit({
    actorId: staff.id,
    action: pageId ? "admin.page_updated" : "admin.page_created",
    entityType: "Page",
    entityId: saved.id,
    metadata: { slug, status },
    ip: await clientIp(),
  });

  invalidatePage(slug);
  revalidatePath("/admin/pages");

  if (!pageId) redirect(`/admin/pages/${saved.id}`);
  return { status: "success", message: "Page saved." };
}

export async function deletePage(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const pageId = String(formData.get("__id") ?? "").trim();
  if (!pageId) return { status: "error", message: "No page specified." };

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true, deletedAt: true },
  });
  if (!page) return { status: "error", message: "That page no longer exists." };

  const restoring = page.deletedAt !== null;
  await prisma.page.update({
    where: { id: pageId },
    data: { deletedAt: restoring ? null : new Date(), ...(restoring ? {} : { status: "DRAFT" }) },
  });

  await recordAudit({
    actorId: staff.id,
    action: restoring ? "admin.page_restored" : "admin.page_archived",
    entityType: "Page",
    entityId: pageId,
    ip: await clientIp(),
  });

  invalidatePage(page.slug);
  revalidatePath("/admin/pages");
  return {
    status: "success",
    message: restoring ? "Page restored as a draft." : "Page archived.",
  };
}

// ------------------------------------------------------------------ blocks

const blockRef = z.object({
  pageId: z.string().trim().min(1).max(64),
  sectionId: z.string().trim().min(1).max(64).optional(),
});

export async function addBlock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const parsed = blockRef.safeParse({ pageId: formData.get("pageId") });
  const type = formData.get("type");
  if (!parsed.success || !isBlockType(type)) {
    return { status: "error", message: "Choose a block type." };
  }

  const page = await prisma.page.findUnique({
    where: { id: parsed.data.pageId },
    select: { id: true, slug: true },
  });
  if (!page) return { status: "error", message: "That page no longer exists." };

  // Seeds live with the schemas so the two cannot drift; a unit test asserts
  // every one of them still validates.
  const seeded = BLOCK_SEEDS[type];

  const last = await prisma.pageSection.findFirst({
    where: { pageId: page.id },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  await prisma.pageSection.create({
    data: {
      pageId: page.id,
      type: type as PageSectionType,
      displayOrder: (last?.displayOrder ?? 0) + 10,
      data: seeded as Prisma.InputJsonValue,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.block_added",
    entityType: "PageSection",
    entityId: page.id,
    metadata: { type },
    ip: await clientIp(),
  });

  invalidatePage(page.slug);
  revalidatePath(`/admin/pages/${page.id}`);
  return { status: "success", message: "Block added." };
}

/**
 * Saves one block's payload.
 *
 * The submitted JSON is parsed against the schema for the block's *stored*
 * type, never a type from the request, so a payload cannot be validated
 * against a laxer schema than the one it will be rendered with.
 */
export async function saveBlock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return { status: "error", message: "No block specified." };

  const section = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { id: true, type: true, page: { select: { id: true, slug: true } } },
  });
  if (!section) return { status: "error", message: "That block no longer exists." };
  if (!isBlockType(section.type)) {
    return { status: "error", message: "That block has an unrecognised type." };
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(String(formData.get("data") ?? "{}"));
  } catch {
    return {
      status: "error",
      message: "That is not valid JSON.",
      fieldErrors: { data: ["Check for a missing comma, quote or bracket."] },
    };
  }

  const parsed = BLOCK_SCHEMAS[section.type].safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return {
      status: "error",
      message: "This block's content does not match what that block type expects.",
      fieldErrors: { data: issues },
    };
  }

  await prisma.pageSection.update({
    where: { id: sectionId },
    data: {
      data: parsed.data as Prisma.InputJsonValue,
      visible: formData.get("visible") === "on",
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.block_updated",
    entityType: "PageSection",
    entityId: sectionId,
    metadata: { type: section.type },
    ip: await clientIp(),
  });

  invalidatePage(section.page.slug);
  revalidatePath(`/admin/pages/${section.page.id}`);
  return { status: "success", message: "Block saved." };
}

export async function deleteBlock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return { status: "error", message: "No block specified." };

  const section = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { page: { select: { id: true, slug: true } } },
  });
  if (!section) return { status: "error", message: "That block no longer exists." };

  await prisma.pageSection.delete({ where: { id: sectionId } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.block_deleted",
    entityType: "PageSection",
    entityId: sectionId,
    ip: await clientIp(),
  });

  invalidatePage(section.page.slug);
  revalidatePath(`/admin/pages/${section.page.id}`);
  return { status: "success", message: "Block removed." };
}

/**
 * Moves a block up or down.
 *
 * Implemented as a swap of two `displayOrder` values inside a transaction, so
 * a concurrent reorder cannot leave two blocks claiming the same position.
 */
export async function moveBlock(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!sectionId) return { status: "error", message: "No block specified." };

  const section = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { id: true, displayOrder: true, pageId: true, page: { select: { slug: true } } },
  });
  if (!section) return { status: "error", message: "That block no longer exists." };

  const neighbour = await prisma.pageSection.findFirst({
    where: {
      pageId: section.pageId,
      displayOrder: direction === "up" ? { lt: section.displayOrder } : { gt: section.displayOrder },
    },
    orderBy: { displayOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, displayOrder: true },
  });

  if (!neighbour) {
    return { status: "success", message: `Already at the ${direction === "up" ? "top" : "bottom"}.` };
  }

  await prisma.$transaction([
    prisma.pageSection.update({
      where: { id: section.id },
      data: { displayOrder: neighbour.displayOrder },
    }),
    prisma.pageSection.update({
      where: { id: neighbour.id },
      data: { displayOrder: section.displayOrder },
    }),
  ]);

  invalidatePage(section.page.slug);
  revalidatePath(`/admin/pages/${section.pageId}`);
  return { status: "success", message: "Block moved." };
}

/**
 * Saves a block edited through its typed form.
 *
 * The submission is assembled into a payload and then validated by the same
 * schema the JSON editor uses, so both routes into a block converge on one
 * contract — a form cannot write something the JSON editor would reject, or
 * vice versa.
 *
 * Repeatable lists arrive as indexed field names (`items.0.title`). Rows are
 * collected in index order and gaps are closed, so removing the middle row of
 * three does not leave a hole.
 */
export async function saveBlockForm(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  if (!sectionId) return { status: "error", message: "No block specified." };

  const section = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { id: true, type: true, page: { select: { id: true, slug: true } } },
  });
  if (!section) return { status: "error", message: "That block no longer exists." };
  if (!isBlockType(section.type)) {
    return { status: "error", message: "That block has an unrecognised type." };
  }

  const shape = BLOCK_FORMS[section.type];
  if (!shape) {
    return { status: "error", message: "That block type has no form; edit it as JSON." };
  }

  const payload: Record<string, unknown> = {};

  for (const field of shape.fields) {
    switch (field.kind) {
      case "checkbox":
        // An unchecked box submits nothing, so absence means false. Written
        // unconditionally rather than through writePath, which would delete it.
        payload[field.path] = formData.get(field.path) === "on";
        break;

      case "number": {
        const raw = String(formData.get(field.path) ?? "").trim();
        writePath(payload, field.path, raw === "" ? undefined : Number(raw));
        break;
      }

      case "stringList":
        writePath(payload, field.path, toLines(String(formData.get(field.path) ?? ""), 60));
        break;

      case "objectList": {
        const rows: Array<Record<string, string>> = [];
        for (let index = 0; index < 60; index += 1) {
          const row: Record<string, string> = {};
          let present = false;

          for (const sub of field.fields) {
            const value = formData.get(`${field.path}.${index}.${sub.key}`);
            if (value === null) continue;
            present = true;
            const text = String(value).trim();
            if (text !== "") row[sub.key] = text;
          }

          // A row whose fields were all cleared is a deletion, not an empty row.
          if (present && Object.keys(row).length > 0) rows.push(row);
        }
        writePath(payload, field.path, rows);
        break;
      }

      default: {
        const raw = String(formData.get(field.path) ?? "").trim();
        writePath(payload, field.path, raw);
      }
    }
  }

  // "columns" is a select of "2" | "3" | "4" but the schema wants a number.
  if (typeof payload.columns === "string") payload.columns = Number(payload.columns);

  const parsed = BLOCK_SCHEMAS[section.type].safeParse(pruneEmpty(payload));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  await prisma.pageSection.update({
    where: { id: sectionId },
    data: {
      data: parsed.data as Prisma.InputJsonValue,
      visible: formData.get("visible") === "on",
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.block_updated",
    entityType: "PageSection",
    entityId: sectionId,
    metadata: { type: section.type, via: "form" },
    ip: await clientIp(),
  });

  invalidatePage(section.page.slug);
  revalidatePath(`/admin/pages/${section.page.id}`);
  return { status: "success", message: "Block saved." };
}

/** Appends a blank row to a repeatable list so the form shows another entry. */
export async function addBlockListRow(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const sectionId = String(formData.get("sectionId") ?? "").trim();
  const path = String(formData.get("path") ?? "").trim();
  if (!sectionId || !path) return { status: "error", message: "No list specified." };

  const section = await prisma.pageSection.findUnique({
    where: { id: sectionId },
    select: { id: true, type: true, data: true, page: { select: { id: true, slug: true } } },
  });
  if (!section || !isBlockType(section.type)) {
    return { status: "error", message: "That block no longer exists." };
  }

  const shape = BLOCK_FORMS[section.type];
  const field = shape?.fields.find((entry) => entry.path === path && entry.kind === "objectList");
  if (!field || field.kind !== "objectList") {
    return { status: "error", message: "That list could not be extended." };
  }

  const current = (section.data as Record<string, unknown>) ?? {};
  const rows = Array.isArray(current[path]) ? [...(current[path] as unknown[])] : [];

  // Seeded with placeholder text so the new row satisfies the schema
  // immediately; an empty row would make the whole block unsaveable.
  const blank: Record<string, string> = {};
  for (const sub of field.fields) if (sub.required) blank[sub.key] = `New ${sub.label.toLowerCase()}`;
  rows.push(blank);

  const parsed = BLOCK_SCHEMAS[section.type].safeParse({ ...current, [path]: rows });
  if (!parsed.success) {
    return { status: "error", message: "That list is already at its maximum length." };
  }

  await prisma.pageSection.update({
    where: { id: sectionId },
    data: { data: parsed.data as Prisma.InputJsonValue },
  });

  invalidatePage(section.page.slug);
  revalidatePath(`/admin/pages/${section.page.id}`);
  return { status: "success", message: "Row added." };
}
