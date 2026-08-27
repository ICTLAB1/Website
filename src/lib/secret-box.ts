import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { authSecret } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Encrypting a credential before it goes in a database column.
 *
 * The payment gateway's key secret and webhook secret are moving into the admin
 * panel, which means they end up in a table — and therefore in every backup,
 * every replica and every `pg_dump` somebody emails themselves. Storing them in
 * plain text would make a database file equivalent to the ability to take
 * payments in this company's name.
 *
 * AES-256-GCM, so the ciphertext is authenticated: a tampered value fails to
 * decrypt rather than decrypting to something else. The key is derived from
 * `AUTH_SECRET` with HKDF under its own `info` string, so it is a different key
 * from anything else that secret protects — a weakness in one does not hand
 * over the others.
 *
 * This is not a substitute for protecting the database. It is the difference
 * between a leaked backup being an incident and a leaked backup being a
 * catastrophe.
 *
 * Rotating `AUTH_SECRET` makes everything stored here undecryptable. That is
 * the correct behaviour — the old ciphertext genuinely is unreadable — and
 * `decryptSecret` returns null rather than throwing, so the site degrades to
 * purchase-order-only and the administrator re-enters the keys. Anything else
 * would take the whole site down over a settings change.
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Format: v1.<iv>.<authTag>.<ciphertext>, each base64url.
 *
 * The version prefix is there so a future change of algorithm can be told apart
 * from the current one and migrated, rather than guessed at.
 */
const VERSION = "v1";

function key(): Buffer {
  return Buffer.from(
    hkdfSync("sha256", authSecret(), "techzoid.secret-box.salt", "techzoid.secret-box.v1", KEY_BYTES),
  );
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/**
 * Returns null on anything that is not a valid, authentic ciphertext.
 *
 * A wrong key, a truncated column, a tampered value and a value written by a
 * future version all land here, and all mean the same thing to a caller: this
 * credential is not usable. Callers treat that as "the gateway is not
 * configured", which is a state the whole payment path already handles.
 */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;

  const parts = stored.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    logger.warn("secret_box_unrecognised_format");
    return null;
  }

  try {
    const [, iv, tag, ciphertext] = parts as [string, string, string, string];
    const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Deliberately no detail in the log. Which of "wrong key" or "tampered
    // value" it was is not useful operationally, and both are worth the same
    // response: treat the credential as absent.
    logger.warn("secret_box_decrypt_failed");
    return null;
  }
}

/**
 * A hint that identifies a stored secret without revealing it.
 *
 * The admin panel shows this beside a write-only field so somebody can tell
 * *which* key is saved — matching it against what Stripe shows them — without
 * the value ever being sent back to a browser.
 */
export function secretHint(plaintext: string): string {
  const tail = plaintext.slice(-4);
  return tail.length === 4 ? `••••••••${tail}` : "••••••••";
}
