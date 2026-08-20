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
  register: { limit: 5, windowSeconds: 3600 },
  passwordReset: { limit: 5, windowSeconds: 3600 },
  enquiry: { limit: 10, windowSeconds: 3600 },
  contact: { limit: 6, windowSeconds: 3600 },
  search: { limit: 90, windowSeconds: 60 },
  adminWrite: { limit: 120, windowSeconds: 60 },
} as const;

/** Test-only helper; not exported through any route. */
export function __clearAll() {
  buckets.clear();
}
