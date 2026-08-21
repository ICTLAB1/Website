import "server-only";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Shared prelude for every admin server action.
 *
 * This lives in a plain module rather than in a `"use server"` file for two
 * reasons: a server-action module may only export async functions (so the
 * synchronous `isFailure` could not live there), and both action files need the
 * same prelude without importing each other.
 */

export type GuardResult = { id: string } | AdminActionState;

/**
 * Resolves the acting staff member and applies the admin write rate limit.
 *
 * `level` selects the privilege required. Content resources pass "admin":
 * changing a page, the navigation or a banner alters what every visitor sees,
 * which is a materially larger blast radius than editing one enquiry.
 */
export async function guard(level: "staff" | "admin" = "staff"): Promise<GuardResult> {
  const staff = level === "admin" ? await requireAdmin() : await requireStaff();

  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  return { id: staff.id };
}

export function isFailure(value: GuardResult): value is AdminActionState {
  return "status" in value;
}
