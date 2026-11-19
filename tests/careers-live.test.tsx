import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HiringStripView } from "@/components/careers/hiring-strip";
import { JobsSection } from "@/components/careers/live-jobs";
import type { Careers, DisplayJob } from "@/lib/queries/hr-feed";

const PORTAL = "https://hr.techzoidtechnologies.com/careers";

const job = (id: string, over: Partial<DisplayJob> = {}): DisplayJob => ({
  id,
  title: `Role ${id}`,
  department: "Sales",
  location: "New Delhi (Netaji Subhash Place)",
  employmentType: "Full-time",
  experience: "0–2 years",
  salary: "₹3–4.5 LPA + incentives",
  openings: 1,
  summary: "First line of the description",
  responsibilities: ["Find leads"],
  requirements: ["Good communication"],
  postedOnIso: "2026-11-19",
  applyByIso: "2026-12-15",
  url: `${PORTAL}/${id}`,
  applyUrl: `${PORTAL}/${id}#apply`,
  postedLabel: "Posted 1 day ago",
  applyByLabel: "15 Dec 2026",
  ...over,
});

const two: Careers = {
  state: "jobs",
  jobs: [job("bde"), job("presales", { department: "Pre-sales", salary: null, experience: null, applyByIso: null, applyByLabel: null })],
  departments: ["Sales", "Pre-sales"],
};

describe("with jobs", () => {
  const html = renderToStaticMarkup(<JobsSection careers={two} />);

  it("shows a card for each job, with every link to the portal in the same tab", () => {
    expect(html.match(/<h3/g)).toHaveLength(2);
    expect(html).toContain(`href="${PORTAL}/bde"`);
    expect(html).toContain(`href="${PORTAL}/bde#apply"`);
    expect(html.match(/Apply now/g)).toHaveLength(2);
    expect(html).not.toMatch(/target=/);
  });

  it("shows department above the title, and location, type, experience and salary as chips", () => {
    expect(html).toContain("Sales");
    expect(html).toContain("New Delhi (Netaji Subhash Place)");
    expect(html).toContain("Full-time");
    expect(html).toContain("0–2 years");
    expect(html).toContain("₹3–4.5 LPA + incentives");
  });

  it("hides salary, experience and apply-by when the feed has none", () => {
    const card = html.split("<li class=\"rounded-[--radius-lg]")[2] ?? "";
    expect(card).toContain("Role presales");
    expect(card).not.toContain("0–2 years");
    expect(card).not.toContain("LPA");
    expect(card).not.toContain("Apply by");
  });

  it("says when it was posted and when to apply by", () => {
    expect(html).toContain("Posted 1 day ago");
    expect(html).toContain("Apply by 15 Dec 2026");
  });

  it("has filter chips because there is more than one department", () => {
    expect(html).toContain('aria-label="Filter by department"');
    for (const chip of ["All", "Sales", "Pre-sales"]) expect(html).toContain(`>${chip}</button>`);
  });

  it("has no filter chips with a single department", () => {
    const one = renderToStaticMarkup(
      <JobsSection careers={{ state: "jobs", jobs: [job("a"), job("b")], departments: ["Sales"] }} />,
    );
    expect(one).not.toContain("Filter by department");
  });

  it("keeps each job's details in the page but hidden until asked for", () => {
    expect(html).toContain("View details");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<div id="[^"]+" hidden=""[^>]*>[\s\S]*?Responsibilities/);
    expect(html).toContain("Find leads");
  });

  it("offers no details button for a job with no responsibilities or requirements", () => {
    const bare = renderToStaticMarkup(
      <JobsSection careers={{ state: "jobs", jobs: [job("a", { responsibilities: [], requirements: [] })], departments: [] }} />,
    );
    expect(bare).not.toContain("View details");
  });

  it("escapes anything in the feed that looks like markup", () => {
    const hostile = renderToStaticMarkup(
      <JobsSection
        careers={{
          state: "jobs",
          jobs: [job("x", { title: "<img src=x onerror=alert(1)>", summary: "<script>alert(1)</script>" })],
          departments: [],
        }}
      />,
    );
    expect(hostile).not.toContain("<img src=x");
    expect(hostile).not.toContain("<script>alert");
    expect(hostile).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});

describe("with no jobs", () => {
  const html = renderToStaticMarkup(<JobsSection careers={{ state: "empty" }} />);

  it("says so and offers the resume address", () => {
    expect(html).toContain("No openings right now. Send your resume to");
    expect(html).toContain('href="mailto:hr.preeti@techzoidtechnologies.com"');
    expect(html).toContain("keep it on file");
    expect(html).not.toContain("Apply now");
  });
});

describe("when the feed cannot be reached", () => {
  const html = renderToStaticMarkup(<JobsSection careers={{ state: "unavailable" }} />);

  it("sends the visitor to the portal, in plain words", () => {
    expect(html).toContain("See current openings on our careers portal");
    expect(html).toContain(`href="${PORTAL}"`);
    expect(html).not.toMatch(/target=/);
  });

  it("shows no technical message", () => {
    expect(html).not.toMatch(/error|failed|timeout|fetch|500|undefined|null/i);
  });
});

describe("the home page strip", () => {
  it("shows nothing with no jobs, and nothing when the feed is down", () => {
    expect(renderToStaticMarkup(<HiringStripView careers={{ state: "empty" }} />)).toBe("");
    expect(renderToStaticMarkup(<HiringStripView careers={{ state: "unavailable" }} />)).toBe("");
  });

  it("names the first job and counts the rest", () => {
    const html = renderToStaticMarkup(<HiringStripView careers={two} />);
    expect(html).toContain("We’re hiring: Role bde and 1 more role");
    expect(html).toContain('href="/careers"');
    expect(html).toContain("See openings");
  });

  it("links up to three job titles to their own pages", () => {
    const four: Careers = {
      state: "jobs",
      jobs: ["a", "b", "c", "d"].map((id) => job(id)),
      departments: ["Sales"],
    };
    const html = renderToStaticMarkup(<HiringStripView careers={four} />);
    expect(html).toContain("and 3 more roles");
    for (const id of ["a", "b", "c"]) expect(html).toContain(`href="${PORTAL}/${id}"`);
    expect(html).not.toContain(`href="${PORTAL}/d"`);
  });

  it("says 'and 1 more role' in the singular", () => {
    expect(renderToStaticMarkup(<HiringStripView careers={two} />)).toMatch(/and 1 more role(?!s)/);
  });
});

describe("no feed text is ever inserted as HTML", () => {
  it.each([
    "src/components/careers/jobs-list.tsx",
    "src/components/careers/live-jobs.tsx",
    "src/components/careers/hiring-strip.tsx",
    "src/app/careers/page.tsx",
  ])("%s has no dangerouslySetInnerHTML", (file) => {
    // Its use, not the word: the components' comments explain the rule by name.
    expect(readFileSync(file, "utf8")).not.toMatch(/dangerouslySetInnerHTML\s*[=:]|\binnerHTML\b\s*=/);
  });
});
