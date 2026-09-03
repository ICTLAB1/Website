import "server-only";
import { logger } from "@/lib/logger";

/**
 * The Anthropic Messages API, as much of it as the chat widget uses.
 *
 * Written against `fetch` rather than the SDK, for the same reason
 * `lib/payments/stripe.ts` gives: the surface used here is one POST and a
 * response shape, worth being able to read in full, and an SDK in the
 * dependency tree buys nothing this file does not already have.
 */

const API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Haiku, not a larger model, by design: this is product Q&A and lead capture,
 * where a fast, inexpensive answer served to every visitor beats a slower,
 * pricier one served to few. See the model selection made when this was built.
 */
export const ASSISTANT_MODEL = "claude-haiku-4-5-20251001";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

export type ChatMessage = { role: "user" | "assistant"; content: string | ContentBlock[] };

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type CreateMessageResult =
  | {
      ok: true;
      content: ContentBlock[];
      stopReason: string;
    }
  | { ok: false; reason: string };

export async function createMessage(
  apiKey: string,
  input: {
    system: string;
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    maxTokens?: number;
  },
): Promise<CreateMessageResult> {
  let response: Response;
  try {
    response = await fetch(API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: ASSISTANT_MODEL,
        max_tokens: input.maxTokens ?? 1024,
        system: input.system,
        messages: input.messages,
        tools: input.tools,
      }),
      // A model that has stopped answering must not hold the request open
      // until the platform's own timeout — the widget shows a plain "try
      // again" instead.
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    logger.error("assistant_unreachable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "The assistant could not be reached." };
  }

  const payload = (await response.json().catch(() => null)) as {
    content?: ContentBlock[];
    stop_reason?: string;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    logger.error("assistant_request_rejected", {
      status: response.status,
      message: payload?.error?.message ?? "",
    });
    return { ok: false, reason: "The assistant is unavailable right now." };
  }

  if (!Array.isArray(payload?.content)) {
    logger.error("assistant_response_malformed", { status: response.status });
    return { ok: false, reason: "The assistant returned an unusable response." };
  }

  return { ok: true, content: payload.content, stopReason: payload.stop_reason ?? "end_turn" };
}
