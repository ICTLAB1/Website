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
 * pricier one served to few.
 *
 * The current Haiku, which is both the newer model and a tenth of the price of
 * the one this started on — $0.10/$0.50 per million tokens against Haiku 4.5's
 * $1.00/$5.00. On a widget offered to every visitor that is the difference
 * between a cost worth watching and one nobody has to think about.
 *
 * Thinking is adaptive and on by default on this model, which needs nothing
 * from the loop in `/api/chat`: it already echoes the assistant's content back
 * verbatim, because the API requires exactly what it sent before it will
 * accept the matching `tool_result`, and that is also the rule for thinking
 * blocks. `effort` is set low below — this is a two-sentence answer in a chat
 * box, and depth here buys latency rather than a better reply.
 */
export const ASSISTANT_MODEL = "claude-haiku-5-5";

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean }
  /*
   * Named rather than left off the union, because the model returns these and
   * the chat loop passes them back. Nothing reads the field — `display`
   * defaults to omitted, so the text arrives empty — but a block the type
   * claims cannot exist is a block somebody will eventually filter out, and
   * filtering one out is what breaks the next request.
   */
  | { type: "thinking"; thinking: string; signature?: string };

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
        // Two or three sentences in a chat widget. Higher effort would buy
        // depth this answer has no room for, and pay for it in latency a
        // visitor is sitting and watching.
        output_config: { effort: "low" },
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
