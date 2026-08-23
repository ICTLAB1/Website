/**
 * What a GSTIN tells you, and what it does not.
 *
 * A GSTIN is not an opaque token. It is `SS PPPPPPPPPP E Z C`: a two-digit
 * state code, the holder's ten-character PAN, an entity number, a literal Z and
 * a checksum. Two facts on a tax document therefore come out of it for free
 * rather than being asked for twice and typed differently the second time — the
 * place of supply, and the PAN that goes beside it on every quotation.
 *
 * Nothing here invents anything: reading a PAN out of a GSTIN is arithmetic on
 * a value somebody already entered, and a GSTIN that does not have the
 * statutory shape yields null rather than a guess.
 */

const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z][0-9A-Z]$/;
const PAN_SHAPE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * The state codes, as notified. Reference data, not business data.
 *
 * Both 28 and 37 are present: 28 was Andhra Pradesh before the bifurcation and
 * still appears on registrations issued at the time, so a document that could
 * not name it would show a blank beside a perfectly valid number.
 */
const STATES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman and Diu",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "96": "Other Country",
  "97": "Other Territory",
};

/**
 * The check digit, which is the whole point of the fifteenth character.
 *
 * A GSTIN is self-validating: the last character is computed from the first
 * fourteen, so a single mistyped or transposed character is detectable without
 * asking anybody. Until now this codebase checked only the *shape*, which means
 * "07AAICT5606J1Z5" — one digit wrong on a number that is otherwise perfect —
 * was accepted, stored, and printed on a tax document. A customer's finance
 * team finds that; the form should have.
 *
 * The algorithm, which is published and fixed: each of the first fourteen
 * characters takes its position in `0-9A-Z`, is multiplied by 1 or 2 by
 * alternating position, and the product's tens and units in base 36 are both
 * added to a running total. The check character is whatever makes that total a
 * multiple of 36.
 *
 * Worth knowing when reading fixtures: most GSTINs written by hand for examples
 * fail this. That is not a bug in the check — it is what the check is for.
 */
const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function gstinCheckCharacter(first14: string): string | null {
  if (first14.length < 14) return null;

  let total = 0;
  for (let index = 0; index < 14; index += 1) {
    const value = BASE36.indexOf(first14[index]!);
    if (value === -1) return null;
    const product = value * (index % 2 === 0 ? 1 : 2);
    total += Math.floor(product / 36) + (product % 36);
  }

  return BASE36[(36 - (total % 36)) % 36] ?? null;
}

/**
 * Whether a GSTIN is well-formed *and* passes its own check digit.
 *
 * Separate from `normaliseGstin`, which stays shape-only on purpose: it is used
 * to read the state and the PAN out of numbers that are already stored, and a
 * row saved before this check existed should still yield its state rather than
 * silently becoming blank everywhere it is displayed.
 */
export function isValidGstin(value: string | null | undefined): boolean {
  const clean = normaliseGstin(value);
  if (!clean) return false;
  return gstinCheckCharacter(clean.slice(0, 14)) === clean[14];
}

export function normaliseGstin(value: string | null | undefined): string | null {
  const cleaned = value?.replace(/\s+/g, "").toUpperCase();
  if (!cleaned || !GSTIN_SHAPE.test(cleaned)) return null;
  return cleaned;
}

/** The two-digit state code, or null when the number is not well-formed. */
export function gstStateCode(gstin: string | null | undefined): string | null {
  const clean = normaliseGstin(gstin);
  return clean ? clean.slice(0, 2) : null;
}

/** The state a GSTIN was issued in, named. */
export function gstStateName(gstin: string | null | undefined): string | null {
  const code = gstStateCode(gstin);
  return code ? (STATES[code] ?? null) : null;
}

/** "Maharashtra (27)", as a tax document states the place of supply. */
export function placeOfSupply(gstin: string | null | undefined): string | null {
  const code = gstStateCode(gstin);
  const name = code ? STATES[code] : null;
  return name && code ? `${name} (${code})` : null;
}

/**
 * The PAN embedded in a GSTIN.
 *
 * Checked against the PAN shape as well as the GSTIN's, because a
 * well-formed-looking GSTIN with a malformed PAN inside it is a typo and
 * printing the ten characters anyway would put a wrong PAN on a tax document.
 */
export function panFromGstin(gstin: string | null | undefined): string | null {
  const clean = normaliseGstin(gstin);
  if (!clean) return null;
  const pan = clean.slice(2, 12);
  return PAN_SHAPE.test(pan) ? pan : null;
}

export type TaxTreatment = "intra_state" | "inter_state" | "unknown";

/**
 * Whether a supply is inside one state or across two.
 *
 * It decides whether the tax is one IGST line or a CGST and an SGST line at
 * half the rate each, which is the single most visible thing on an Indian tax
 * document and the thing a customer's finance team checks first.
 *
 * Returns "unknown" when either side has no usable GSTIN, and the caller then
 * prints a single "GST" line. Guessing intra-state — the common case — would
 * put two wrong tax heads on a document that a customer may claim credit
 * against, which is a worse failure than declining to split.
 */
export function taxTreatment(
  supplierGstin: string | null | undefined,
  recipientGstin: string | null | undefined,
): TaxTreatment {
  const supplier = gstStateCode(supplierGstin);
  const recipient = gstStateCode(recipientGstin);
  if (!supplier || !recipient) return "unknown";
  return supplier === recipient ? "intra_state" : "inter_state";
}

export type TaxHead = { label: string; ratePercent: number; amountMinor: number };

/**
 * One tax amount, split into the heads it is actually charged under.
 *
 * Halving is done on the *amount*, with the remainder given to CGST, so the two
 * halves always add back to the total. Splitting the rate and recomputing would
 * lose a paisa on odd amounts, and a tax document whose parts do not sum to its
 * total is one somebody has to query.
 */
export function taxHeads(
  amountMinor: number,
  ratePercent: number,
  treatment: TaxTreatment,
): TaxHead[] {
  if (treatment === "intra_state") {
    const half = Math.floor(amountMinor / 2);
    return [
      { label: "CGST", ratePercent: ratePercent / 2, amountMinor: amountMinor - half },
      { label: "SGST", ratePercent: ratePercent / 2, amountMinor: half },
    ];
  }

  if (treatment === "inter_state") {
    return [{ label: "IGST", ratePercent, amountMinor }];
  }

  return [{ label: "GST", ratePercent, amountMinor }];
}
