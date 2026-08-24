import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Persistent, tag-invalidated caching for database reads.
 *
 * React's `cache()` only deduplicates within a single render; this survives
 * across requests until one of its tags is invalidated by a write. The two
 * compose: `cached()` for cross-request reuse, `cache()` for per-render dedup.
 *
 * ## Why dates are revived
 *
 * `unstable_cache` persists its result as JSON, so a `Date` returned by Prisma
 * comes back on a cache hit as an ISO **string**. Every caller that does
 * `post.publishedAt.toISOString()` or passes a value to `formatDate` would then
 * fail — and only on a cache hit, which makes it exactly the kind of bug that
 * passes review and breaks in production once traffic warms the cache.
 *
 * Rather than push `Date | string` onto every caller, the cache layer restores
 * the shape it was given. Revival is keyed on a fixed allowlist of field names
 * drawn from the Prisma schema, not on "does this string look like a date", so
 * a genuine string field that happens to hold an ISO timestamp is never
 * silently converted.
 */

/** Prisma `DateTime` columns in this schema. Keep in step with the models. */
/**
 * Every `DateTime` column in the schema, by name.
 *
 * Exported so a test can hold it against `prisma/schema.prisma` and fail when
 * the two drift. They have drifted before: ten columns were added over several
 * months and none of them was added here, so anything cached came back with a
 * string where the rest of the code expected a Date, and only the pages that
 * happened to format one noticed.
 */
export const DATE_KEYS = new Set([
  "appliedAt",
  "capturedAt",
  "closedAt",
  "closesOn",
  "completedAt",
  "consentOn",
  "createdAt",
  "deletedAt",
  "deliveredAt",
  "dispatchedAt",
  "dueAt",
  "effectiveFrom",
  "emailVerified",
  "endsAt",
  "expectedAt",
  "expectedCloseOn",
  "expiresAt",
  "firstReplyAt",
  "fulfilledAt",
  "issuedAt",
  "lastAttemptAt",
  "lastLoginAt",
  "lastSeenAt",
  "lockedUntil",
  "moderatedAt",
  "occurredAt",
  "partnerConfirmedAt",
  "placedAt",
  "postedOn",
  "publishedAt",
  "purchasedAt",
  "receivedAt",
  "renewedAt",
  "resolvedAt",
  "respondedAt",
  "revokedAt",
  "sentAt",
  "sourceCheckedAt",
  "stageChangedAt",
  "startsAt",
  "submittedAt",
  "supersededAt",
  "updatedAt",
  "usedAt",
  "validUntil",
  "verifiedAt",
  "warrantyEndsAt",
  "warrantyStartsAt",
]);

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Walks a JSON-revived value and turns known date fields back into `Date`.
 * Structure is preserved; only allowlisted keys holding an ISO-8601 string are
 * converted.
 */
export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => reviveDates(entry)) as unknown as T;
  }

  if (value === null || typeof value !== "object") return value;

  // Anything that is already a Date (a cache miss returns live Prisma objects)
  // must be handed back untouched.
  if (value instanceof Date) return value;

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(source)) {
    if (DATE_KEYS.has(key) && typeof entry === "string" && ISO_8601.test(entry)) {
      result[key] = new Date(entry);
    } else {
      result[key] = reviveDates(entry);
    }
  }

  return result as T;
}

/**
 * Wraps a query in the persistent data cache under a set of tags.
 *
 * `keyParts` must uniquely identify the query: the cache is shared across every
 * caller of the same key, and the wrapped function's arguments are serialised
 * into it by Next.
 */
export function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  tags: string[],
  revalidateSeconds = 3600,
): (...args: Args) => Promise<Result> {
  const wrapped = unstable_cache(fn, keyParts, { tags, revalidate: revalidateSeconds });
  return async (...args: Args) => reviveDates(await wrapped(...args));
}
