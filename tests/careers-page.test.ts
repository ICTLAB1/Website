import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";
import CareersPage, { metadata } from "@/app/careers/page";

const PORTAL = "https://hr.techzoidtechnologies.com/careers";
const html = renderToStaticMarkup(CareersPage());

describe("the careers page", () => {
  it("has one H1 and a proper H2 for each of the five sections", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const h2 = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1]);
    expect(h2).toEqual([
      "Why work with us",
      "How hiring works",
      "Teams we hire for",
      "Don’t see a role that fits?",
    ]);
  });

  it("says what it was asked to say", () => {
    expect(html).toContain("Careers at TechZoid");
    expect(html).toContain("Build India’s digital backbone with people who care.");
    for (const title of [
      "Fast growth &amp; incentives",
      "Product certifications",
      "Supportive leaders",
      "Great location",
    ]) {
      expect(html).toContain(title);
    }
    for (const team of ["Sales / Business Development", "Pre-sales &amp; Technical", "Operations &amp; GeM", "Accounts"]) {
      expect(html).toContain(team);
    }
  });

  it("has four numbered steps, as an ordered list", () => {
    // Not the first <ol>: that is the breadcrumb.
    const section = html.match(/How hiring works[\s\S]*?<\/section>/)?.[0] ?? "";
    const ol = section.match(/<ol[\s\S]*?<\/ol>/)?.[0] ?? "";
    expect(ol.match(/<li[\s>]/g)).toHaveLength(4);
    for (const n of ["1", "2", "3", "4"]) expect(ol).toContain(`>${n}</span>`);
  });

  it("sends both 'View open positions' buttons to the portal, in the same tab", () => {
    const links = [...html.matchAll(/<a [^>]*>/g)].map((m) => m[0]).filter((a) => a.includes("hr.techzoidtechnologies.com"));
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toContain(`href="${PORTAL}"`);
    }
    expect([...html.matchAll(/View open positions/g)]).toHaveLength(2);
  });

  it("never opens a new tab", () => {
    expect(html).not.toMatch(/target=/);
  });

  it("links the HR address with mailto", () => {
    expect(html).toContain('href="mailto:hr.preeti@techzoidtechnologies.com"');
  });

  it("has no form and takes no applicant data", () => {
    expect(html).not.toMatch(/<form[\s>]/);
    expect(html).not.toMatch(/<input[\s>]/);
  });

  it("keeps the team chips as plain text, not links", () => {
    const section = html.match(/Teams we hire for[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(section).not.toMatch(/<a[\s>]/);
  });
});

describe("the careers page's search metadata", () => {
  it("uses the title and description it was given, with the title not suffixed again", () => {
    expect(metadata.title).toEqual({
      absolute: "Careers at TechZoid Technologies | Jobs in New Delhi",
    });
    expect(metadata.description).toBe(
      "Join TechZoid Technologies, a Microsoft, Adobe and Autodesk partner in New Delhi. See open jobs in sales, pre-sales and operations and apply online.",
    );
  });

  it("carries Open Graph title, description and the site's default share image", () => {
    const og = metadata.openGraph as { title?: string; description?: string; images?: Array<{ url: string }> };
    expect(og.title).toBe("Careers at TechZoid Technologies | Jobs in New Delhi");
    expect(og.description).toContain("Join TechZoid Technologies");
    expect(og.images?.[0]?.url).toMatch(/^https?:\/\//);
  });
});

describe("the old in-site job pages", () => {
  it("redirect to /careers rather than disappearing", async () => {
    const rules = (await nextConfig.redirects?.()) ?? [];
    const rule = rules.find((r) => r.source === "/careers/:slug");
    expect(rule?.destination).toBe("/careers");
    expect(rule && "statusCode" in rule ? rule.statusCode : undefined).toBe(301);
  });
});
