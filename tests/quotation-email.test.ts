import { describe, expect, it, vi } from "vitest";

/**
 * The quotation a customer receives.
 *
 * Worth testing carefully because of who reads it. It is forwarded to a finance
 * team and attached to a purchase order, so a total that does not reconcile
 * against its own lines is a commercial dispute rather than a display bug — and
 * an invented payment term is a commitment this business never agreed to.
 */

vi.mock("server-only", () => ({}));

const load = async () => import("@/lib/emails/quotation");

const config = {
  tradingName: "TechZoid",
  legalName: "TechZoid Technologies Private Limited",
  entityName: "TechZoid Technologies Private Limited",
  tagline: "Licenses . Solutions . Trust",
  url: "https://www.example.test",
  email: { sales: "sales@example.test", support: null, enterprise: null },
  phone: { sales: "+91 11 4000 0000", support: null },
  address: {
    line1: "407, Pearl Business Park",
    line2: null,
    city: "New Delhi",
    state: "Delhi",
    postcode: "110034",
    country: "India",
  },
  hasAddress: true,
  addressLines: [],
  gstin: "07AAICT5606J1Z4",
  cin: null,
  supportHours: null,
  grievance: { name: null, email: null, phone: null },
  quoteTerms: null,
} as unknown as import("@/lib/site-config").SiteConfig;

/** ₹1,00,000 × 2, less ₹10,000, +18% GST. Subtotal 200000, taxable 190000, GST 34200. */
const base = {
  reference: "QTE-2026-AB12CD",
  currency: "INR",
  subtotalMinor: 20_000_000,
  discountMinor: 1_000_000,
  taxMinor: 3_420_000,
  totalMinor: 22_420_000,
  validUntil: new Date("2026-09-30T00:00:00Z"),
  sentAt: new Date("2026-08-21T00:00:00Z"),
  notes: null,
  customer: {
    name: "Priya Sharma",
    companyName: "Northwind Logistics Private Limited",
    email: "priya@example.test",
    gstin: "29AABCU9603R1ZX",
  },
  lines: [
    {
      productName: "Microsoft 365 Business Premium — Annual",
      sku: "M365-BP-ANN",
      quantity: 2,
      unitPriceMinor: 10_000_000,
      discountMinor: 1_000_000,
      gstRatePercent: 18,
      lineTotalMinor: 19_000_000,
    },
  ],
  acceptUrl: "https://www.example.test/account/quotes/QTE-2026-AB12CD",
  termsUrl: "https://www.example.test/terms",
  config,
  terms: null,
};

