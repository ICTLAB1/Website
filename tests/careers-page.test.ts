import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";
import CareersPage, { metadata } from "@/app/careers/page";

const PORTAL = "https://hr.techzoidtechnologies.com/careers";
const html = renderToStaticMarkup(CareersPage());

describe("the careers page", () => {
  it("has one H1 and a proper H2 for each section", () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const h2 = [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ""));
    expect(h2).toEqual([
      "Find your place at TechZoid",
      "Wherever you are in your career",
      "Good work starts with good people",
      "More than a job",
      "Find your next opportunity",
      "Your next chapter starts here",
    ]);
  });

  it("says what it was asked to say", () => {
    // The H1 keeps "Careers at TechZoid" for search and screen readers; sighted visitors see the three words.
    const h1 = html.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? "";
    expect(h1).toContain("Careers at TechZoid");
    for (const word of ["Belong.", "Build.", "Become."]) expect(h1).toContain(word);
    expect(html).toContain("Build your skills. Solve real business challenges. Grow with TechZoid.");
    expect(html).toContain("Build India’s digital backbone with people who care.");
    for (const title of [
      "Sales &amp; Business Development",
      "Technology &amp; Solutions",
      "Operations",
      "Corporate Functions",
      "Early careers",
      "Experienced professionals",
      "Team leaders",
      "Learning &amp; Development",
      "Career Growth",
      "Collaboration",
      "Recognition",
    ]) {
      expect(html).toContain(title);
    }
  });

  it("names no vacancy: the example roles are what the team hires for, and the list says only published roles appear", () => {
    expect(html).toContain("Only roles our HR team has published appear here");
    expect(html).not.toMatch(/now hiring|vacancies? (is|are) open/i);
  });

  it("has a hero button that scrolls to the jobs list, which is where it lands", () => {
    expect(html).toContain('href="#jobs"');
    expect(html).toContain("Explore open roles");
    expect(html).toContain('id="jobs"');
    expect(html).toContain('href="#life"');
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
    const closing = html.match(/Your next chapter starts here[\s\S]*$/)?.[0] ?? "";
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
    // The page's own sentence comes first and is kept whole; `buildMetadata` then
    // makes sure the description says India (see `lib/seo-copy`).
    expect(metadata.description).toBe(
      "Join TechZoid Technologies, a Microsoft, Adobe and Autodesk partner in New Delhi, India. See open jobs in sales, pre-sales and operations and apply online.",
    );
    expect(metadata.description).toMatch(/india/i);
    expect(String(metadata.description).length).toBeLessThanOrEqual(160);
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
