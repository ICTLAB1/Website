import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { authSecret } from "@/lib/env";

/** 256 bits of entropy, URL-safe. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * Keyed hash of a bearer token. Storing the HMAC rather than the token means a
 * read-only database disclosure cannot be replayed against the application.
 */
export function hashToken(token: string): string {
  return createHmac("sha256", authSecret()).update(token).digest("hex");
}

/** Non-reversible, salted identifier for an IP address (audit without storing PII). */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHmac("sha256", authSecret()).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Public reference generator, e.g. ENQ-2026-7F3A9C. Deliberately unrelated to
 * the primary key so references are neither enumerable nor reversible.
 */
export function publicReference(prefix: string, when = new Date()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = randomBytes(6);
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[random[index]! % alphabet.length];
  }
  return `${prefix}-${when.getUTCFullYear()}-${suffix}`;
}
