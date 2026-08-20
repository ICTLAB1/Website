import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isProduction } from "@/lib/env";
import { generateToken, hashIp, hashToken } from "@/lib/auth/tokens";
import { clientIp } from "@/lib/auth/request";

export const SESSION_COOKIE = "ictlab_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // absolute expiry: 7 days
const SLIDING_REFRESH_MS = 1000 * 60 * 60 * 24; // extend at most once a day

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  companyName: string | null;
};

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    expires,
  };
}

/** Issues a fresh session and sets the cookie. Called only after authentication. */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipHash: hashIp(await clientIp()),
      userAgent: headerList.get("user-agent")?.slice(0, 255) ?? null,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/**
 * Resolves the signed-in user for the current request.
 *
 * Wrapped in React `cache` so repeated calls within one render share a single
 * database round-trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      lastSeenAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          deletedAt: true,
          companyId: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  if (session.user.deletedAt) return null;

  // Sliding activity timestamp, throttled to avoid a write on every request.
  if (Date.now() - session.lastSeenAt.getTime() > SLIDING_REFRESH_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    companyId: session.user.companyId,
    companyName: session.user.company?.name ?? null,
  };
});

/** Revokes the current session and clears the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .catch(() => undefined);
  }
  store.delete(SESSION_COOKIE);
}

/** Revokes every session for a user - used after a password change or reset. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Housekeeping for expired rows; safe to call from a scheduled job. */
export async function purgeExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
