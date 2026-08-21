# One-shot content corrections

Scripts that correct **data**, not code.

They exist because of a deliberate property of the deployment: the container
seeds only when the database has no pages, so a redeploy never overwrites
content edited in the admin panel. That is the right behaviour — and it means a
release which corrects *seeded copy* reaches a running deployment as new code
and old text. Wording, removed blocks and rewritten page descriptions all live
in rows.

Run them all, in order, with:

```bash
node scripts/audit/apply-content-fixes.mjs
```

or on a deployed site, per `deploy/README.md`:

```bash
docker compose -f docker-compose.prod.yml exec app \
  node scripts/audit/apply-content-fixes.mjs
docker compose -f docker-compose.prod.yml restart app
```

The restart is required. Page content is cached under tags invalidated when the
admin panel writes; a script writing straight to the database cannot invalidate
anything, so the old text keeps being served until each entry ages out.

| Script | What it corrects |
| --- | --- |
| `fix-terminology.mjs` | Ambiguous "vendor" in page blocks. Each edit names the page, the block and the exact string. |
| `fix-terminology-catalogue.mjs` | The same, in products, brands, services, FAQs and articles — including strings nested inside JSON columns. |
| `fix-terminology-pagemeta.mjs` | The same, in `Page.title`, `.description` and `.keywords`. |
| `finalise-legal-pages.mjs` | Removes the "Awaiting legal review" notice from the five legal documents and gives each a publication date. |
| `consolidate-homepage.mjs` | Removes the duplicated product grid and fixes the brand strip's caption. |
| `trim-descriptions.mjs` | Shortens meta descriptions that a search result would truncate. |

## Two rules these follow

**Idempotent.** Every one matches on the exact text it expects to replace. Run
twice and the second run reports that everything is already correct. Run against
a database seeded from the current release and every one is a no-op.

**Never silently overwrite an edit.** Text that has moved on — because somebody
changed it in the admin panel — is reported and left alone, never replaced with
what the script assumed was there.

## What is not here

The ad-hoc scripts that *found* these problems are not kept. Their job is done
and permanently covered:

- `tests/public-surface.test.ts` fails if the terminology, a configuration
  warning or an environment variable name returns to the source or the seed
  data.
- `scripts/verify/crawl.mjs` fails if any of it reaches a rendered page, which
  is the only place the source and the database meet.

The seed files under `prisma/` were corrected directly and are covered by that
first test, so there is nothing to re-run for them.
