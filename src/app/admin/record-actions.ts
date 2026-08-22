"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { revokeAllSessions } from "@/lib/auth/session";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { resolveDeletable, type DeletableConfig } from "@/lib/admin/deletable";
import { invalidate } from "@/lib/cache";

/**
 * Archive, restore and permanent delete for the commercial records.
 *
 * The content resources have had this since the CRUD framework; these are the
 * screens that never did. See `lib/admin/deletable.ts` for what may be removed
 * and why the two removals differ.
 *
 * As with `resource-actions.ts`, one action serves every record type because a
 * `"use server"` module may only export async functions. The target arrives as
 * `__deletable` in the request body, is matched against the registry rather than
 * used to index anything, and the privilege check comes from the resolved
 * config — so choosing a target never means choosing the guard over it.
 */

type Row = Record<string, unknown>;

type Delegate = {
  findFirst: (args: unknown) => Promise<Row | null>;
  update: (args: unknown) => Promise<Row>;
  delete: (args: unknown) => Promise<Row>;
};

function delegateFor(config: DeletableConfig): Delegate {
  // The model name comes from the registry, never from the request.
  return prisma[config.model] as unknown as Delegate;
}

async function authorise(
  formData: FormData,
): Promise<{ config: DeletableConfig; staffId: string } | AdminActionState> {
  const config = resolveDeletable(formData.get("__deletable"));
  if (!config) {
    // Vague on purpose: an unknown key should not enumerate the known ones.
    return { status: "error", message: "That record could not be found." };
  }

  const staff = await guard(config.guard);
  if (isFailure(staff)) return staff;

  return { config, staffId: staff.id };
}

function isState(value: unknown): value is AdminActionState {
  return typeof value === "object" && value !== null && "status" in value;
}

/**
 * Loads the target, honouring the registry's scope.
 *
 * An id outside the scope reads as missing rather than as refused, so the
 * customer screen cannot be used to confirm that a given id belongs to a
 * member of staff.
 */
async function loadTarget(config: DeletableConfig, id: string): Promise<Row | null> {
  return delegateFor(config).findFirst({
    where: { id, ...(config.scope ?? {}) },
  });
}

function slugOf(row: Row): string | null {
  return typeof row.slug === "string" ? row.slug : null;
}

/**
 * Refuses only what would break the system rather than merely empty it.
 *
 * Deleting your own account signs you out of the panel you are standing in and
 * leaves nobody holding the change. Deleting the last administrator leaves the
 * site with no way back in at all — no screen in this panel can promote anyone
 * once there is no administrator to use it.
 *
 * Nothing else is refused. An administrator asked to be able to delete
 * anything; the screens warn, and then do as they are told.
 */
async function removalBlocker(
  config: DeletableConfig,
  row: Row,
  staffId: string,
): Promise<string | null> {
  if (config.model !== "user") return null;

  if (row.id === staffId) {
    return "You cannot remove your own account. Ask another administrator to do it.";
  }

  if (row.role === "ADMIN") {
    const remaining = await prisma.user.count({
      where: { role: "ADMIN", deletedAt: null, id: { not: String(row.id) } },
    });
    if (remaining === 0) {
      return "This is the last administrator. Promote somebody else first, or nobody will be able to sign in to this panel.";
    }
  }

  return null;
}

/**
 * Archives a record, or restores one already archived.
 *
 * Only for models carrying `deletedAt`. Reversible, so it asks for no
 * confirmation beyond the button itself.
 */
