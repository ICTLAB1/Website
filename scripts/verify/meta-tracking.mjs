import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { suppressFestiveGreeting } from "./lib/festive.mjs";

/**
 * Meta lead tracking, end to end in a real browser.
 *
 * The site only loads Meta's pixel on a real hostname, so this maps
 * `test.localhost` to the local server. `fbevents.js` itself is answered with an
 * empty script (the sandbox cannot reach Meta), which leaves the stub `fbq` that
 * the site's own inline code defines — and its `queue` is exactly the list of
 * calls the site made, which is what is checked. Nothing here talks to Meta.
 *
 * Needs a server on PORT started with META_CAPI_TOKEN set to any value, so the
 * Conversions API path runs to the point of calling Meta (and fails there, which
 * the server log records).
 */

const PORT = process.env.PORT ?? "3101";
const BASE = `http://test.localhost:${PORT}`;
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

const scratch = `/tmp/verify-meta-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ${process.env.PGDB ?? "tzcamp"} -f ${scratch}`], { encoding: "utf8" }).trim();
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--host-resolver-rules=MAP test.localhost 127.0.0.1"] });

async function newContext({ consent } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await suppressFestiveGreeting(context);
  if (consent) await context.addInitScript(() => localStorage.setItem("techzoid.consent.v1", "granted"));
  const seen = { facebook: [], meta: [], csp: [] };
  // Everything outside the site is unreachable here and would hold the load event open.
  // Registered first, so the more specific routes below take precedence.
  await context.route(/^https?:\/\/(?!(test\.localhost|localhost)(:|\/|$))/, (route) => route.abort());
  await context.route("**/connect.facebook.net/**", (route) => {
    seen.facebook.push(route.request().url());
    return route.fulfill({ status: 200, contentType: "application/javascript", body: "/* stub */" });
  });
  await context.route("**/www.facebook.com/**", (route) => route.abort());
  context.on("request", (request) => {
    if (request.url().includes("/api/meta/events")) seen.meta.push(JSON.parse(request.postData() ?? "{}"));
  });
  context.on("page", (page) =>
    page.on("console", (message) => {
      if (/content security policy/i.test(message.text())) seen.csp.push(message.text().slice(0, 200));
    }),
  );
  return { context, seen };
}

const calls = (page) =>
  page.evaluate(() => Array.from(window.fbq?.queue ?? []).map((entry) => Array.from(entry)));

// Which key the site stores the consent answer under.
const consentKey = "techzoid.consent.v1";
{
  const probe = await (await browser.newContext()).newPage();
  await probe.route(/^https?:\/\/(?!(test\.localhost|localhost)(:|\/|$))/, (r) => r.abort());
  await probe.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const html = await probe.content();
  check("the pixel's loader is on the page for a real hostname", html.includes("tzMetaLoad"));
  const key = html.match(/localStorage\.getItem\(\\?"([^"\\]+)\\?"\)==='granted'\)\{window\.tzMetaLoad/)?.[1];
  check("and it reads the site's own consent key", key === consentKey, String(key));
  await probe.context().close();
}

