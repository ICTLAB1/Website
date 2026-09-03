import { z } from "zod";

import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getAssistantConfig } from "@/lib/assistant/config";
import { buildSystemPrompt } from "@/lib/assistant/prompt";
import { createMessage, type ChatMessage, type ContentBlock } from "@/lib/assistant/anthropic";
import { TOOLS, executeTool } from "@/lib/assistant/tools";
import { logger } from "@/lib/logger";

/**
 * The chat widget's one endpoint.
 *
 * Stateless on purpose: the client holds the conversation and resends it in
 * full on every turn, the same shape the Anthropic API itself takes. That
 * costs a slightly larger request body as a conversation grows; it buys a
 * server with nothing to clean up, nothing to expire, and no session to leak
 * one visitor's conversation into another's.
 *
 * A tool call is resolved entirely inside this one request — up to
 * `MAX_TOOL_ROUNDS` round trips to the model — so the client only ever sees
 * the assistant's next line of visible text, never the tool-call plumbing
 * behind it.
 */

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

const schema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  // Honeypot: a real visitor never fills this in.
  website: z.string().max(0).optional(),
});

const MAX_TOOL_ROUNDS = 4;

export const POST = withErrorHandling("chat.message", async (request: Request) => {
  const csrfFailure = await verifyCsrf(request);
  if (csrfFailure) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`chat:${ip}`, LIMITS.chat.limit, LIMITS.chat.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "You've sent a lot of messages. Please try again in a while.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("bad_request", "The request could not be read.");
  }

  if (parsed.data.website) {
    // Honeypot — answered as if nothing were wrong, so a bot cannot tell.
    return jsonOk({ reply: "Thanks for your message!", leadCaptured: false });
  }

  const config = await getAssistantConfig();
  if (!config) {
    return jsonError("not_found", "Chat is not available right now. Please use the contact form instead.");
  }

  const system = await buildSystemPrompt(config.assistantName);
  const transcript = parsed.data.messages.map((m) => `${m.role === "user" ? "Visitor" : config.assistantName}: ${m.content}`).join("\n");

  let messages: ChatMessage[] = parsed.data.messages.map((m) => ({ role: m.role, content: m.content }));
  let leadCaptured = false;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await createMessage(config.apiKey, { system, messages, tools: TOOLS });

    if (!result.ok) {
      logger.error("chat_message_failed", { reason: result.reason, round });
      return jsonError("internal_error", "Something went wrong. Please try again, or contact us directly.");
    }

    if (result.stopReason !== "tool_use") {
      const text = result.content
        .filter((block): block is { type: "text"; text: string } => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      return jsonOk({
        reply: text || "Sorry, I didn't quite catch that — could you say it differently?",
        leadCaptured,
      });
    }

    // Assistant's turn, tool calls included, goes back into history verbatim —
    // the API requires the exact content it sent to be echoed back before it
    // will accept the matching tool_result.
    messages = [...messages, { role: "assistant", content: result.content }];

    const toolUses = result.content.filter(
      (block): block is Extract<ContentBlock, { type: "tool_use" }> => block.type === "tool_use",
    );

    const toolResults: ContentBlock[] = [];
    for (const use of toolUses) {
      const outcome = await executeTool(use.name, use.input, { transcript });
      if (use.name === "capture_lead" && !outcome.isError) leadCaptured = true;
      toolResults.push({
        type: "tool_result",
        tool_use_id: use.id,
        content: outcome.content,
        is_error: outcome.isError,
      });
    }

    messages = [...messages, { role: "user", content: toolResults }];
  }

  logger.warn("chat_tool_rounds_exhausted", {});
  return jsonOk({
    reply: "Let me get someone from our team to help with that directly — could you share your email so they can follow up?",
    leadCaptured,
  });
});
