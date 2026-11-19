import { createServer } from "node:http";

/**
 * A stand-in for the HR system's public jobs feed, for testing the careers page
 * without touching the real one.
 *
 *   /jobs   three jobs in two departments, one with every optional field null,
 *           one whose text looks like markup, to prove it is shown as text
 *   /empty  a valid feed with no jobs
 *   /hang   never answers, to prove the five-second timeout
 *   /bad    200, but not a feed
 *
 * Point the app at it with CAREERS_FEED_URL, e.g. http://localhost:4010/jobs.
 * Nothing here is a real job or a real person.
 */
const P = "https://hr.techzoidtechnologies.com/careers";

const JOBS = [
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
    responsibilities: ["Find and qualify leads", "Run product demos"],
    requirements: ["Good communication", "Comfortable with targets"],
    posted_on: new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10),
    apply_by: "2030-12-15",
    url: `${P}/business-development-executive`,
    apply_url: `${P}/business-development-executive#apply`,
  },
  {
    id: "presales-engineer",
    title: "Pre-sales Engineer",
    department: "Pre-sales",
    location: "New Delhi",
    employment_type: "Full-time",
    experience: null,
    salary: null,
    openings: 2,
    summary: null,
    responsibilities: [],
    requirements: [],
    posted_on: new Date().toISOString().slice(0, 10),
    apply_by: null,
    url: `${P}/presales-engineer`,
    apply_url: `${P}/presales-engineer#apply`,
  },
  {
    id: "sales-trainee",
    title: "Sales Trainee <b>bold</b>",
    department: "Sales",
    location: "New Delhi",
    employment_type: "Internship",
    experience: "Fresher",
    salary: "₹15,000 per month",
    openings: 3,
    summary: "<img src=x onerror=alert(1)> plain text only",
    responsibilities: ["Shadow the sales team"],
    requirements: [],
    posted_on: "2026-11-01",
    apply_by: "2030-01-31",
    url: `${P}/sales-trainee`,
    apply_url: `${P}/sales-trainee#apply`,
  },
];

const wrap = (jobs) => ({
  company: "TechZoid Technologies Pvt. Ltd.",
  careers_url: P,
  count: jobs.length,
  updated_at: new Date().toISOString(),
  jobs,
});

export function startMockFeed(port = 4010) {
  const server = createServer((request, response) => {
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
      response.end(typeof body === "string" ? body : JSON.stringify(body));
    };
    // The query string is ignored, so a test can vary it to get a cold cache.
    const path = new URL(request.url ?? "/", "http://mock").pathname;
    if (path === "/jobs") return send(200, wrap(JOBS));
    if (path === "/empty") return send(200, wrap([]));
    if (path === "/bad") return send(200, { hello: "world" });
    if (path === "/hang") return; // never answers
    send(404, { error: "not found" });
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

// Run directly: `node scripts/verify/lib/mock-hr-feed.mjs [port]`
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 4010);
  await startMockFeed(port);
  console.log(`mock HR feed on http://localhost:${port}  (/jobs /empty /hang /bad)`);
}
