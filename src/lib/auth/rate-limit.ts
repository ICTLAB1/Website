import "server-only";
import { logger } from "@/lib/logger";

/**
 * Fixed-window rate limiter held in process memory.
 *
 * This is sufficient for a single application instance. When running more than
 * one instance, back `hit()` with a shared store (Redis `INCR` + `EXPIRE`);
 * the call signature is designed so only this file changes.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 20_000;

function sweep(now: number) {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function hit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    logger.warn("rate_limit_exceeded", { key, limit, windowSeconds });
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Clears a bucket after a successful action (e.g. a correct sign-in). */
export function reset(key: string) {
  buckets.delete(key);
}

export const LIMITS = {
  login: { limit: 8, windowSeconds: 300 },
  /*
   * Sign-up, limited in two places for two different reasons.
   *
   * `register` is the per-address limit and is the strict one: repeated
   * sign-ups at one email address are somebody probing whether it already has
   * an account, or trying to bury its owner in confirmation mail. Three an
   * hour is more than anybody needs.
   *
   * `registerIp` is deliberately loose, because an IP address is not a person.
   * A customer's procurement team sits behind one office NAT, and at five an
   * hour the sixth colleague to sign up was told "too many sign-up attempts"
   * with nothing they could do about it — this limiter's own gate ran into it,
   * which is how it was found. Twenty still stops a script, and an account is
   * inert until its address is verified.
   */
  register: { limit: 3, windowSeconds: 3600 },
  registerIp: { limit: 20, windowSeconds: 3600 },
  passwordReset: { limit: 5, windowSeconds: 3600 },
  enquiry: { limit: 10, windowSeconds: 3600 },
  contact: { limit: 6, windowSeconds: 3600 },
  search: { limit: 90, windowSeconds: 60 },
  adminWrite: { limit: 120, windowSeconds: 60 },
  /*
   * Each message is a paid model call, so this is the one limiter here also
   * defending a budget rather than only abuse. Thirty an hour is more than a
   * real conversation needs and still cheap for a script to exhaust slowly —
   * the message-length and history-length caps in the route do the rest.
   */
  chat: { limit: 30, windowSeconds: 3600 },
} as const;

/** Test-only helper; not exported through any route. */
export function __clearAll() {
  buckets.clear();
}
