import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The contract with the CRM this business already runs.
 *
 * Deliberately in a file with no database and no network in it, so the shape of
 * an event and the way it is signed can both be tested without either — and so
 * the far end has something to read that is not a server.
 */

/**
 * Every event this platform emits.
 *
 * A closed vocabulary, not free text. The receiving system switches on these
 * strings, so an event named slightly differently is an event that silently
 * does nothing on the other side — which looks exactly like an event that was
 * never sent.
 */
export const CRM_EVENT_KINDS = [
  "deal.created",
  "deal.stage_changed",
  "deal.won",
  "deal.lost",
  "activity.logged",
] as const;

export type CrmEventKind = (typeof CRM_EVENT_KINDS)[number];

/**
 * What a delivery looks like on the wire.
 *
 * Versioned from the first release. A receiver that has to guess which shape it
 * is being sent has already lost, and adding the field later means every
 * existing integration has to cope with its absence.
 */
export const CRM_EVENT_VERSION = 1;

export type CrmEventEnvelope = {
  version: number;
  /** This platform's id for the event. Stable across retries — see below. */
  id: string;
  kind: CrmEventKind;
  /** When the thing happened here, not when it was sent. */
  occurredAt: string;
  entity: { type: string; id: string };
  data: Record<string, unknown>;
};

export function buildEnvelope(input: {
  id: string;
  kind: CrmEventKind;
  occurredAt: Date;
  entityType: string;
  entityId: string;
  data: Record<string, unknown>;
}): CrmEventEnvelope {
  return {
    version: CRM_EVENT_VERSION,
    id: input.id,
    kind: input.kind,
    occurredAt: input.occurredAt.toISOString(),
    entity: { type: input.entityType, id: input.entityId },
    data: input.data,
  };
}

/**
 * The signature header, so the receiver can tell a real event from anyone who
 * guessed the URL.
 *
 * `t=<unix seconds>,v1=<hex hmac>` over `"<t>.<body>"`. The timestamp is inside
 * the signed material rather than beside it, which is what stops somebody
 * replaying yesterday's "deal won" by changing the header — the same
 * construction Stripe uses, for the same reason.
 */
export function signPayload(body: string, secret: string, at = new Date()): string {
  const timestamp = Math.floor(at.getTime() / 1000);
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

/**
 * Verifies a signature. Not used by this platform — it is the sending side —
 * but written and tested here so the receiving end has a reference
 * implementation that is known to agree with the sender.
 *
 * `toleranceSeconds` bounds how old a delivery may be. Without it a captured
 * request stays valid forever.
 */
export function verifySignature(
  body: string,
  header: string,
  secret: string,
  options: { toleranceSeconds?: number; now?: Date } = {},
): boolean {
  const tolerance = options.toleranceSeconds ?? 300;
  const now = options.now ?? new Date();

  const parts = new Map(
    header.split(",").map((piece) => {
      const index = piece.indexOf("=");
      return [piece.slice(0, index).trim(), piece.slice(index + 1).trim()] as const;
    }),
  );

  const timestamp = Number(parts.get("t"));
  const provided = parts.get("v1");
  if (!Number.isFinite(timestamp) || !provided) return false;

  const age = Math.abs(Math.floor(now.getTime() / 1000) - timestamp);
  if (age > tolerance) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");

  // Constant-time: a fast rejection tells an attacker how many leading
  // characters they guessed right.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * How long to wait before trying a failed delivery again, in seconds.
 *
 * Exponential with a ceiling: 1 minute, 5, 25, 2 hours, then hourly. The
 * ceiling matters more than the growth — an endpoint that has been down for a
 * day is usually down for a reason somebody has to fix, and retrying it every
 * thirty seconds until then achieves nothing but noise in two log files.
 */
export function retryDelaySeconds(attempts: number): number {
  return Math.min(60 * 5 ** Math.max(0, attempts - 1), 3600);
}

/**
 * When to stop.
 *
 * Eight attempts spans about six hours, which covers an ordinary outage. Past
 * that the event is abandoned rather than retried forever — but it is kept, so
 * "why did our CRM never see that deal" has an answer.
 */
export const MAX_DELIVERY_ATTEMPTS = 8;

export function shouldAbandon(attempts: number): boolean {
  return attempts >= MAX_DELIVERY_ATTEMPTS;
}

/**
 * Whether an endpoint is one this platform will post to.
 *
 * HTTPS only, and no credentials in the URL. A plaintext endpoint would put a
 * customer's name, the value of a deal and the reason a competitor beat us onto
 * the open internet; a `user:pass@` form would put a secret into every log line
 * that records the URL.
 *
 * Note what this does *not* do: it does not stop an administrator pointing the
 * endpoint at a host inside their own network. That is a legitimate
 * configuration for a CRM that is not on the public internet, and refusing it
 * would break the main use this feature has.
 */
export function endpointProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "That is not a URL.";
  }

  if (url.protocol !== "https:") {
    return "The endpoint must be https. Deal values and customer names would otherwise cross the network in the clear.";
  }
  if (url.username || url.password) {
    return "Put credentials in the signing secret, not in the URL — a URL ends up in logs.";
  }
  return null;
}
