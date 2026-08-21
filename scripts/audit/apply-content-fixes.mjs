/**
 * Applies this audit's content corrections to a database that already has data.
 *
 * Why this exists: the container seeds only when the database has no pages, so
 * restarting never overwrites content edited in the admin panel. That is the
 * right behaviour, and it means a deployment that is already running will pick
 * up this release's *code* on the next build and keep its *old copy* — the
 * reversed supplier terminology, the "Awaiting legal review" notices, the
 * duplicated product grid and the over-long meta descriptions all live in rows,
 * not in the bundle.
 *
 * Run once, on a running deployment, then restart the app container:
 *
 *     docker compose -f docker-compose.prod.yml exec app \
 *       node scripts/audit/apply-content-fixes.mjs
 *     docker compose -f docker-compose.prod.yml restart app
 *
 * The restart matters. Page content is cached under tags that are invalidated
 * when the admin panel writes; a script writing straight to the database cannot
 * invalidate anything, so without a restart the old text keeps being served
 * until each entry ages out — which looks exactly like the script not working.
 *
 * Every step is idempotent and every step reports what it did, so running it
 * twice is safe and running it on a fresh database is a no-op.
 */

const STEPS = [
  ["Terminology, in page content", "./fix-terminology.mjs"],
  ["Terminology, in the catalogue", "./fix-terminology-catalogue.mjs"],
  ["Terminology, in page metadata", "./fix-terminology-pagemeta.mjs"],
  ["Legal pages: remove the draft notices", "./finalise-legal-pages.mjs"],
  ["Home page: remove the duplicate product grid", "./consolidate-homepage.mjs"],
  ["Shorten the over-long meta descriptions", "./trim-descriptions.mjs"],
];

let failed = 0;

for (const [title, module] of STEPS) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);

  // Sequentially, and awaited: each step reads what the last one wrote.
  const before = process.exitCode;
  process.exitCode = 0;
  try {
    await import(module);
  } catch (error) {
    console.log(`  FAILED: ${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
    process.exitCode = before || 1;
    continue;
  }
  if (process.exitCode) failed += 1;
  process.exitCode = before || process.exitCode;
}

console.log(
  failed === 0
    ? `\nAll ${STEPS.length} steps completed. Restart the app container so the cached pages are rebuilt.`
    : `\n${failed} of ${STEPS.length} steps reported a problem. Read the output above before restarting.`,
);
