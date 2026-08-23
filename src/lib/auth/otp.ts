import { randomInt } from "node:crypto";

/**
 * The one-time code sent at registration.
 *
 * Deliberately free of database and mail concerns so the rules that make a
 * six-digit secret safe can be tested directly. There are only three of them
 * and every one matters:
 *
 * - **Uniform randomness.** `randomInt(0, 1_000_000)` draws from a CSPRNG with
 *   rejection sampling. The obvious alternative, `randomBytes(4)` modulo a
 *   million, is biased — 2³² is not a multiple of 10⁶, so the low codes come up
 *   slightly more often, and "slightly" is a measurable edge to somebody
 *   guessing. `Math.random()` is not a CSPRNG at all and is never right here.
 *
 * - **A short life.** Ten minutes. Long enough to switch to a mail client and
 *   back, short enough that a code left in an inbox is not a standing key.
 *
 * - **A hard attempt cap.** Five. A million possibilities only helps if an
 *   attacker cannot try them; five guesses per code, and a fresh code costs a
 *   rate-limited request.
 */

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;

/** A uniformly random six-digit code, leading zeros preserved. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * What somebody typed, reduced to what could be a code.
 *
 * People paste "123 456", "123-456", and codes with a stray space from the
 * email. Every one of those is the right code entered correctly, and refusing
 * them teaches nobody anything — it just costs a retry. Non-digits are dropped
 * rather than rejected.
 */
export function normaliseCode(input: string): string {
  return input.replace(/\D/g, "");
}

/** Whether a normalised entry is even the right shape to check. */
export function isWellFormedCode(code: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
}

export type CodeCheck =
  | { ok: true }
  | { ok: false; reason: "malformed" | "expired" | "used" | "locked" | "wrong"; remaining?: number };

/**
 * Whether a code may be accepted, given the record it is checked against.
 *
 * Pure: it is handed the stored row and told whether the hashes matched, and
 * decides. The order of the checks is the substance — expiry and the attempt
 * cap are evaluated *before* the comparison result is used, so a caller cannot
 * accidentally accept a correct code against a dead or exhausted record.
 */
export function checkCode(
  entry: string,
  record: { expiresAt: Date; usedAt: Date | null; attempts: number; codeHash: string | null },
  matches: boolean,
  now = new Date(),
): CodeCheck {
  if (!isWellFormedCode(entry) || !record.codeHash) return { ok: false, reason: "malformed" };
  if (record.usedAt) return { ok: false, reason: "used" };
  if (record.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  if (record.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "locked" };
  if (!matches) {
    return { ok: false, reason: "wrong", remaining: MAX_CODE_ATTEMPTS - record.attempts - 1 };
  }
  return { ok: true };
}

/** "123 456" — easier to read off an email and type back. */
export function formatCodeForDisplay(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
