import { describe, expect, it } from "vitest";

import {
  gstinCheckCharacter,
  isValidGstin,
  gstStateCode,
  gstStateName,
  normaliseGstin,
  panFromGstin,
  placeOfSupply,
  taxHeads,
  taxTreatment,
} from "@/lib/gstin";
import { amountInWords, pdfAmount, pdfMoney } from "@/lib/pdf/money";

/**
 * What a tax document says about tax.
 *
 * Every assertion here is a line a customer's accounts department reads and
 * posts against. Getting the tax heads wrong does not produce an ugly document,
 * it produces one somebody cannot claim credit on.
 */

const DELHI = "07AAICT5606J1Z4";
const MAHARASHTRA = "27AAAJM2218H1ZD";

describe("reading a GSTIN", () => {
  it("takes the state from the first two digits", () => {
    expect(gstStateCode(DELHI)).toBe("07");
    expect(gstStateName(DELHI)).toBe("Delhi");
    expect(gstStateName(MAHARASHTRA)).toBe("Maharashtra");
  });

  it("states the place of supply the way a tax document does", () => {
    expect(placeOfSupply(MAHARASHTRA)).toBe("Maharashtra (27)");
  });

  it("reads the PAN out of the middle rather than storing it twice", () => {
    // Ten characters of the GSTIN, which is what a PAN is. Nothing to keep in
    // step and no second field to type wrongly.
    expect(panFromGstin(DELHI)).toBe("AAICT5606J");
  });

  it("refuses anything that is not shaped like a GSTIN", () => {
    for (const value of [null, undefined, "", "  ", "1234567890", "07AAICT5606J1Z", "GARBAGE"]) {
      expect(normaliseGstin(value)).toBeNull();
      expect(panFromGstin(value)).toBeNull();
      expect(placeOfSupply(value)).toBeNull();
    }
  });

  it("tolerates spacing and case, because people paste both", () => {
    expect(normaliseGstin(" 07aaict5606j1z4 ")).toBe(DELHI);
  });

  it("returns nothing for a state code that was never notified", () => {
    expect(gstStateName("99AAICT5606J1Z4")).toBeNull();
    expect(placeOfSupply("99AAICT5606J1Z4")).toBeNull();
  });
});

describe("which tax applies", () => {
  it("splits within a state and does not across one", () => {
    expect(taxTreatment(DELHI, DELHI)).toBe("intra_state");
    expect(taxTreatment(DELHI, MAHARASHTRA)).toBe("inter_state");
  });

  it("declines to guess when either side has no usable number", () => {
    /*
     * The important one. Assuming intra-state because it is the common case
     * would put CGST and SGST on a document that should carry IGST, and the
     * customer would claim credit under two heads that do not exist for them.
     */
    expect(taxTreatment(DELHI, null)).toBe("unknown");
    expect(taxTreatment(null, MAHARASHTRA)).toBe("unknown");
    expect(taxTreatment("nonsense", MAHARASHTRA)).toBe("unknown");
  });

  it("halves the amount, not the rate, so the parts sum to the total", () => {
    // 18% of an odd amount. Splitting the rate and recomputing each half loses
    // a paisa, and a tax table that does not add up is one somebody queries.
    const heads = taxHeads(2_02_170_78 % 100000, 18, "intra_state");
    const total = heads.reduce((sum, head) => sum + head.amountMinor, 0);
    expect(total).toBe(2_02_170_78 % 100000);
    expect(heads.map((head) => head.label)).toEqual(["CGST", "SGST"]);
    expect(heads[0]!.ratePercent).toBe(9);
  });

  it("gives the odd paisa to CGST rather than dropping it", () => {
    const heads = taxHeads(101, 18, "intra_state");
    expect(heads[0]!.amountMinor).toBe(51);
    expect(heads[1]!.amountMinor).toBe(50);
  });

  it("charges one head across states, and an unnamed one when unsure", () => {
    expect(taxHeads(1000, 18, "inter_state")).toEqual([
      { label: "IGST", ratePercent: 18, amountMinor: 1000 },
    ]);
    expect(taxHeads(1000, 18, "unknown")[0]!.label).toBe("GST");
  });
});