export async function archiveRecord(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const authorised = await authorise(formData);
  if (isState(authorised)) return authorised;
  const { config, staffId } = authorised;

  if (!config.softDelete) {
    return {
      status: "error",
      message: `A ${config.label.singular.toLowerCase()} cannot be archived. Use delete permanently instead.`,
    };
  }

  const id = String(formData.get("__id") ?? "").trim();
  if (!id) return { status: "error", message: "No record specified." };

  const row = await loadTarget(config, id);
  if (!row) return { status: "error", message: "That record no longer exists." };

  const restoring = row.deletedAt !== null;

  if (!restoring) {
    const blocker = await removalBlocker(config, row, staffId);
    if (blocker) return { status: "error", message: blocker };
  }

  await delegateFor(config).update({
    where: { id },
    data: { deletedAt: restoring ? null : new Date() },
  });

  /*
   * An archived person must stop being signed in.
   *
   * Archiving is presented as "this account no longer has access", and a live
   * session cookie would quietly outlive that for as long as it had left to
   * run — the account would be gone from the screen and still working.
   */
  if (config.model === "user" && !restoring) {
    await revokeAllSessions(id);
  }

  await recordAudit({
    actorId: staffId,
    action: restoring ? `admin.${config.key}_restored` : `admin.${config.key}_archived`,
    entityType: config.model,
    entityId: id,
    ip: await clientIp(),
  });

  invalidate(...config.tagsFor({ slug: slugOf(row) }));
  revalidatePath(config.listPath);

  return {
    status: "success",
    message: restoring
      ? `${config.label.singular} restored.`
      : `${config.label.singular} archived. It is hidden everywhere but nothing has been destroyed — restore it from the archived list.`,
  };
}

/**
 * Destroys a record and everything the schema cascades from it.
 *
 * Requires the operator to type the record's own reference back. A dialog that
 * asks "are you sure?" is dismissed without reading; typing `ORD-2026-4KQ2XA`
 * is not something a hand does by accident, and it also proves the operator is
 * looking at the record they think they are — the failure this guards against
 * is not malice but the wrong row.
 */
export async function deleteRecordPermanently(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const authorised = await authorise(formData);
  if (isState(authorised)) return authorised;
  const { config, staffId } = authorised;

  const id = String(formData.get("__id") ?? "").trim();
  if (!id) return { status: "error", message: "No record specified." };

  const row = await loadTarget(config, id);
  if (!row) return { status: "error", message: "That record no longer exists." };

  const expected = String(row[config.confirmField] ?? "");
  const typed = String(formData.get("__confirm") ?? "").trim();

  if (!expected) {
    return {
      status: "error",
      message: "This record has no reference to confirm against, so it cannot be deleted from here.",
    };
  }

  /*
   * Case-insensitive, because an email address is not case-sensitive in
   * practice and a reference read off the screen is often retyped in the wrong
   * case. The point is deliberate intent, not transcription accuracy.
   */
  if (typed.toLowerCase() !== expected.toLowerCase()) {
    return {
      status: "error",
      message: `That does not match. Type the ${config.confirmLabel} exactly as shown: ${expected}`,
      fieldErrors: { __confirm: [`Expected ${expected}`] },
    };
  }

  const blocker = await removalBlocker(config, row, staffId);
  if (blocker) return { status: "error", message: blocker };

  // Sessions first: once the row is gone the userId to revoke against is gone
  // with it, and an orphaned session row would outlive the account.
  if (config.model === "user") await revokeAllSessions(id);

  try {
    await delegateFor(config).delete({ where: { id } });
  } catch (error) {
    /*
     * Every relation that points at these models is SetNull or Cascade, so a
     * refusal here means something the schema does not describe. Say so in a
     * sentence rather than letting a Prisma error reach the screen — the person
     * reading it runs a business, and "Foreign key constraint failed on the
     * field" tells them nothing they can act on.
     */
    logger.error("admin_permanent_delete_failed", {
      key: config.key,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      status: "error",
      message: `${config.label.singular} ${expected} could not be deleted because something still refers to it. Archive it instead, or remove what depends on it first.`,
    };
  }

  await recordAudit({
    actorId: staffId,
    action: `admin.${config.key}_destroyed`,
    entityType: config.model,
    entityId: id,
    // The reference is kept in the log because the row it named is gone: this
    // entry is the only remaining evidence of what was removed.
    metadata: { reference: expected },
    ip: await clientIp(),
  });

  invalidate(...config.tagsFor({ slug: slugOf(row) }));
  revalidatePath(config.listPath);

  /*
   * Away from the record's own page, which no longer has anything to show.
   * Staying put and reporting success would leave the operator looking at a
   * detail screen whose next refresh is a 404. The reference travels in the
   * query so the list can confirm what went, since the row itself cannot.
   */
  redirect(`${config.listPath}?deleted=${encodeURIComponent(expected)}`);
}
