import "server-only";
import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { logger } from "@/lib/logger";
import type { CCAvenueConfig } from "@/lib/payments/config";

/**
 * CCAvenue's own gateway, alongside Stripe.
 *
 * Nothing here looks like `stripe.ts`, because CCAvenue's integration is a
 * different shape entirely. There is no API call to open a session: the
 * merchant builds a request, encrypts it with a shared working key, and posts
 * it as a browser form to CCAvenue's own hosted payment page. CCAvenue later
 * posts back — to a redirect URL this deployment controls — an encrypted
 * response.
 *
 * ## Decryption is not authentication, and this comment used to say it was
 *
 * It said decrypting the reply "*is* the proof the call came from CCAvenue".
 * That is wrong and worth correcting in place rather than quietly deleting.
 * AES-128-CBC with no MAC provides confidentiality, not integrity: CBC is
 * malleable by construction, so anyone holding a ciphertext can make targeted
 * changes to the plaintext a block later by flipping bits in the block
 * before it, without the key. And the attacker does hold one — CCAvenue posts
 * the reply back through the paying customer's own browser, so a customer's
 * failed transaction hands them a valid ciphertext under this merchant's
 * working key.
 *
 * ## What actually stops the obvious attack, which is not the cipher
 *
 * Two things, neither of them cryptographic:
 *
 * The amount is never taken from CCAvenue's word. `recordCapture` compares it
 * against the row written before the customer saw a payment page and refuses
 * a mismatch, so flipping `amount` upward or downward achieves nothing.
 *
 * Flipping `order_status` from `Failure` to `Success` — the attack that would
 * matter, and tempting because both words are exactly seven characters — was
 * attempted against this code and could not be made to work. The reason is
 * structural rather than lucky: changing plaintext block *i* requires
 * corrupting block *i-1*, and `order_status=` sits immediately before its own
 * value, so the key is always inside the block that gets destroyed. The
 * field then parses as absent and `decryptCCAvenueResponse` rejects the reply
 * for incompleteness. That is a narrow margin to be safe by, and it is a
 * property of CCAvenue's field ordering, not of anything decided here.
 *
 * ## The residual risk, stated rather than implied
 *
 * This integration marks an order paid on the strength of a status field in
 * an unauthenticated, malleable envelope. The correct remedy is a
 * server-to-server confirmation: ask CCAvenue directly what happened to the
 * order before believing the callback. See `verifyWithGateway` below for
 * where that goes — it is deliberately a named, unimplemented seam rather
 * than a guess at CCAvenue's API, because inventing the shape of a payment
 * verification call from memory is how an integration ends up believing a
 * response nobody checked.
 *
 * Until that is wired, CCAvenue captures warrant reconciliation against the
 * CCAvenue dashboard rather than being taken on trust.
 *
 * The AES-128-CBC key and IV derivation below is CCAvenue's own published
 * algorithm (unchanged across their PHP/Java/.NET/Node integration kits for
 * many years): the key is the raw 16-byte MD5 digest of the working key, and
 * the IV is the fixed byte sequence 0x00..0x0F. Test this end to end in TEST
 * mode before going live — if CCAvenue ever reports a decryption/checksum
 * failure, download their current Integration Kit from the merchant
 * dashboard and diff it against this file rather than guessing.
 */

const IV = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);

function keyFrom(workingKey: string): Buffer {
  return createHash("md5").update(workingKey, "utf8").digest();
}

export function ccavenueEncrypt(plainText: string, workingKey: string): string {
  const cipher = createCipheriv("aes-128-cbc", keyFrom(workingKey), IV);
  return Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]).toString("hex");
}

/** Returns null rather than throwing: a forged or corrupt payload is data, not a crash. */
export function ccavenueDecrypt(hexCipherText: string, workingKey: string): string | null {
  if (!/^[0-9a-fA-F]+$/.test(hexCipherText) || hexCipherText.length % 2 !== 0) return null;
  try {
    const decipher = createDecipheriv("aes-128-cbc", keyFrom(workingKey), IV);
    const bytes = Buffer.concat([
      decipher.update(Buffer.from(hexCipherText, "hex")),
      decipher.final(),
    ]);
    return bytes.toString("utf8");
  } catch {
    // Wrong key, truncated payload, or bad PKCS7 padding — all the same thing
    // from here: this was not a genuine CCAvenue reply.
    return null;
  }
}