console.log("\nno consent");
{
  const { context, seen } = await newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/adobe-licensing?utm_source=meta&utm_medium=paid_social&utm_campaign=adobe_nov&fbclid=IwAR0testclick123`);
  await page.waitForTimeout(800);
  check("Meta's script is not requested", seen.facebook.length === 0, seen.facebook.join());
  check("there is no fbq", (await page.evaluate(() => typeof window.fbq)) === "undefined");
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "mailto:test@example.com";
    link.textContent = "mail";
    link.id = "probe-mail";
    // A real click would open a mail client; here it must not navigate.
    link.addEventListener("click", (e) => e.preventDefault());
    document.body.append(link);
  });
  await page.evaluate(() => document.querySelector("#probe-mail").click());
  await page.waitForTimeout(500);
  check("clicking an email link tells our server nothing", seen.meta.length === 0);
  check("the campaign is still kept for the form", (await page.evaluate(() => sessionStorage.getItem("techzoid.attribution"))).includes("adobe_nov"));
  await context.close();
}

console.log("\naccepting");
const { context, seen } = await newContext();
const page = await context.newPage();
await page.goto(`${BASE}/adobe-licensing?utm_source=meta&utm_medium=paid_social&utm_campaign=adobe_nov&fbclid=IwAR0testclick123`);
await page.getByRole("button", { name: /accept analytics/i }).click();
await page.waitForTimeout(1200);
{
  const list = await calls(page);
  const names = list.map((c) => `${c[0]}:${c[1]}`);
  check("the pixel loads once", seen.facebook.length === 1, seen.facebook.join());
  check("it is initialised with the dataset id", list.some((c) => c[0] === "init" && c[1] === "1143158141004040"), JSON.stringify(list));
  check("automatic events are switched off", list.some((c) => c[0] === "set" && c[1] === "autoConfig" && c[2] === false));
  check("one PageView", names.filter((n) => n === "track:PageView").length === 1, names.join());
  const view = list.find((c) => c[0] === "track" && c[1] === "ViewContent");
  check("ViewContent on the product page, named for it", view && /adobe/i.test(view[2]?.content_name ?? ""), JSON.stringify(view));
  check("with an event id", Boolean(view?.[3]?.eventID));
}

console.log("\nContact");
{
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "tel:+911234567890";
    link.textContent = "call";
    link.id = "probe-tel";
    link.addEventListener("click", (e) => e.preventDefault());
    document.body.append(link);
  });
  await page.evaluate(() => document.querySelector("#probe-tel").click());
  await page.waitForTimeout(800);
  const contact = (await calls(page)).find((c) => c[0] === "track" && c[1] === "Contact");
  check("a phone click is a Contact, with an id", contact?.[3]?.eventID, JSON.stringify(contact));
  const sent = seen.meta.find((m) => m.event === "Contact");
  check("and the server is asked for the same one", sent && sent.eventId === contact?.[3]?.eventID, JSON.stringify(sent));
  check("without any personal detail", sent && !("email" in sent) && !("phone" in sent) && !sent.reference);
}

console.log("\nthe enquiry form");
let reference;
{
  const email = `meta-${Date.now()}@acme-test.localhost`;
  await page.locator('#quote input[name="companyName"]').fill("Meta Test Industries");
  await page.locator('#quote input[name="contactName"]').fill("Meera Test");
  await page.locator('#quote input[name="contactDesignation"]').fill("IT Manager");
  await page.locator('#quote input[name="contactEmail"]').fill(email);
  await page.locator('#quote input[name="contactPhone"]').fill("9876501234");
  await page.locator('#quote select[name="lines.0.description"]').selectOption({ index: 1 });
  await page.locator('#quote input[name="lines.0.quantity"]').fill("25");
  await page.getByRole("button", { name: "Request a quotation" }).click();
  await page.waitForURL("**/thank-you", { timeout: 15000 }).catch(() => {});
  check("a successful submission goes to /thank-you", page.url().endsWith("/thank-you"), `${page.url()} ${page.url().endsWith("/thank-you") ? "" : (await page.locator("#quote").innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
  check("and the address carries no reference", !page.url().includes("ENQ"));
  await page.waitForTimeout(1500);

  const body = await page.locator("main").innerText();
  check("it says the team will be in touch", /our team will contact you shortly/i.test(body), body.slice(0, 120));
  check("it shows the sales address, linked", (await page.locator('a[href^="mailto:sales@"]').count()) >= 1);
  check("it links back to home", (await page.getByRole("link", { name: "Back to home" }).count()) === 1);
  reference = body.match(/ENQ-\d{4}-[A-Z0-9]{6}/)?.[0];
  check("and shows the reference", Boolean(reference), body.slice(0, 200));

  // The move to /thank-you is a client-side navigation, so the pixel's queue still holds the form page's calls.
  const leads = (await calls(page)).filter((c) => c[0] === "track" && c[1] === "Lead");
  const serverLead = seen.meta.find((m) => m.event === "Lead");
  check("the server was asked for exactly one Lead", seen.meta.filter((m) => m.event === "Lead").length === 1, JSON.stringify(seen.meta.map((m) => m.event)));
  check("with the id derived from the reference", serverLead?.eventId === `lead-${reference}`, JSON.stringify(serverLead));
  check("and the campaign's click id", serverLead?.fbclid === "IwAR0testclick123", JSON.stringify(serverLead));
  check("the browser reported it exactly once, with that id", leads.length === 1 && leads[0][3].eventID === `lead-${reference}`, JSON.stringify(leads));
  check("sent from the form's own page", serverLead?.url?.includes("/adobe-licensing"), serverLead?.url);

  const row = sql(`select position('Campaign name: adobe_nov' in "requirements") > 0, position('Campaign source: meta' in "requirements") > 0, position('Meta click id: IwAR0testclick123' in "requirements") > 0, position('First page seen: /adobe-licensing' in "requirements") > 0 from "Enquiry" where "contactEmail"='${email}';`);
  check("the enquiry record shows the campaign", row === "t|t|t|t", row);

  await page.reload();
  await page.waitForTimeout(1200);
  check("a refresh reports nothing more", !(await calls(page)).some((c) => c[1] === "Lead"));
  check("and still shows the reference", (await page.locator("main").innerText()).includes(reference));
}

console.log("\nthe contact form");
{
  const email = `meta-contact-${Date.now()}@acme-test.localhost`;
  const before = seen.meta.length;
  await page.goto(`${BASE}/contact?utm_source=meta&utm_campaign=contact_test`);
  await page.waitForTimeout(500);
  await page.locator('input[name="name"]').fill("Meera Contact");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="phone"]').fill("9876509999");
  await page.locator('select[name="topic"]').selectOption("SALES");
  await page.locator('textarea[name="message"]').fill("We need forty Adobe licences for the design team.");
  await page.getByRole("button", { name: /send/i }).first().click();
  await page.waitForURL("**/thank-you", { timeout: 15000 }).catch(() => {});
  check("also lands on /thank-you", page.url().endsWith("/thank-you"), page.url());
  await page.waitForTimeout(1200);
  const lead = seen.meta.slice(before).find((m) => m.event === "Lead");
  check("a sales enquiry is a Lead", lead?.reference?.startsWith("TKT-"), JSON.stringify(lead));
  const row = sql(`select position('Campaign name: contact_test' in "message") > 0 from "SupportTicket" where "message" like '%${email}%';`);
  check("the ticket shows the campaign", row === "t", row);
}

console.log("\nrevoking");
{
  await page.goto(`${BASE}/cookie-policy`);
  await page.waitForTimeout(500);
  const before = seen.meta.length;
  await page.getByRole("button", { name: /reject/i }).first().click();
  await page.waitForTimeout(500);
  check("refusing tells a loaded pixel to stop", (await calls(page)).some((c) => c[0] === "consent" && c[1] === "revoke"), JSON.stringify(await calls(page)));
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "mailto:x@example.com";
    link.id = "probe-after";
    link.addEventListener("click", (e) => e.preventDefault());
    link.textContent = "mail";
    document.body.append(link);
  });
  await page.evaluate(() => document.querySelector("#probe-after").click());
  await page.waitForTimeout(500);
  check("and nothing more is sent", seen.meta.length === before);
}
check("no content-policy violations in the console", seen.csp.length === 0, seen.csp.join(" | "));
await context.close();

console.log("\na thank-you page reached by hand");
{
  const { context: ctx, seen: s } = await newContext({ consent: true });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/thank-you`);
  await p.waitForTimeout(1200);
  check("shows no reference", !/ENQ-|TKT-/.test(await p.locator("main").innerText()));
  check("reports no lead", !(await calls(p)).some((c) => c[1] === "Lead") && !s.meta.some((m) => m.event === "Lead"));
  check("is not offered to search engines", (await p.locator('meta[name="robots"]').getAttribute("content"))?.includes("noindex"));
  await ctx.close();
}

console.log("\nlocalhost");
{
  const local = await (await browser.newContext()).newPage();
  await local.route(/^https?:\/\/(?!(test\.localhost|localhost)(:|\/|$))/, (r) => r.abort());
  await local.goto(`http://localhost:${PORT}/`);
  check("carries no pixel at all", !(await local.content()).includes("tzMetaLoad"));
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
