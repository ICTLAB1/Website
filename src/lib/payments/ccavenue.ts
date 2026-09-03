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
 * response, and decrypting it *is* the proof the call came from CCAvenue,
 * since only someone holding the working key could have produced ciphertext
 * that decrypts to well-formed `key=value&…` pairs.
 *
 * That is a weaker construction than Stripe's HMAC-signed webhook — there is
 * no separate signature, only successful decryption — which is CCAvenue's own
 * documented integration, not a shortcut taken here. Two things narrow the gap
 * deliberately: every field this module returns is validated for shape before
 * it is trusted, and the amount is never taken from CCAvenue's word alone —
 * `service.ts`'s `recordCapture` re-checks it against the row written before
 * the customer ever saw a payment page, exactly as it does for Stripe.
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
