import { describe, expect, it } from "vitest";

import {
  PORTAL_URL,
  applyByLabel,
  departmentsOf,
  moreRoles,
  parseFeed,
  portalLink,
  postedAgo,
} from "@/lib/hr-feed";

const SAMPLE = {
  company: "TechZoid Technologies Pvt. Ltd.",
  careers_url: "https://hr.techzoidtechnologies.com/careers",
  count: 2,
  updated_at: "2026-11-19T17:29:12.614Z",
  jobs: [
    {
      id: "business-development-executive",
      title: "Business Development Executive",
      department: "Sales",
      location: "New Delhi (Netaji Subhash Place)",
      employment_type: "Full-time",
      experience: "0–2 years",
      salary: "₹3–4.5 LPA + incentives",
      openings: 1,
      summary: "First line of the description",
      responsibilities: ["Find leads", "Close deals"],
      requirements: ["Good communication"],
      posted_on: "2026-11-19",
      apply_by: "2026-12-15",
      url: "https://hr.techzoidtechnologies.com/careers/business-development-executive",
      apply_url: "https://hr.techzoidtechnologies.com/careers/business-development-executive#apply",
    },
    {
      id: "presales-engineer",
      title: "Pre-sales Engineer",
      department: null,
      location: "New Delhi",
      employment_type: "Full-time",
      experience: null,
      salary: null,
      openings: 2,
      summary: null,
      responsibilities: [],
      requirements: [],
      posted_on: "2026-11-10",
      apply_by: null,
      url: "https://hr.techzoidtechnologies.com/careers/presales-engineer",
      apply_url: "https://hr.techzoidtechnologies.com/careers/presales-engineer#apply",
    },
  ],
};

describe("reading the feed", () => {
  it("reads the documented shape, field by field", () => {
    const feed = parseFeed(SAMPLE);
    expect(feed?.jobs).toHaveLength(2);
    expect(feed?.jobs[0]).toMatchObject({
      id: "business-development-executive",
      title: "Business Development Executive",
      department: "Sales",
      employmentType: "Full-time",
      experience: "0–2 years",
      salary: "₹3–4.5 LPA + incentives",
      postedOnIso: "2026-11-19",
      applyByIso: "2026-12-15",
      responsibilities: ["Find leads", "Close deals"],
      applyUrl: "https://hr.techzoidtechnologies.com/careers/business-development-executive#apply",
    });
  });

  it("treats every nullable field as absent, so the page can hide it", () => {
    const job = parseFeed(SAMPLE)?.jobs[1];
    expect(job?.department).toBeNull();
    expect(job?.experience).toBeNull();
    expect(job?.salary).toBeNull();
    expect(job?.summary).toBeNull();
    expect(job?.applyByIso).toBeNull();
    expect(job?.responsibilities).toEqual([]);
  });

  it("says there are no jobs when the feed says so", () => {
    expect(parseFeed({ ...SAMPLE, count: 0, jobs: [] })?.jobs).toEqual([]);
  });

  it("is not a feed at all when the body is anything else", () => {
    for (const body of [null, undefined, "oops", 42, [], {}, { jobs: "nope" }, { jobs: null }]) {
      expect(parseFeed(body)).toBeNull();
    }
  });

  it("counts the jobs it can use, not the number the feed claims", () => {
    expect(parseFeed({ ...SAMPLE, count: 99 })?.jobs).toHaveLength(2);
  });

  it("skips a job with no id or no title, and keeps the rest", () => {
    const feed = parseFeed({
      jobs: [{ title: "No id" }, { id: "x", title: "   " }, SAMPLE.jobs[0], 7, null, "str"],
    });
    expect(feed?.jobs.map((job) => job.id)).toEqual(["business-development-executive"]);
  });

  it("shows a job once even if the feed lists it twice", () => {
    expect(parseFeed({ jobs: [SAMPLE.jobs[0], SAMPLE.jobs[0]] })?.jobs).toHaveLength(1);
  });

  it("keeps a job whose optional fields are the wrong type, without those fields", () => {
    const job = parseFeed({
      jobs: [{ ...SAMPLE.jobs[0], salary: { a: 1 }, experience: 5, responsibilities: "text", openings: "many" }],
    })?.jobs[0];
    expect(job?.title).toBe("Business Development Executive");
    expect(job?.salary).toBeNull();
    expect(job?.responsibilities).toEqual([]);
  });
});

