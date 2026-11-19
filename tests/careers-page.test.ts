import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";
import CareersPage, { metadata } from "@/app/careers/page";

const PORTAL = "https://hr.techzoidtechnologies.com/careers";
const html = renderToStaticMarkup(CareersPage());

describe("the careers page", () => {
  it("has one H1 and a proper H2 for each section", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const h2 = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1]);
    expect(h2).toEqual([
      "Open positions",
      "Why work with us",
      "How hiring works",
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
  });

  it("has a banner button that scrolls to the jobs list, which is where it lands", () => {
    expect(html).toContain('href="#jobs"');
    expect(html).toContain("See open positions");
    expect(html).toContain('id="jobs"');
  });

  it("reserves space for the jobs while they load, so the page below does not move", () => {
    // `renderToStaticMarkup` does not wait for the async list, so it renders the
    // placeholder, which is exactly the state under test.
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading open positions");
  });

  it("has four numbered steps, as an ordered list", () => {
    // Not the first <ol>: that is the breadcrumb.
    const section = html.match(/How hiring works[\s\S]*?<\/section>/)?.[0] ?? "";
    const ol = section.match(/<ol[\s\S]*?<\/ol>/)?.[0] ?? "";
    expect(ol.match(/<li[\s>]/g)).toHaveLength(4);
    for (const n of ["1", "2", "3", "4"]) expect(ol).toContain(`>${n}</span>`);
  });

  it("ends with the portal button and the HR mailto, in the same tab", () => {
    const closing = html.match(/Don’t see a role that fits\?[\s\S]*$/)?.[0] ?? "";
    expect(closing).toContain(`href="${PORTAL}"`);
    expect(closing).toContain("Open careers portal");
    expect(closing).toContain('href="mailto:hr.preeti@techzoidtechnologies.com"');
    expect(html).not.toMatch(/target=/);
  });

  it("has no form, takes no applicant data, and carries no JobPosting markup", () => {
    expect(html).not.toMatch(/<form[\s>]/);
    expect(html).not.toMatch(/<input[\s>]/);
    // Only the breadcrumb's structured data is allowed here. The HR portal's own
    // job pages carry JobPosting, and a second copy would duplicate it.
    expect(html).not.toMatch(/JobPosting/);
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