describe("the quotation document", () => {
  it("shows every figure a finance team needs to check the arithmetic", async () => {
    const { quotationHtml } = await load();
    const html = quotationHtml(base);

    // Unit price, quantity, discount, GST rate and line total — enough to
    // re-derive the line without asking anybody.
    expect(html).toContain("M365-BP-ANN");
    expect(html).toContain("18%");
    expect(html).toMatch(/Taxable value/);
    expect(html).toMatch(/Total payable/);

    // The totals block must show taxable value = subtotal − discount, because
    // that is the number GST is charged on and the one a reviewer recomputes.
    const taxable = base.subtotalMinor - base.discountMinor;
    expect(taxable).toBe(19_000_000);
    expect(base.subtotalMinor - base.discountMinor + base.taxMinor).toBe(base.totalMinor);
  });

  it("has an Amount column that adds up to its own Subtotal row", async () => {
    const { quotationHtml } = await load();

    /*
     * Found by looking at a rendered sample rather than by reading the code.
     * The column originally showed each line net of its discount, so it summed
     * to the taxable value while the row immediately beneath said "Subtotal"
     * and showed the gross — the two differing by exactly the discount. Every
     * individual figure was right and the document still contradicted itself,
     * which is the version of this bug a customer's finance team finds.
     */
    const lines = [
      { productName: "A", sku: "A-1", quantity: 2, unitPriceMinor: 10_000_000,
        discountMinor: 1_000_000, gstRatePercent: 18, lineTotalMinor: 19_000_000 },
      { productName: "B", sku: "B-1", quantity: 5, unitPriceMinor: 1_800_000,
        discountMinor: 0, gstRatePercent: 18, lineTotalMinor: 9_000_000 },
    ];
    const subtotalMinor = lines.reduce((sum, l) => sum + l.unitPriceMinor * l.quantity, 0);
    expect(subtotalMinor).toBe(29_000_000);

    const html = quotationHtml({
      ...base,
      lines,
      subtotalMinor,
      discountMinor: 1_000_000,
      taxMinor: 5_040_000,
      totalMinor: 33_040_000,
    });

    // Each line prints its gross, and the subtotal prints their sum.
    expect(html).toContain("\u20b92,00,000.00");
    expect(html).toContain("\u20b990,000.00");
    expect(html).toContain("\u20b92,90,000.00");
    // And the discount is still visible on the line it belongs to.
    expect(html).toContain("Less discount");
  });

  it("prints no terms of its own when none have been written", async () => {
    const { quotationHtml, quotationText } = await load();
    const html = quotationHtml(base);
    const text = quotationText(base);

    /*
     * The rule that matters most here. Payment terms, delivery timelines and a
     * liability position are commitments this business makes to a customer.
     * Shipping a plausible default would put words in its mouth, in writing,
     * to someone about to raise a purchase order against them.
     */
    expect(html).not.toMatch(/Terms and conditions<\/div>/);
    expect(html).not.toMatch(/\b(?:30 days|net 30|payment is due|delivered within)\b/i);
    expect(text).not.toMatch(/\b(?:net 30|payment is due within)\b/i);

    // But it still says where the real terms are.
    expect(html).toContain("https://www.example.test/terms");
    expect(text).toContain("https://www.example.test/terms");
  });

  it("prints the terms an administrator has written, numbered", async () => {
    const { quotationHtml } = await load();
    const html = quotationHtml({
      ...base,
      terms: "Prices hold for 30 days.\n\n- Payment due within 45 days of invoice.\n• Freight excluded.",
    });

    expect(html).toContain("Terms and conditions");
    expect(html).toContain("Prices hold for 30 days.");
    // Leading bullets are normalised away, so a list pasted from a document
    // does not come out as "• • Freight excluded".
    expect(html).toContain("<li style=\"margin-bottom:4px\">Freight excluded.</li>");
    expect(html).toContain("Payment due within 45 days of invoice.");
  });

  it("never claims to be a tax invoice", async () => {
    const { quotationHtml, quotationText } = await load();
    // A quotation presented as a GST invoice is a compliance problem: it is an
    // offer, and input credit cannot be claimed against it.
    expect(quotationHtml(base)).toMatch(/not a tax invoice/i);
    expect(quotationText(base)).toMatch(/not a tax invoice/i);
  });

  it("shows only the identifiers that are configured", async () => {
    const { quotationHtml } = await load();
    const html = quotationHtml(base);
    expect(html).toContain("GSTIN 07AAICT5606J1Z4");
    // CIN is null here, so the label must not appear at all — an empty
    // letterhead line reads as a missing registration.
    expect(html).not.toContain("CIN ");
  });

  it("escapes customer-supplied text", async () => {
    const { quotationHtml } = await load();
    const html = quotationHtml({
      ...base,
      customer: { ...base.customer, companyName: '<script>alert(1)</script>' },
      notes: '<img src=x onerror=alert(1)>',
    });

    /*
     * Company name and notes come from a person. A quotation is HTML mail sent
     * on to a third party, so an unescaped value is script running in somebody
     * else's inbox.
     *
     * The assertion is that no *tag* can form. The words "script" and "onerror"
     * still appear — as visible text inside &lt;…&gt; — and that is correct;
     * asserting their absence would be asserting the wrong thing, and would
     * pass just as happily against output that stripped them instead of
     * escaping them.
     */
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");

    // Quotes too: an unescaped one would break out of a style or href
    // attribute even with the angle brackets handled.
    const quoted = quotationHtml({ ...base, notes: 'He said "yes" & signed' });
    expect(quoted).toContain("&quot;yes&quot;");
    expect(quoted).toContain("&amp;");
  });

  it("survives a customer with no company and no GSTIN", async () => {
    const { quotationHtml, quotationText } = await load();
    const html = quotationHtml({
      ...base,
      customer: { name: "Priya Sharma", companyName: null, email: "priya@example.test", gstin: null },
      validUntil: null,
    });
    expect(html).toContain("Priya Sharma");
    expect(html).not.toContain("Attn:");
    expect(html).not.toContain("Valid until");
    expect(() => quotationText({ ...base, validUntil: null })).not.toThrow();
  });

  it("puts the reference in the subject, where it is searched for", async () => {
    const { quotationSubject } = await load();
    expect(quotationSubject(base)).toContain("QTE-2026-AB12CD");
    expect(quotationSubject(base)).toContain("TechZoid");
  });
});