describe("text from the feed is only ever text", () => {
  it("passes markup through as characters, to be escaped on render, never interpreting it", () => {
    const job = parseFeed({
      jobs: [{ ...SAMPLE.jobs[0], title: '<img src=x onerror=alert(1)> Sales', summary: "<script>alert(1)</script>" }],
    })?.jobs[0];
    // Still a string with angle brackets in it: React escapes it as a child.
    expect(job?.title).toBe("<img src=x onerror=alert(1)> Sales");
    expect(typeof job?.summary).toBe("string");
  });

  it("strips control characters, collapses whitespace and caps length", () => {
    const job = parseFeed({
      jobs: [{ ...SAMPLE.jobs[0], title: "Sales\u0000\u0007 \n\t  Lead", summary: "x".repeat(5000) }],
    })?.jobs[0];
    expect(job?.title).toBe("Sales Lead");
    expect(job?.summary).toHaveLength(600);
  });

  it("caps how many bullet points a job can carry", () => {
    const job = parseFeed({
      jobs: [{ ...SAMPLE.jobs[0], responsibilities: Array.from({ length: 200 }, (_, i) => `r${i}`) }],
    })?.jobs[0];
    expect(job?.responsibilities).toHaveLength(30);
  });
});

describe("links go to the portal or nowhere", () => {
  it("accepts https links on the portal's host", () => {
    expect(portalLink("https://hr.techzoidtechnologies.com/careers/x#apply")).toBe(
      "https://hr.techzoidtechnologies.com/careers/x#apply",
    );
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://hr.techzoidtechnologies.com/careers/x",
    "https://evil.example/careers/x",
    "https://hr.techzoidtechnologies.com.evil.example/x",
    "https://evil.example/@hr.techzoidtechnologies.com",
    "https://user:pw@hr.techzoidtechnologies.com/x",
    "https://hr.techzoidtechnologies.com:8443/x",
    "//hr.techzoidtechnologies.com/x",
    "/careers/x",
    "not a url",
    "",
  ])("replaces %j with the careers portal", (value) => {
    expect(portalLink(value)).toBe(PORTAL_URL);
  });

  it("applies the same rule to a job's two links, and falls back from apply to the job's own page", () => {
    const job = parseFeed({
      jobs: [{ ...SAMPLE.jobs[0], url: "https://evil.example/a", apply_url: "javascript:alert(1)" }],
    })?.jobs[0];
    expect(job?.url).toBe(PORTAL_URL);
    expect(job?.applyUrl).toBe(PORTAL_URL);

    const half = parseFeed({
      jobs: [{ ...SAMPLE.jobs[0], apply_url: "https://evil.example/a" }],
    })?.jobs[0];
    expect(half?.applyUrl).toBe(SAMPLE.jobs[0]!.url);
  });
});

describe("dates", () => {
  const now = new Date("2026-11-20T09:00:00Z");

  it("says how long ago a job was posted", () => {
    expect(postedAgo("2026-11-20", now)).toBe("Posted today");
    expect(postedAgo("2026-11-19", now)).toBe("Posted 1 day ago");
    expect(postedAgo("2026-11-10", now)).toBe("Posted 10 days ago");
  });

  it("says nothing for a missing, malformed or future date", () => {
    expect(postedAgo(null, now)).toBeNull();
    expect(postedAgo("2026-12-01", now)).toBeNull();
    const job = parseFeed({ jobs: [{ ...SAMPLE.jobs[0], posted_on: "yesterday", apply_by: "2026-13-45" }] })?.jobs[0];
    expect(job?.postedOnIso).toBeNull();
    expect(job?.applyByIso).toBeNull();
  });

  it("reads an apply-by date as a calendar date, so no time zone can move it", () => {
    expect(applyByLabel("2026-12-15")).toBe("15 Dec 2026");
    expect(applyByLabel("2027-01-01")).toBe("1 Jan 2027");
    expect(applyByLabel(null)).toBeNull();
  });
});

describe("departments and the strip's wording", () => {
  it("lists the departments in the order the jobs mention them, once each", () => {
    const jobs = parseFeed({
      jobs: [
        { ...SAMPLE.jobs[0], id: "a", department: "Sales" },
        { ...SAMPLE.jobs[0], id: "b", department: "Operations" },
        { ...SAMPLE.jobs[0], id: "c", department: "Sales" },
        { ...SAMPLE.jobs[0], id: "d", department: null },
      ],
    })!.jobs;
    expect(departmentsOf(jobs)).toEqual(["Sales", "Operations"]);
  });

  it("says 'and n more roles' with the right plural", () => {
    expect(moreRoles(1)).toBe("");
    expect(moreRoles(2)).toBe(" and 1 more role");
    expect(moreRoles(3)).toBe(" and 2 more roles");
  });
});
