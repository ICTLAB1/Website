import { readFileSync } from "node:fs";

/**
 * Diffs two text snapshots, reporting sentences present before and absent after.
 *
 * Compares on a letters-and-digits-only stream so it is immune to how
 * `innerText` happened to join adjacent elements — that difference is markup,
 * not content, and comparing raw words produces a flood of false positives.
 *
 *   BEFORE=/tmp/a AFTER=/tmp/b node scripts/verify/text-diff.mjs
 */
const before = JSON.parse(readFileSync(`${process.env.BEFORE}/snapshot.json`, "utf8"));
const after = JSON.parse(readFileSync(`${process.env.AFTER}/snapshot.json`, "utf8"));

const stream = (value) => (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

let clean = 0;
const issues = [];

for (const [path, b] of Object.entries(before)) {
  const a = after[path];
  if (!a || a.status !== 200) {
    issues.push([path, [`page is ${a?.status ?? "absent"} after`]]);
    continue;
  }

  const target = stream(a.text);
  const missing = (b.text ?? "")
    .split(/(?<=[.?!])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25)
    .filter((sentence) => !target.includes(stream(sentence)));

  if (missing.length === 0) clean += 1;
  else issues.push([path, missing]);
}

const total = Object.keys(before).length;
console.log(`  ${clean}/${total} pages preserve every sentence`);
for (const [path, missing] of issues) {
  console.log(`\n  ${path} — ${missing.length} missing:`);
  for (const sentence of missing.slice(0, 6)) console.log(`     "${sentence.slice(0, 150)}"`);
}
process.exit(issues.length ? 1 : 0);
