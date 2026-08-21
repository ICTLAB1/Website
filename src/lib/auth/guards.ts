import "server-only";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { verificationEnforced } from "@/lib/auth/email-verification";

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

/**
 * Whether this account may transact.
 *
 * An unverified address may sign in and look around; it may not submit an
 * enquiry, accept a quotation or place an order. The line is here because
 * everything past it results in us emailing something that matters — a
 * quotation, an invoice, a licence key — and an unverified address is a typo
 * waiting to send one of those to a stranger.
 *
 * Stands down entirely when SMTP is unconfigured. There is no way to receive a
 * link on such a deployment, so enforcing it would lock every new customer out
 * with no route back; a mail problem should cost features, never access.
 */
export function canTransact(user: { emailVerified: Date | null } | null): boolean {
  if (!user) return false;
  if (!verificationEnforced()) return true;
  return user.emailVerified !== null;
}

/**
 * For pages: requires a verified address, having already required a session.
 *
 * Sends an unverified user to the page that explains why and offers a fresh
 * link, rather than to a bare error.
 */
export async function requireVerified(returnTo?: string): Promise<SessionUser> {
  const user = await requireUser(returnTo);
  if (!canTransact(user)) redirect("/verify-email/required");
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
