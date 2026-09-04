/**
 * Turning whatever a customer typed into a billing phone field into the
 * digits-only, country-coded form WhatsApp's API requires for a `to` field —
 * or refusing, when it cannot be done with confidence.
 *
 * There is no validation on `Order.billingPhone` today — it is free text,
 * kept exactly as typed because it is printed on a GST invoice and CCAvenue
 * accepts it as-is. WhatsApp is far less forgiving: a malformed number is
 * either silently undeliverable or, worse, somebody else's phone. So this
 * only ever returns a number it is confident about — ten digits, or a number
 * that already carries a country code — and returns null for everything
 * else, which the caller reads as "send the email only", never as a reason
 * to guess.
 */

/**
 * @param raw What a customer typed into the billing phone field.
 * @returns Digits only, with a country code and no leading `+` — the shape
 * WhatsApp's Cloud API expects a recipient in — or `null` when the input
 * cannot be resolved to one with confidence.
 */
export function normaliseWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  // Ten digits: an Indian mobile number with no country code, the common
  // case for a business trading from India. Prefixed with 91 rather than
  // left ambiguous — WhatsApp has no notion of a "default country".
  if (digits.length === 10) return `91${digits}`;

  // A leading 0 before ten digits is the STD-dialling habit carried into a
  // field that never needed it. Dropped, then treated as the case above.
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;

  // Already carries the Indian country code.
  if (digits.length === 12 && digits.startsWith("91")) return digits;

  // Any other length between a plausible shortest and longest E.164 number
  // is taken as already carrying its own country code — a UAE number for the
  // secondary office, for instance — and passed through unchanged rather
  // than guessed at.
  if (digits.length >= 8 && digits.length <= 15) return digits;

  return null;
}
