import { describe, expect, it } from "vitest";
import { normaliseWhatsAppPhone } from "@/lib/whatsapp/phone";

/**
 * `Order.billingPhone` is free text — nothing has ever validated it, because
 * it only ever needed to be printed on an invoice or passed through to
 * CCAvenue as-is. WhatsApp needs a real, country-coded number, so this is the
 * one place that has to decide whether a stored value is confident enough to
 * act on, and refuse rather than guess when it is not.
 */
describe("normalising a billing phone number for WhatsApp", () => {
  it("prefixes a bare ten-digit Indian mobile number with 91", () => {
    expect(normaliseWhatsAppPhone("9876543210")).toBe("919876543210");
  });

  it("strips formatting before prefixing", () => {
    expect(normaliseWhatsAppPhone("98765 43210")).toBe("919876543210");
    expect(normaliseWhatsAppPhone("+91 98765-43210")).toBe("919876543210");
  });

  it("drops a leading STD-style 0 before a ten-digit number", () => {
    expect(normaliseWhatsAppPhone("09876543210")).toBe("919876543210");
  });

  it("passes through a number already carrying the Indian country code", () => {
    expect(normaliseWhatsAppPhone("919876543210")).toBe("919876543210");
    expect(normaliseWhatsAppPhone("+91 9876543210")).toBe("919876543210");
  });

  it("passes through a number in another country's length, unguessed", () => {
    // A UAE mobile number, for the secondary office — not reshaped into an
    // Indian one just because that is this deployment's default.
    expect(normaliseWhatsAppPhone("+971501234567")).toBe("971501234567");
  });

  it("refuses anything too short or too long to be a real number", () => {
    expect(normaliseWhatsAppPhone("12345")).toBeNull();
    expect(normaliseWhatsAppPhone("1234567890123456")).toBeNull();
  });

  it("refuses empty, missing or non-numeric input", () => {
    expect(normaliseWhatsAppPhone(null)).toBeNull();
    expect(normaliseWhatsAppPhone(undefined)).toBeNull();
    expect(normaliseWhatsAppPhone("")).toBeNull();
    expect(normaliseWhatsAppPhone("not a phone number")).toBeNull();
  });
});
