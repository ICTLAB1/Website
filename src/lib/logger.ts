import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Structured server-side logging with automatic redaction.
 *
 * Diagnostic detail stays on the server. Clients only ever receive a generic
 * message plus the correlation id, so stack traces, SQL, file paths and
 * configuration never reach a browser.
 */

const REDACTED = "[redacted]";

const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|apikey|api_key|credential|hash|otp|cvv|card|pan|gstin|jwt|session)/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.length > 2048 ? `${value.slice(0, 2048)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(entry, depth + 1);
    }
    return output;
  }
  return REDACTED;
}

export function newCorrelationId(): string {
  return randomUUID();
}

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context: redact(context) } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") emit("debug", message, context);
  },
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
};

/**
 * Logs an unexpected error server-side and returns the correlation id to hand
 * back to the caller.
 */
export function logUnexpected(scope: string, error: unknown): string {
  const correlationId = newCorrelationId();
  logger.error("unhandled_error", {
    correlationId,
    scope,
    name: error instanceof Error ? error.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return correlationId;
}
