import { describe, expect, it } from "vitest";

import { fitDescription, productDescription, productTitle } from "@/lib/seo-copy";

describe("product titles", () => {
  it("uses the full pattern when it fits", () => {
    expect(productTitle("AutoCAD")).toBe("AutoCAD Price in India – Buy Licence | TechZoid");
  });
  it("drops 'Buy Licence' before it touches the product name", () => {
    expect(productTitle("Microsoft 365 Business Standard")).toBe("Microsoft 365 Business Standard Price in India | TechZoid");
  });
  it("shortens a long name by abbreviation, never mid-word, and stays within sixty where it can", () => {
    const t = productTitle("Adobe Creative Cloud All Apps for Teams");
    expect(t.length).toBeLessThanOrEqual(60);
    expect(t).toContain("Adobe Creative Cloud All Apps");
  });
  it("never says Buy Licence for hardware", () => {
    expect(productTitle("Dell PowerEdge R760", "hardware")).not.toContain("Licence");
  });
});

describe("descriptions", () => {
  const ok = (d: string, commercial = true) => {
    expect(d.length).toBeGreaterThanOrEqual(140);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d).toMatch(/india/i);
    if (commercial) {
      expect(d).toMatch(/gst invoice/i);
      expect(d).toMatch(/get a quote today/i);
    }
  };
  it("a product description names the product and carries every required phrase", () => {
    const d = productDescription({ name: "Visio Plan 1", shortDescription: "Web-based diagramming for flowcharts and org charts." });
    expect(d).toContain("Visio Plan 1");
    ok(d);
  });
  it("brings a short commercial description up to length with factual sentences", () => {
    ok(fitDescription("Autodesk Revit licences for architecture firms.", "/products/revit"));
  });
  it("trims a long description to whole sentences", () => {
    const long = "First sentence about the product and who it is for. ".repeat(6);
    const d = fitDescription(long, "/products/x");
    ok(d);
    expect(d.endsWith(".")).toBe(true);
  });
  it("leaves a compliant description alone", () => {
    const d = fitDescription("Buy Zoho CRM in India. Genuine licences quoted on one purchase order, delivered with a GST invoice and renewals handled by one supplier. Get a quote today.", "/zoho-crm");
    expect(d).toBe("Buy Zoho CRM in India. Genuine licences quoted on one purchase order, delivered with a GST invoice and renewals handled by one supplier. Get a quote today.");
  });
  it("does not put a sales call to action on a policy page", () => {
    const d = fitDescription("How TechZoid collects, uses and protects personal data.", "/privacy");
    expect(d).not.toMatch(/quote/i);
    ok(d, false);
  });
  it("never leaves a dangling connector when it has to cut, and keeps GST and India", () => {
    const d = fitDescription(
      "Adobe reseller in India for Creative Cloud, Acrobat and single-app licences for business: central administration, reassignable seats and GST invoicing.",
      "/adobe",
    );
    expect(d).not.toMatch(/\b(and|with|for|of)\./);
    expect(d).toMatch(/india/i);
    expect(d).toMatch(/gst invoic/i);
    expect(d).toMatch(/get a quote today/i);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(d.length).toBeGreaterThanOrEqual(140);
  });
  it("re-adds India when trimming removed the sentence that said it", () => {
    const d = fitDescription(
      "Licensing, renewals and software asset management for companies in Noida and Greater Noida, with local support from a long-standing partner. We serve companies across India.",
      "/software-licensing-company-noida",
    );
    expect(d).toMatch(/india/i);
  });
});
