import { describe, expect, it } from "vitest";
import {
  contactSchema,
  enquirySchema,
  gstinSchema,
  passwordSchema,
  quantitySchema,
  registerSchema,
} from "@/lib/validation";

const validEnquiry = {
  contactName: "Priya Raman",
  companyName: "Example Technologies Pvt Ltd",
  contactEmail: "Priya@Example.TEST",
  contactPhone: "+91 99999 99999",
  items: [{ sku: "MS-M365-BS-A1", quantity: 50 }],
};

describe("quantity", () => {
  it("rejects zero, negative and fractional quantities", () => {
    expect(quantitySchema.safeParse(0).success).toBe(false);
    expect(quantitySchema.safeParse(-1).success).toBe(false);
    expect(quantitySchema.safeParse(1.5).success).toBe(false);
    expect(quantitySchema.safeParse(Number.NaN).success).toBe(false);
  });

  it("accepts sensible volumes and caps absurd ones", () => {
    expect(quantitySchema.safeParse(1).success).toBe(true);
    expect(quantitySchema.safeParse(100_000).success).toBe(true);
    expect(quantitySchema.safeParse(100_001).success).toBe(false);
  });
});

describe("enquiry schema", () => {
  it("normalises the email to lower case", () => {
    const parsed = enquirySchema.parse(validEnquiry);
    expect(parsed.contactEmail).toBe("priya@example.test");
  });

  it("strips unknown keys so a client cannot smuggle extra fields", () => {
    const parsed = enquirySchema.parse({
      ...validEnquiry,
      status: "WON",
      userId: "forged",
      totalMinor: 0,
    } as Record<string, unknown>);
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("userId");
    expect(parsed).not.toHaveProperty("totalMinor");
  });

  it("drops price fields supplied on a line item", () => {
    const parsed = enquirySchema.parse({
      ...validEnquiry,
      items: [{ sku: "MS-M365-BS-A1", quantity: 1, unitPriceMinor: 1, productName: "Free" }],
    } as Record<string, unknown>);
    expect(parsed.items[0]).toEqual({ sku: "MS-M365-BS-A1", quantity: 1 });
  });

  it("requires at least one line and rejects an oversized basket", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, items: [] }).success).toBe(false);
    const tooMany = Array.from({ length: 61 }, (_, index) => ({
      sku: `SKU-${index}`,
      quantity: 1,
    }));
    expect(enquirySchema.safeParse({ ...validEnquiry, items: tooMany }).success).toBe(false);
  });

  it("rejects a malformed email and an implausible phone number", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, contactEmail: "nope" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...validEnquiry, contactPhone: "abc" }).success).toBe(false);
  });

  it("accepts an omitted GSTIN but rejects a malformed one", () => {
    expect(enquirySchema.safeParse({ ...validEnquiry, gstin: "" }).success).toBe(true);
    expect(enquirySchema.safeParse({ ...validEnquiry, gstin: "NOT-A-GSTIN" }).success).toBe(false);
  });
});

describe("gstin", () => {
  it("accepts a correctly structured 15-character GSTIN", () => {
    expect(gstinSchema.safeParse("22AAAAA0000A1Z5").success).toBe(true);
  });

  it("rejects wrong length and wrong structure", () => {
    expect(gstinSchema.safeParse("22AAAAA0000A1Z").success).toBe(false);
    expect(gstinSchema.safeParse("AAAAAAA0000A1Z5").success).toBe(false);
    expect(gstinSchema.safeParse("22aaaaa0000a1z5").success).toBe(false);
  });
});

describe("password policy", () => {
  it("rejects passwords that are short or lack a character class", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("ALLUPPERCASE1").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigitsHere").success).toBe(false);
  });

  it("accepts a compliant password", () => {
    expect(passwordSchema.safeParse("CorrectHorse9").success).toBe(true);
  });
});

describe("registration", () => {
  it("does not accept a role, so it cannot be used to escalate privilege", () => {
    const parsed = registerSchema.parse({
      name: "Test User",
      email: "test@example.test",
      password: "CorrectHorse9",
      companyName: "Example Ltd",
      role: "ADMIN",
    } as Record<string, unknown>);
    expect(parsed).not.toHaveProperty("role");
  });
});

describe("contact", () => {
  it("requires a message of reasonable length", () => {
    const base = { name: "Test User", email: "t@example.test", message: "Hello there team" };
    expect(contactSchema.safeParse(base).success).toBe(true);
    expect(contactSchema.safeParse({ ...base, message: "hi" }).success).toBe(false);
  });

  it("defaults the topic when none is given", () => {
    const parsed = contactSchema.parse({
      name: "Test User",
      email: "t@example.test",
      message: "Hello there team",
    });
    expect(parsed.topic).toBe("GENERAL");
  });
});

describe("direct order schema", () => {
  const valid = {
    sku: "MS-M365-BS-A1",
    quantity: 5,
    contactName: "Priya Raman",
    companyName: "Example Technologies Pvt Ltd",
    contactEmail: "priya@example.test",
    contactPhone: "+91 99999 99999",
  };

  it("accepts a well-formed order", async () => {
    const { directOrderSchema } = await import("@/lib/validation");
    expect(directOrderSchema.safeParse(valid).success).toBe(true);
  });

  it("strips any price, discount or status the client sends", async () => {
    const { directOrderSchema } = await import("@/lib/validation");
    const parsed = directOrderSchema.parse({
      ...valid,
      unitPriceMinor: 1,
      totalMinor: 0,
      discountMinor: 99_999_999,
      status: "FULFILLED",
      userId: "forged",
    } as Record<string, unknown>);

    for (const key of ["unitPriceMinor", "totalMinor", "discountMinor", "status", "userId"]) {
      expect(parsed).not.toHaveProperty(key);
    }
  });

  it("rejects a zero, negative or fractional quantity", async () => {
    const { directOrderSchema } = await import("@/lib/validation");
    for (const quantity of [0, -5, 2.5]) {
      expect(directOrderSchema.safeParse({ ...valid, quantity }).success).toBe(false);
    }
  });

  it("requires contact details a quotation can actually be sent to", async () => {
    const { directOrderSchema } = await import("@/lib/validation");
    expect(directOrderSchema.safeParse({ ...valid, contactEmail: "nope" }).success).toBe(false);
    expect(directOrderSchema.safeParse({ ...valid, companyName: "X" }).success).toBe(false);
    expect(directOrderSchema.safeParse({ ...valid, contactPhone: "abc" }).success).toBe(false);
  });
});
