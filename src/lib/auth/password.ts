import "server-only";
import bcrypt from "bcryptjs";

/**
 * bcrypt with a cost factor of 12. Password hashes never leave the server and
 * are never included in any API response or log entry.
 */
const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Burns roughly the same amount of time as a real verification so that
 * "unknown email" and "wrong password" are not distinguishable by timing.
 */
export async function fakeVerify(): Promise<void> {
  await bcrypt.compare(
    "timing-equalisation",
    "$2a$12$C6UzMDM.H6dfI/f/IKcEe.7t9x8hDaUY2N.zGmR0m8VfXJbcSPQhO",
  );
}

export { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordPolicyErrors } from "@/lib/password-policy";
