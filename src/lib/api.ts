import "server-only";
import { NextResponse } from "next/server";
import { logUnexpected } from "@/lib/logger";

/**
 * Uniform JSON responses.
 *
 * Error bodies carry a stable machine code, a safe human message and a
 * correlation id. They never carry stack traces, SQL, file paths or
 * environment data.
 */

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "validation_failed"
  | "internal_error";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  validation_failed: 422,
  internal_error: 500,
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true as const, data }, { status: 200, ...init });
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  extra?: { fieldErrors?: Record<string, string[]>; correlationId?: string; headers?: HeadersInit },
) {
  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code,
        message,
        ...(extra?.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}),
        ...(extra?.correlationId ? { correlationId: extra.correlationId } : {}),
      },
    },
    { status: STATUS[code], headers: extra?.headers },
  );
}

/** Wraps a route handler so no unexpected error escapes with internal detail. */
export function withErrorHandling(
  scope: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      const correlationId = logUnexpected(scope, error);
      return jsonError(
        "internal_error",
        "Something went wrong while processing your request. Please try again or quote the reference below to our team.",
        { correlationId },
      );
    }
  };
}
