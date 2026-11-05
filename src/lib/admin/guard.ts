import "server-only";
import { requireAdmin, requireStaff } from "@/lib/auth/guards";
import { can, type Capability } from "@/lib/auth/capabilities";
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
 * What an action requires: administrator, or a named capability.
 *
 * There is deliberately no "staff" option and no default.
 *
 * There used to be both, and `guard("staff")` was what most actions asked
 * for. It answered "is this person on the payroll", which is not the question
 * any of them needed answered: it let SUPPORT — whose row in the matrix is
 * read-only apart from tickets — draft and issue quotations, move deals
 * through the pipeline, edit a customer's organisation and replace product
 * photographs. The capability matrix had said for a long time that it should
 * not; nothing consulted it.
 *
 * Making the permissive form unrepresentable is the point. An optional
 * capability argument would have fixed the same eleven call sites and left
 * the twelfth, written next year, insecure by default and passing review.
 * With this type, a staff-level action that names no capability does not
 * compile.
 */
export type GuardLevel = "admin" | { capability: Capability };

/**
 * Resolves the acting staff member, checks what they may do, and applies the
 * admin write rate limit.
 *
 * "admin" is for the things whose blast radius is the whole site or the
 * business's own configuration: pages, navigation, credentials, roles.
 * Everything else names the capability it needs, and is refused to a signed-in
 * member of staff who does not hold it.
 */
export async function guard(level: GuardLevel): Promise<GuardResult> {
  const staff = level === "admin" ? await requireAdmin() : await requireStaff();

  if (level !== "admin" && !can(staff, level.capability)) {
    /*
     * Rate limited before this point would leak which capabilities exist by
     * timing; refused after it would let a denied caller spend somebody
     * else's budget. It sits here, after identity and before work, and says
     * nothing about what the capability was.
     */
    return {
      status: "error",
      message: "Your account does not have permission to do that.",
    };
  }

  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  return { id: staff.id };
}

export function isFailure(value: GuardResult): value is AdminActionState {
  return "status" in value;
}
