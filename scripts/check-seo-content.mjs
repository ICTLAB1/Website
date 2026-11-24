#!/usr/bin/env node
// Validates content/seo/*.json: word counts, banned words, links, price tokens. Usage: node scripts/check-seo-content.mjs [prefix...]
import { readdirSync, readFileSync } from "node:fs";
const dir = new URL("../content/seo/", import.meta.url).pathname;
const S = JSON.parse(readFileSync(new URL("./seo-slugs.json", import.meta.url)));
const prefixes = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith(".json") && (prefixes.length === 0 || prefixes.some((p) => f.startsWith(p))));
const allProducts = new Set([...S.products, ...S.newProducts]), priced = new Set(S.priced), posts = new Set([...S.posts, ...S.newPosts]);
const brands = new Set(S.brands), services = new Set(S.services), routes = new Set(S.newRoutes), pages = new Set(S.pages);
const words = (t) => (t.match(/\S+/g) ?? []).length;
const text = (o) => typeof o === "string" ? o : Array.isArray(o) ? o.map(text).join("\n") : o && typeof o === "object" ? Object.entries(o).filter(([k]) => k !== "needsVerification").map(([, v]) => text(v)).join("\n") : "";
let bad = 0;
for (const f of files) {
  const d = JSON.parse(readFileSync(dir + f, "utf8")); const t = text(d); const errs = [];
  const n = words(t);
  const min = f.startsWith("blog-") ? 1500 : f.startsWith("refresh-") ? 0 : f.startsWith("brand-") ? 800 : f.startsWith("category-") ? 1000 : f.startsWith("product-") ? 750 : 0;
  const max = f.startsWith("blog-") ? 2400 : 99999;
  if (n < min) errs.push(`only ${n} words (need ${min})`); if (n > max) errs.push(`${n} words (max ${max})`);
  if (new RegExp("\\b" + "vend" + "ors?\\b", "i").test(t)) errs.push("contains a banned word (see brief)");
  if (/\btechzoid\b/.test(t.replace(/TechZoid/g, ""))) errs.push("TechZoid capitalisation");
  if (/authori[sz]ed (partner|reseller|distributor)|official partner|gold partner|platinum partner|best price|lowest price|fastest/i.test(t)) errs.push("forbidden claim wording");
  if (/₹\s?\d|Rs\.?\s?\d|INR\s?\d/.test(t)) errs.push("hard-coded price (use {{price:slug}} for priced products only)");
  for (const m of t.matchAll(/\{\{(price|gst):([a-z0-9-]+)\}\}/g)) if (!priced.has(m[2])) errs.push(`price token for unpriced or unknown product: ${m[2]}`);
  for (const m of t.matchAll(/\]\((\/[^)\s#]*)/g)) {
    const u = m[1].replace(/\/$/, "") || "/"; let ok = routes.has(u);
    let r;
    if ((r = u.match(/^\/products\/(.+)$/))) ok = allProducts.has(r[1]);
    else if ((r = u.match(/^\/blog\/(.+)$/))) ok = posts.has(r[1]);
    else if ((r = u.match(/^\/brands\/(.+)$/))) ok = brands.has(r[1]);
    else if ((r = u.match(/^\/services\/(.+)$/))) ok = services.has(r[1]);
    else if (!ok) ok = pages.has(u.slice(1));
    if (!ok) errs.push(`unknown link ${m[1]}`);
  }
  if (d.faqs && (d.faqs.length < 5 || d.faqs.length > (f.startsWith("category-") ? 8 : 7)) && !f.startsWith("refresh-")) errs.push(`${d.faqs.length} FAQs (need 5-7; brand hubs exactly 6)`);
  if (f.startsWith("brand-") && d.faqs?.length !== 6) errs.push("brand hubs need exactly 6 FAQs");
  console.log(`${errs.length ? "FAIL" : "ok  "} ${f} (${n} words)${errs.length ? "\n   - " + errs.join("\n   - ") : ""}`); bad += errs.length ? 1 : 0;
}
process.exit(bad ? 1 : 0);
