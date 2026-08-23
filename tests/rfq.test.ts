import { describe, expect, it } from "vitest";
import type { EnquiryStatus } from "@prisma/client";

import {
  allowedTransitions,
  canTransition,
  parseRequirement,
  requirementSchema,
  RFQ_OPEN_STATUSES,
  RFQ_STATUSES,
  RFQ_STATUS_HINTS,
  RFQ_STATUS_LABELS,
} from "@/lib/rfq";
import { describeLine, describeRequirement } from "@/lib/requirement-service";

/**
 * A requirement is what a customer has before they have a product list, and the
 * status is what they are told while we turn one into the other. Both are
 * customer-facing, so both are worth pinning down.
 */

const line = (over: Record<string, unknown> = {}) => ({
  description: "laptops for the design team",
  quantity: 20,
  ...over,
});

describe("the requirement payload", () => {
  it("takes a line with nothing but a description and a quantity", () => {
    // "Twenty laptops for the architects" is a real requirement. A schema that
    // demands a processor before it will accept one loses the order.
    const parsed = requirementSchema.parse({ lines: [line()] });
    expect(parsed.lines[0]?.quantity).toBe(20);
    expect(parsed.lines[0]?.brands).toEqual([]);
    expect(parsed.lines[0]?.needsReview).toBe(false);
  });

  it("refuses a requirement with no lines", () => {
    expect(() => requirementSchema.parse({ lines: [] })).toThrow();
  });

  it("refuses a quantity of zero or a fraction", () => {
    expect(() => requirementSchema.parse({ lines: [line({ quantity: 0 })] })).toThrow();
    expect(() => requirementSchema.parse({ lines: [line({ quantity: 2.5 })] })).toThrow();
  });

  it("keeps the budget as words rather than as money", () => {
    // "around 25 lakh" is useful. A numeric field would either reject it or
    // force a precision the customer does not have, and nothing computes on it.
    const parsed = requirementSchema.parse({ lines: [line()], budgetNote: "around 25 lakh" });
    expect(parsed.budgetNote).toBe("around 25 lakh");
  });

  it("returns null for a payload it cannot read, rather than throwing", () => {
    expect(parseRequirement({ lines: "not an array" })).toBeNull();
    expect(parseRequirement(null)).toBeNull();
    expect(parseRequirement({ lines: [line()] })).not.toBeNull();
  });

  it("caps the number of lines", () => {
    const many = Array.from({ length: 61 }, () => line());
    expect(() => requirementSchema.parse({ lines: many })).toThrow();
  });
});

describe("describing a requirement", () => {
  it("reads as a sentence", () => {
    expect(
      describeLine(
        requirementSchema.parse({
          lines: [line({ brands: ["HP", "Lenovo"], processor: "Core Ultra 7", memory: "16 GB" })],
        }).lines[0]!,
      ),
    ).toBe("20 × laptops for the design team (HP, Lenovo) — Core Ultra 7, 16 GB");
  });

  it("carries the facts that change what we quote", () => {
    const summary = describeRequirement(
      requirementSchema.parse({
        lines: [line()],
        requiredBy: "end of Q3",
        deliveryLocation: "Pune",
        budgetNote: "around 25 lakh",
        context: "Replacing a 2019 estate.",
      }),
    );

    expect(summary).toContain("20 × laptops for the design team");
    expect(summary).toContain("Required by: end of Q3");
    expect(summary).toContain("Deliver to: Pune");
    expect(summary).toContain("Indicative budget: around 25 lakh");
    expect(summary).toContain("Replacing a 2019 estate.");
  });
});

describe("the status set", () => {
  it("has a label and a hint for every status", () => {
    for (const status of RFQ_STATUSES) {
      expect(RFQ_STATUS_LABELS[status], status).toBeTruthy();
      expect(RFQ_STATUS_HINTS[status], status).toBeTruthy();
    }
  });

  it("counts only live work as open", () => {
    for (const status of ["ACCEPTED", "REJECTED", "EXPIRED", "CONVERTED_TO_ORDER", "CLOSED", "DRAFT"] as EnquiryStatus[]) {
      expect(RFQ_OPEN_STATUSES).not.toContain(status);
    }
  });
});

describe("what may follow what", () => {
  it("never offers a move back to draft", () => {
    // Once a customer has submitted something, nobody here may put it back to
    // "never submitted" — the customer saw it go.
    for (const status of RFQ_STATUSES) {
      expect(allowedTransitions(status), status).not.toContain("DRAFT");
    }
  });

  it("never offers converted-to-order as a choice", () => {
    // A status that says an order exists must only be reachable by an order
    // existing. The one exception is from ACCEPTED, which is where raising the
    // order happens.
    for (const status of RFQ_STATUSES) {
      if (status === "ACCEPTED") continue;
      expect(allowedTransitions(status), status).not.toContain("CONVERTED_TO_ORDER");
    }
    expect(allowedTransitions("ACCEPTED")).toContain("CONVERTED_TO_ORDER");
  });

  it("closes the door once an order exists", () => {
    // Reopening the requirement an order came from would leave two records
    // claiming to be the state of the same deal.
    expect(allowedTransitions("CONVERTED_TO_ORDER")).toEqual([]);
    expect(canTransition("CONVERTED_TO_ORDER", "UNDER_REVIEW")).toBe(false);
  });

  it("lets staff do nothing to somebody's unsent draft but close it", () => {
    expect(allowedTransitions("DRAFT")).toEqual(["CLOSED"]);
  });

  it("never offers the status it is already in", () => {
    for (const status of RFQ_STATUSES) {
      expect(allowedTransitions(status), status).not.toContain(status);
    }
  });

  it("allows the ordinary working moves", () => {
    expect(canTransition("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "NEEDS_INFORMATION")).toBe(true);
    expect(canTransition("NEEDS_INFORMATION", "QUOTATION_PREPARING")).toBe(true);
    expect(canTransition("QUOTATION_PREPARING", "QUOTATION_SENT")).toBe(true);
    expect(canTransition("QUOTATION_SENT", "REJECTED")).toBe(true);
  });
});
