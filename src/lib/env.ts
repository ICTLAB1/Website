import "server-only";

/**
 * Server-side environment access.
 *
 * Nothing in this module may be imported from a Client Component: every value
 * here is server-only and must never be inlined into the browser bundle. No
 * secret is ever exposed through a NEXT_PUBLIC_* variable.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`,
    );
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export const isProduction = process.env.NODE_ENV === "production";

/** Absolute canonical origin, no trailing slash. */
export function appUrl(): string {
  const raw = process.env.APP_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Secret used to derive HMAC keys. Required in production; development falls
 * back to a clearly-marked insecure constant so a fresh clone still boots.
 */
export function authSecret(): string {
  if (isProduction) {
    const secret = required("AUTH_SECRET");
    if (secret.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters.");
    }
    return secret;
  }
  return process.env.AUTH_SECRET?.trim() || "insecure-development-secret-do-not-use-in-production";
}

export const smtp = {
  host: () => optional("SMTP_HOST"),
  port: () => Number(optional("SMTP_PORT") ?? 587),
  secure: () => optional("SMTP_SECURE") === "true",
  user: () => optional("SMTP_USER"),
  password: () => optional("SMTP_PASSWORD"),
  from: () => optional("MAIL_FROM"),
  salesNotification: () => optional("SALES_NOTIFICATION_EMAIL"),
};

export { optional as optionalEnv, required as requiredEnv };
