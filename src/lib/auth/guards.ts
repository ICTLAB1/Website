import "server-only";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

/**
 * Authorisation is enforced here, on the server, for every protected page and
 * API route. Hiding a link in the UI is never treated as an access control.
 */

const STAFF_ROLES: UserRole[] = ["ADMIN", "SALES"];

export function isStaff(user: { role: UserRole } | null): boolean {
  return user != null && STAFF_ROLES.includes(user.role);
}

export function isAdmin(user: { role: UserRole } | null): boolean {
  return user?.role === "ADMIN";
}

/** For pages: redirects to sign-in, preserving the intended destination. */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return user;
}

/** For pages: requires a staff role (SALES or ADMIN). */
export async function requireStaff(returnTo = "/admin"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  if (!isStaff(user)) {
    // Deliberately a 404-style response: the existence of the admin area is not
    // confirmed to a non-privileged account.
    redirect("/not-found");
  }
  return user;
}

/** For pages: requires the ADMIN role specifically. */
export async function requireAdmin(returnTo = "/admin"): Promise<SessionUser> {
  const user = await requireStaff(returnTo);
  if (!isAdmin(user)) redirect("/admin");
  return user;
}

export type ApiAuth =
  | { ok: true; user: SessionUser }
  | { ok: false; status: 401 | 403 };

/** For API routes: never redirects, returns a status to map onto a response. */
export async function apiRequireUser(): Promise<ApiAuth> {
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401 };
  return { ok: true, user };
}

export async function apiRequireStaff(): Promise<ApiAuth> {
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401 };
  if (!isStaff(user)) return { ok: false, status: 403 };
  return { ok: true, user };
}

export async function apiRequireAdmin(): Promise<ApiAuth> {
  const user = await getSessionUser();
  if (!user) return { ok: false, status: 401 };
  if (!isAdmin(user)) return { ok: false, status: 403 };
  return { ok: true, user };
}
