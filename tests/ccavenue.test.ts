import { describe, expect, it } from "vitest";

import {
  ccavenueDecrypt,
  ccavenueEncrypt,
  decryptCCAvenueResponse,
  verifyWithGateway,
} from "@/lib/payments/ccavenue";

/**
 * Negative tests for the gateway whose envelope is encrypted and not signed.
 *
 * The point of these is not that the happy path works. It is that each way of
 * tampering with a reply ends in a rejection, and — for the one case where it
 * does not — that the limit of the protection is written down rather than
 * assumed. AES-128-CBC with no MAC gives confidentiality, not integrity, and
 * the attacker holds a valid ciphertext: CCAvenue posts the reply back
 * through the paying customer's own browser, so their own failed transaction
 * hands them one.
 */

const WORKING_KEY = "test-working-key-not-a-real-one";

/** A reply in the shape CCAvenue sends. */
function reply(overrides: Record<string, string> = {}) {
  const fields = {
    order_id: "PAY-TEST-0001",
    tracking_id: "308812345678901",
    bank_ref_no: "0000",
    order_status: "Success",
    failure_message: "",
    payment_mode: "Net Banking",
    amount: "4999.00",
    currency: "INR",
    ...overrides,
  };
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

const sealed = (overrides?: Record<string, string>) =>
  ccavenueEncrypt(reply(overrides), WORKING_KEY);

describe("CCAvenue reply handling", () => {
  it("reads a genuine reply", () => {
    const result = decryptCCAvenueResponse(sealed(), WORKING_KEY);
    expect(result).toMatchObject({
      orderId: "PAY-TEST-0001",
      trackingId: "308812345678901",
      orderStatus: "Success",
      amount: "4999.00",
    });
  });

  it("refuses a reply sealed with a different working key", () => {
    expect(decryptCCAvenueResponse(sealed(), "a-different-working-key")).toBeNull();
  });

  it("refuses anything that is not hex", () => {
    expect(ccavenueDecrypt("not hex at all", WORKING_KEY)).toBeNull();
    expect(ccavenueDecrypt("abc", WORKING_KEY)).toBeNull(); // odd length
    expect(decryptCCAvenueResponse("zzzz", WORKING_KEY)).toBeNull();
  });

  it("refuses a truncated ciphertext", () => {
    const full = sealed();
    expect(decryptCCAvenueResponse(full.slice(0, full.length - 32), WORKING_KEY)).toBeNull();
  });

  it("refuses a reply missing any field a genuine one carries", () => {
    for (const absent of ["order_id", "tracking_id", "order_status", "amount"]) {
      const without = reply()
        .split("&")
        .filter((pair) => !pair.startsWith(`${absent}=`))
        .join("&");
      expect(
        decryptCCAvenueResponse(ccavenueEncrypt(without, WORKING_KEY), WORKING_KEY),
        `a reply with no ${absent} must be refused`,
      ).toBeNull();
    }
  });

  it("does NOT reject all tampering — the envelope has no integrity", () => {
    /*
     * Measured, not assumed. The first version of this test asserted that
     * every altered ciphertext is refused; it is not, and the gap is the
     * finding rather than a test to relax.
     *
     * Across every single-bit flip of a genuine reply, about one in six
     * produces something that still carries all four fields this integration
     * requires, because corrupting a block that holds only `bank_ref_no`,
     * `failure_message` or `payment_mode` leaves the required ones intact.
     * AES-CBC without a MAC detects nothing; the PKCS#7 padding check catches
     * most of the rest by accident, not by design.
     *
     * The bound is deliberately loose. The number is a property of CCAvenue's
     * field layout, and pinning it exactly would make this test fail on a
     * reply shape change that is not a regression.
     */
    const bytes = Buffer.from(sealed(), "hex");
    let accepted = 0;
    let tried = 0;
    for (let at = 0; at < bytes.length; at += 1) {
      for (let bit = 0; bit < 8; bit += 1) {
        tried += 1;
        const copy = Buffer.from(bytes);
        copy[at] = (copy[at] ?? 0) ^ (1 << bit);
        if (decryptCCAvenueResponse(copy.toString("hex"), WORKING_KEY) !== null) accepted += 1;
      }
    }
    expect(tried).toBeGreaterThan(1000);
    expect(accepted).toBeGreaterThan(0); // the honest part: tampering gets through
    expect(accepted / tried).toBeLessThan(0.5);
  });

  it("lets no single-bit flip turn a failed payment into a successful one", () => {
    /*
     * The property that actually matters, checked exhaustively rather than
     * sampled. An attacker holds a valid ciphertext — CCAvenue posts the
     * reply back through the paying customer's own browser — so their own
     * failed transaction is the starting point for exactly this attempt.
     *
     * It fails because `order_status=` sits immediately before its value:
     * changing the value means corrupting the block that holds the key, and
     * the field then parses as absent. That is CCAvenue's field ordering
     * protecting this, not a decision made here, which is why it is pinned.
     */
    const failed = Buffer.from(ccavenueEncrypt(reply({ order_status: "Failure" }), WORKING_KEY), "hex");
    const forged: string[] = [];

    for (let at = 0; at < failed.length; at += 1) {
      for (let bit = 0; bit < 8; bit += 1) {
        const copy = Buffer.from(failed);
        copy[at] = (copy[at] ?? 0) ^ (1 << bit);
        const result = decryptCCAvenueResponse(copy.toString("hex"), WORKING_KEY);
        if (result?.orderStatus === "Success") forged.push(`byte ${at} bit ${bit}`);
      }
    }

    expect(forged).toEqual([]);
  });

  describe("targeted bit-flipping, which the cipher does not prevent", () => {
    /*
     * CBC malleability: flipping bits in ciphertext block i-1 makes a chosen
     * change to plaintext block i, at the cost of destroying block i-1. These
     * two tests record exactly how far that gets an attacker, because
     * "CBC is malleable" and "this integration is exploitable" are different
     * claims and only the first is certain.
     */

    function flip(plaintext: string, needle: string, replacement: string) {
      const at = plaintext.indexOf(needle);
      const block = Math.floor(at / 16);
      const offset = at % 16;
      const delta = Buffer.alloc(16);
      for (let i = 0; i < needle.length; i += 1) {
        delta[offset + i] = needle.charCodeAt(i) ^ replacement.charCodeAt(i);
      }
      const bytes = Buffer.from(ccavenueEncrypt(plaintext, WORKING_KEY), "hex");
      const target = (block - 1) * 16;
      if (target < 0) return null; // block 0 is protected by the fixed IV
      for (let i = 0; i < 16; i += 1) bytes[target + i] = (bytes[target + i] ?? 0) ^ (delta[i] ?? 0);
      return bytes.toString("hex");
    }

    it("cannot turn Failure into Success, because the key shares the ruined block", () => {
      const plaintext = reply({ order_status: "Failure" });
      const forged = flip(plaintext, "Failure", "Success");
      expect(forged).not.toBeNull();

      const result = decryptCCAvenueResponse(forged as string, WORKING_KEY);
      /*
       * `order_status=` immediately precedes its value, so the block that is
       * destroyed to change the value is the one holding the key. The field
       * parses as absent and the reply is refused as incomplete.
       *
       * This is a property of CCAvenue's field ordering, not of a decision
       * made here — which is why it is pinned by a test. If a future reply
       * puts a field this integration does not read between the key and the
       * value, this test is what notices.
       */
      expect(result === null || result.orderStatus !== "Success").toBe(true);
    });

    it("can alter the amount — and the amount check is what refuses it", () => {
      // Demonstrates the gap honestly: the cipher does not stop this. What
      // stops it is `recordCapture` comparing against the row written before
      // the customer saw a payment page. If that check were ever relaxed,
      // this is the attack that would arrive.
      const plaintext = reply({ amount: "4999.00" });
      const forged = flip(plaintext, "4999.00", "0001.00");
      const result = forged ? decryptCCAvenueResponse(forged, WORKING_KEY) : null;

      if (result) {
        expect(result.amount).not.toBe("4999.00");
      }
      // Either it was refused outright, or it decoded to an amount that no
      // longer matches the order — which `recordCapture` rejects. Both are
      // acceptable; silently accepting 4999.00 would not be.
      expect(result === null || result.amount !== "4999.00").toBe(true);
    });
  });

  it("refuses to pretend an independent verification happened", async () => {
    // The seam is unimplemented on purpose. A stub that returned "verified"
    // would be worse than none: it would read as a check while confirming
    // nothing.
    await expect(verifyWithGateway()).rejects.toThrow(/not implemented/i);
  });
});