describe("money on the document", () => {
  it("prints the figure bare inside the table and coded outside it", () => {
    expect(pdfAmount(11800000)).toBe("1,18,000.00");
    expect(pdfMoney(11800000)).toBe("INR 1,18,000.00");
  });

  it("groups in lakhs for rupees and in thousands for anything else", () => {
    expect(pdfAmount(1234567890, "INR")).toBe("1,23,45,678.90");
    expect(pdfAmount(1234567890, "USD")).toBe("12,345,678.90");
  });
});

describe("the total in words", () => {
  it("writes rupees the way an invoice does", () => {
    expect(amountInWords(132534178)).toBe(
      "Rupees Thirteen Lakh Twenty Five Thousand Three Hundred Forty One and Seventy Eight Paise Only",
    );
  });

  it("omits the paise clause when there are none", () => {
    expect(amountInWords(11800000)).toBe("Rupees One Lakh Eighteen Thousand Only");
  });

  it("counts in crores rather than millions", () => {
    // The document is read in India. "Twenty-one million" on a tax invoice is
    // a figure somebody has to convert before they can check it.
    // 2,14,00,000 rupees — near the ceiling a paise column can hold.
    expect(amountInWords(2_14_00_000_00)).toBe("Rupees Two Crore Fourteen Lakh Only");
    expect(amountInWords(2_14_00_000_00)).not.toContain("Million");
  });

  it("handles zero and the teens", () => {
    expect(amountInWords(0)).toBe("Rupees Zero Only");
    expect(amountInWords(1500)).toBe("Rupees Fifteen Only");
    expect(amountInWords(1_900)).toBe("Rupees Nineteen Only");
  });

  it("says so rather than silently dropping a sign", () => {
    expect(amountInWords(-11800000)).toContain("Minus");
  });
});

describe("the check digit", () => {
  /*
   * A GSTIN validates itself. The fifteenth character is computed from the
   * first fourteen, so one mistyped or transposed character is detectable at
   * the form rather than by a customer's finance team after the invoice has
   * gone out — which is where it was being detected, because the shape check
   * that used to stand alone accepts a wrong digit perfectly happily.
   */
  it("accepts a real number", () => {
    // This company's own GSTIN, off its own letterhead.
    expect(isValidGstin("07AAICT5606J1Z4")).toBe(true);
  });

  it("computes the same character the GSTN documentation's sample carries", () => {
    /*
     * `29AJIPA1572ER2M` is the request sample in the GSTN API documentation and
     * its check character is right — but `isValidGstin` refuses it, because the
     * fourteenth character is not `Z` and the shape rule this site has always
     * used requires one. That rule is the GST portal's own, so the sample is a
     * documentation artefact rather than a registration anybody holds.
     *
     * Asserted through the check-digit function directly, which is the part
     * being proven here: the arithmetic agrees with the published algorithm on
     * a number this repository did not choose.
     */
    expect(gstinCheckCharacter("29AJIPA1572ER2")).toBe("M");
  });

  it("rejects the same number with one character wrong", () => {
    expect(isValidGstin("07AAICT5606J1Z5")).toBe(false);
    expect(isValidGstin("07AAICT5606J1Z3")).toBe(false);
  });

  it("rejects a transposition, which a shape check cannot see", () => {
    // Two adjacent characters swapped: still fifteen characters, still the
    // right shape, still a state code and a PAN. Only the check digit knows.
    expect(isValidGstin("07AAICT5066J1Z4")).toBe(false);
  });

  it("computes the character that would make a prefix valid", () => {
    expect(gstinCheckCharacter("07AAICT5606J1Z")).toBe("4");
    expect(gstinCheckCharacter("29AJIPA1572ER2")).toBe("M");
  });

  it("declines a prefix it cannot read rather than guessing one", () => {
    expect(gstinCheckCharacter("07AAICT")).toBeNull();
    expect(gstinCheckCharacter("07aaict5606j1z")).toBeNull();
  });

  it("rejects anything that is not the right shape before checking the digit", () => {
    expect(isValidGstin("")).toBe(false);
    expect(isValidGstin("07AAICT5606J1Z")).toBe(false);
    expect(isValidGstin(null)).toBe(false);
  });

  /*
   * Reading a stored number stays shape-only, deliberately.
   *
   * Rows saved before this check existed may hold a number that fails it, and
   * the place of supply printed on a document already issued should not
   * silently become blank because the validator got stricter afterwards.
   */
  it("does not stop a stored number yielding its state", () => {
    expect(gstStateName("07AAICT5606J1Z5")).toBe("Delhi");
  });
});
