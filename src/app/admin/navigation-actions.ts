"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NavigationMenu } from "@prisma/client";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { safeHref } from "@/lib/blocks/schemas";
import { invalidate, tags } from "@/lib/cache";

/**
 * Navigation editing.
 *
 * The header, footer and utility menus are a two-level tree, which no flat
 * field list can express — so this is a bespoke screen, like the block editor,
 * rather than another entry in the resource registry.
 *
 * Every href goes through `safeHref`, the same schema the content blocks use.
 * A menu link is the one place on the site where an administrator's input
 * becomes an anchor target on every page, so `javascript:` and `data:` URLs
 * have to be impossible here for the same reason they are impossible in a
 * block, and the property is unit-tested once for both.
 */

const MENUS = ["HEADER", "FOOTER", "UTILITY"] as const;

async function admin(): Promise<{ id: string } | AdminActionState> {
  return guard("admin");
}

function invalidateNavigation() {
  // The header and footer render on every page, so this reaches the whole site.
  invalidate(tags.navigation);
  revalidatePath("/admin/navigation");
}

const itemSchema = z.object({
  label: z.string().trim().min(1, "Enter a label.").max(120),
  // A heading with children is a label, not a link, so an empty href is valid.
  href: z
    .union([z.literal(""), safeHref])
    .optional()
    .transform((value) => (value ? value : null)),
  description: z.string().trim().max(300).optional(),
  visible: z.boolean().optional().default(true),
});

function readItem(formData: FormData) {
  return itemSchema.safeParse({
    label: formData.get("label") ?? "",
    href: String(formData.get("href") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
    visible: formData.get("visible") === "on",
  });
}

/** Adds a top-level item to a menu, or a child of an existing item. */
export async function addNavigationItem(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const menu = String(formData.get("menu") ?? "");
  if (!MENUS.includes(menu as (typeof MENUS)[number])) {
    return { status: "error", message: "Unknown menu." };
  }

  const parentId = String(formData.get("parentId") ?? "").trim() || null;

  if (parentId) {
    // A parent must exist, must belong to the menu being edited, and must
    // itself be top level: the tree the header renders is two deep, and a
    // third level would simply not appear.
    const parent = await prisma.navigationItem.findUnique({
      where: { id: parentId },
      select: { id: true, menu: true, parentId: true },
    });
    if (!parent) return { status: "error", message: "That parent no longer exists." };
    if (parent.menu !== menu) {
      return { status: "error", message: "That parent belongs to a different menu." };
    }
    if (parent.parentId) {
      const grandparent = await prisma.navigationItem.findUnique({
        where: { id: parent.parentId },
        select: { parentId: true },
      });
      if (grandparent?.parentId) {
        return { status: "error", message: "Menus are two levels deep; this would be a third." };
      }
    }
  }

  const parsed = readItem(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const last = await prisma.navigationItem.findFirst({
    where: { menu: menu as NavigationMenu, parentId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  const created = await prisma.navigationItem.create({
    data: {
      menu: menu as NavigationMenu,
      parentId,
      label: parsed.data.label,
      href: parsed.data.href,
      description: parsed.data.description ?? null,
      visible: parsed.data.visible,
      displayOrder: (last?.displayOrder ?? 0) + 10,
    },
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.navigation_created",
    entityType: "NavigationItem",
    entityId: created.id,
    metadata: { menu, parentId },
    ip: await clientIp(),
  });

  invalidateNavigation();
  return { status: "success", message: "Link added." };
}

export async function saveNavigationItem(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const id = String(formData.get("itemId") ?? "").trim();
  if (!id) return { status: "error", message: "No link specified." };

  const existing = await prisma.navigationItem.findUnique({
    where: { id },
    select: { id: true, menu: true },
  });
  if (!existing) return { status: "error", message: "That link no longer exists." };

  const parsed = readItem(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  await prisma.navigationItem.update({
    where: { id },
    data: {
      label: parsed.data.label,
      href: parsed.data.href,
      description: parsed.data.description ?? null,
      visible: parsed.data.visible,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.navigation_updated",
    entityType: "NavigationItem",
    entityId: id,
    metadata: { menu: existing.menu },
    ip: await clientIp(),
  });

  invalidateNavigation();
  return { status: "success", message: "Link saved." };
}

/**
 * Swaps a link with its neighbour.
 *
 * Ordering is a swap of two `displayOrder` values inside a transaction rather
 * than a renumber of the whole list, so two administrators reordering at once
 * cannot leave the menu half-renumbered. Neighbours are found within the same
 * menu *and* the same parent, so moving a child never walks it out of its
 * column.
 */
export async function moveNavigationItem(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const id = String(formData.get("itemId") ?? "").trim();
  const direction = formData.get("direction") === "up" ? "up" : "down";
  if (!id) return { status: "error", message: "No link specified." };

  const item = await prisma.navigationItem.findUnique({
    where: { id },
    select: { id: true, menu: true, parentId: true, displayOrder: true },
  });
  if (!item) return { status: "error", message: "That link no longer exists." };

  const neighbour = await prisma.navigationItem.findFirst({
    where: {
      menu: item.menu,
      parentId: item.parentId,
      displayOrder: direction === "up" ? { lt: item.displayOrder } : { gt: item.displayOrder },
    },
    orderBy: { displayOrder: direction === "up" ? "desc" : "asc" },
    select: { id: true, displayOrder: true },
  });

  if (!neighbour) {
    return {
      status: "success",
      message: `Already ${direction === "up" ? "first" : "last"} in its list.`,
    };
  }

  await prisma.$transaction([
    prisma.navigationItem.update({
      where: { id: item.id },
      data: { displayOrder: neighbour.displayOrder },
    }),
    prisma.navigationItem.update({
      where: { id: neighbour.id },
      data: { displayOrder: item.displayOrder },
    }),
  ]);

  invalidateNavigation();
  return { status: "success", message: "Link moved." };
}

/**
 * Deletes a link and, through the schema's cascade, everything under it.
 *
 * The count is reported back so a heading that takes a whole column with it
 * says so, rather than the administrator discovering it on the live site.
 */
export async function deleteNavigationItem(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await admin();
  if (isFailure(staff)) return staff;

  const id = String(formData.get("itemId") ?? "").trim();
  if (!id) return { status: "error", message: "No link specified." };

  const item = await prisma.navigationItem.findUnique({
    where: { id },
    select: { id: true, label: true, menu: true, _count: { select: { children: true } } },
  });
  if (!item) return { status: "error", message: "That link no longer exists." };

  await prisma.navigationItem.delete({ where: { id } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.navigation_deleted",
    entityType: "NavigationItem",
    entityId: id,
    metadata: { menu: item.menu, label: item.label, children: item._count.children },
    ip: await clientIp(),
  });

  invalidateNavigation();
  return {
    status: "success",
    message:
      item._count.children > 0
        ? `Removed "${item.label}" and ${item._count.children} link${item._count.children === 1 ? "" : "s"} beneath it.`
        : `Removed "${item.label}".`,
  };
}
