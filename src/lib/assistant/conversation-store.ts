import "server-only";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/db";
import { authSecret } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Where a conversation with the assistant is kept.
 *
 * ## The thing this makes visible
 *
 * Until now a conversation left a trace only when it became a lead, so the
 * only transcripts anybody could read were the ones that had already worked.
 * Every visitor who asked something the assistant answered badly, asked for a
 * product the catalogue does not carry, or got as far as a price and closed
 * the tab, was invisible. That is the population worth reading: the lead
 * transcripts tell you what is working, and only these tell you what is not.
 *
 * ## Why the client is not trusted with the id
 *
 * The chat endpoint is stateless — the client holds the conversation and
 * resends it — so the only way to join two turns is an identifier that
 * travels with them. The server issues it rather than accepting one, and
 * before appending to an existing row it checks that the request comes from
 * the same source as the turn before. Without that check, anybody who can
 * guess a cuid can overwrite a stranger's transcript; with it, the worst case
 * is that a visitor whose address changes mid-conversation starts a second
 * row, which is a cosmetic problem rather than a correctness one.
 *
 * ## What is stored about the visitor
 *
 * The messages, the page it started on, and a hash. Not the address: the hash
 * answers "is this the same visitor as the turn before" and "is one person
 * generating all of this", and neither question needs a value that can be read
 * back. Whatever a visitor types into a chat box is theirs — if they type a
 * phone number it is stored, which is why this is named in the privacy policy
 * and swept by the published retention period rather than kept indefinitely.
 *
 * ## Failure is silent, deliberately
 *
 * Every function here swallows its own errors and logs them. A conversation
 * the business cannot read later is a lost insight; a chat that returns 500
 * because a logging table was unavailable is a lost customer. The feature
 * this supports must never be able to break the feature it observes.
 */

export type StoredMessage = { role: "user" | "assistant"; content: string };

/**
 * A source address, reduced to something that cannot be read back.
 *
 * Keyed with `AUTH_SECRET` so the digest cannot be recomputed from a list of
 * candidate addresses by anybody who does not hold it, and truncated because
 * the full digest buys nothing this uses.
 */
export function hashSource(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`chat:${authSecret()}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Writes this turn, and returns the id the next turn should send back.
 *
 * Returns null when nothing could be written, which the caller passes to the
 * client unchanged: a conversation that cannot be stored simply is not, and
 * the visitor never learns that anything was wrong.
 */
export async function recordTurn(input: {
  conversationId: string | null;
  messages: StoredMessage[];
  ipHash: string | null;
  startedOn: string | null;
}): Promise<string | null> {
  try {
    if (input.conversationId) {
      /*
       * Matched on the id *and* the source. A mismatch is not an error worth
       * surfacing — it is either an address that changed mid-conversation or
       * somebody guessing ids — and in both cases the right answer is to
       * start a new row rather than refuse or overwrite.
       */
      const updated = await prisma.chatConversation.updateMany({
        where: { id: input.conversationId, ipHash: input.ipHash },
        data: { messages: input.messages },
      });
      if (updated.count === 1) return input.conversationId;
    }

    const created = await prisma.chatConversation.create({
      data: {
        messages: input.messages,
        ipHash: input.ipHash,
        startedOn: input.startedOn,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    logger.error("chat_conversation_not_stored", { error: String(error) });
    return null;
  }
}

/** Records which lead a conversation produced, once one has been captured. */
export async function attachLead(conversationId: string | null, reference: string): Promise<void> {
  if (!conversationId) return;
  try {
    await prisma.chatConversation.updateMany({
      where: { id: conversationId },
      data: { leadReference: reference },
    });
  } catch (error) {
    logger.error("chat_conversation_lead_not_linked", { error: String(error) });
  }
}