/** CCAvenue wants `key=value&key=value`, unencoded — it is encrypted as a whole afterwards. */
function encodeFields(fields: Record<string, string>): string {
  return Object.entries(fields)
    .filter(([, value]) => value.length > 0)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** The reverse: CCAvenue's decrypted reply is the same `key=value&key=value` shape. */
function decodeFields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const index = pair.indexOf("=");
    if (index < 0) continue;
    out[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return out;
}

/** `https://secure.ccavenue.com/…` in LIVE, `https://test.ccavenue.com/…` in TEST. */
export function ccavenueTransactionUrl(mode: "TEST" | "LIVE"): string {
  const host = mode === "LIVE" ? "secure.ccavenue.com" : "test.ccavenue.com";
  return `https://${host}/transaction/transaction.do?command=initiateTransaction`;
}

export type CCAvenueRequestInput = {
  /** This deployment's own token for the attempt — CCAvenue echoes it back unchanged. */
  orderId: string;
  /** Decimal rupees, e.g. "1234.50" — CCAvenue does not take minor units. */
  amount: string;
  currency: string;
  redirectUrl: string;
  cancelUrl: string;
  billingName: string;
  billingEmail: string;
  billingTel: string;
};

/**
 * Builds the encrypted request and the access code that go into the
 * auto-submitting form to CCAvenue's transaction URL.
 *
 * Address fields CCAvenue asks for beyond what this checkout collects
 * (city/state/zip/country) are sent as "NA" — CCAvenue accepts that, and it is
 * honest: this deployment does not collect a structured billing address, only
 * a single free-text line kept for the GST invoice.
 */
export function buildCCAvenueRequest(
  config: CCAvenueConfig,
  input: CCAvenueRequestInput,
): { encRequest: string; accessCode: string; actionUrl: string } {
  const encRequest = ccavenueEncrypt(
    encodeFields({
      merchant_id: config.merchantId,
      order_id: input.orderId,
      currency: input.currency,
      amount: input.amount,
      redirect_url: input.redirectUrl,
      cancel_url: input.cancelUrl,
      language: "EN",
      billing_name: input.billingName,
      billing_email: input.billingEmail,
      billing_tel: input.billingTel,
      billing_country: "India",
      billing_city: "NA",
      billing_state: "NA",
      billing_zip: "NA",
    }),
    config.workingKey,
  );

  return { encRequest, accessCode: config.accessCode, actionUrl: ccavenueTransactionUrl(config.mode) };
}

/**
 * Where an independent confirmation of the transaction belongs.
 *
 * CCAvenue publishes a merchant API for querying an order after the fact. The
 * endpoint, its command name and its response shape are not written here
 * because they were not read from CCAvenue's own documentation — the host was
 * unreachable from the environment this was written in, and a payment
 * verification call reconstructed from memory is worse than none: it would
 * look like a check while confirming nothing.
 *
 * What goes here when the documentation is to hand: a server-to-server call
 * that takes the order reference and returns CCAvenue's own view of the
 * transaction, from which the caller must confirm the merchant id, the order
 * reference, the status, the amount and the currency before a capture is
 * recorded. The callback would then be a notification that something may have
 * happened, which is all an unauthenticated message can ever be, rather than
 * the evidence it is treated as today.
 */
export async function verifyWithGateway(): Promise<never> {
  throw new Error(
    "CCAvenue server-to-server verification is not implemented. " +
      "Reconcile captures against the CCAvenue dashboard until it is.",
  );
}

export type CCAvenueCallback = {
  orderId: string;
  trackingId: string;
  orderStatus: string;
  amount: string;
  paymentMode: string | null;
};

/**
 * Decrypts and shape-checks CCAvenue's posted-back response.
 *
 * Returns null for anything that does not decrypt to the fields a genuine
 * reply must carry — the caller treats that exactly as "not CCAvenue", never
 * as a partially-trusted result.
 */
export function decryptCCAvenueResponse(
  encResponse: string,
  workingKey: string,
): CCAvenueCallback | null {
  const decrypted = ccavenueDecrypt(encResponse, workingKey);
  if (!decrypted) {
    logger.warn("ccavenue_response_undecryptable", {});
    return null;
  }

  const fields = decodeFields(decrypted);
  const orderId = fields.order_id ?? "";
  const trackingId = fields.tracking_id ?? "";
  const orderStatus = fields.order_status ?? "";
  const amount = fields.amount ?? "";

  if (!orderId || !trackingId || !orderStatus || !amount) {
    logger.warn("ccavenue_response_incomplete", { hasOrderId: Boolean(orderId) });
    return null;
  }

  return { orderId, trackingId, orderStatus, amount, paymentMode: fields.payment_mode ?? null };
}
