# Website audit

Started 22 October 2026. Live and open — findings are added as they are
established, and nothing is listed here that has not been checked.

Every entry carries a status, and the statuses mean what they say:

| Status | Meaning |
| --- | --- |
| **Verified** | Checked against running code or live production, with the evidence recorded |
| **Implemented, unverified** | Code written, not yet proven to behave |
| **Blocked** | Needs a credential, an account or an answer this repository cannot supply |
| **Needs business approval** | A commercial decision, not an engineering one |

A finding is not recorded as confirmed because it is plausible. Several things
that looked like defects turned out not to be, and those are listed too — a
ruled-out finding is worth as much as a confirmed one to whoever audits next.

## Baseline

Established 22 October 2026 from the repository and a production build.

| | |
| --- | --- |
| Framework | Next.js 16.3.1, App Router |
| UI | React 19.2.8, Tailwind CSS v4 |
| Data | Prisma 6.19.3 against PostgreSQL |
| Package manager | npm, `package-lock.json` committed |
| Hosting | Docker Compose on an Azure VM (`techzoid-vm`, Central India), Caddy in front |
| Deployment | Manual `workflow_dispatch` → SSH → `git pull` → `docker compose up -d --build` |
| Pages | 93 `page.tsx` route files |
| API routes | 23 `route.ts` handlers |
| Unit tests | 59 files, 797 tests — all passing |
| Browser/integration suites | 47 scripts under `scripts/verify/` |
| Build | Passes |

This repository **is** the production website. The deploy workflow pulls this
same repository onto the VM that serves `techzoidtechnologies.com`, so a change
merged to `main` and deployed is live. It is not a template or a separate
project.

Content is database-backed, not file-backed: pages are `Page` + `PageSection`
rows edited at `/admin/pages`, and changes to seeded content ship as *content
migrations* under `prisma/content-migrations/`, applied by the container
entrypoint. This matters for every finding below — a copy fix is usually a
migration, not an edit to a `.tsx` file.

## Confirmed defects

### A1 — Brand names rendered with the first letter doubled

**Status: Verified — fixed.**

- **Where** `src/components/marketing/brand-card.tsx`, the fallback monogram.
- **Problem** Thirty brands have no logo on file. Each rendered as its own name
  with the first letter doubled: `MMicrosoft`, `HHPE`, `OOracle`, `CCorel`,
  `IIBM`, `SSalesforce`, `EESET`, `SSophos`. Those strings were indexed as the
  brand names.
- **Evidence** Extracted text of `/brands` on a production build contained
  `MMicrosoft`. Every brand named in the original report was confirmed present
  in the no-logo set by querying `Brand`.
- **Severity** High. It is the brand's own name, on the pages that exist to
  rank for brand queries.
- **Root cause** The monogram was a text child of a span marked
  `aria-hidden="true"`, sitting immediately before the name with no whitespace
  between them. `aria-hidden` governs the accessibility tree and nothing else;
  a crawler reads the DOM. The attribute that made it look handled is what
  stopped it being noticed.
- **Fix** The letter moved to a `data-monogram` attribute drawn by
  `content: attr(…)` on a pseudo-element. Same glyph, same place, no
  contribution to the text layer, because a pseudo-element is not a node.
- **Verification** `tests/brand-monogram.test.tsx` asserts the rendered markup;
  reverting the fix fails two of its four cases. On a rebuilt production
  server, `/brands`, `/products` and `/hardware` contain no doubled-capital
  word, and three monograms still draw on `/brands`.

### A2 — Content policy refused the measurement pixels

**Status: Verified — fixed and deployed (PR #34).**

`connect-src` and `img-src` were maintained as two hand-written lists and had
drifted: `www.google.com`, `stats.g.doubleclick.net`, `analytics.google.com`
and `region1.analytics.google.com` could be connected to but not loaded as
images. `www.google.com/ads/ga-audiences` is an image request fired on every
page view once an Ads link is active, which is what Google reported as blocked
tag resources on five pages. One array now feeds both directives and a test
pins them equal. Confirmed against the live header after deployment: every
host passes in both.

### A3 — Quotation PDF summary did not reconcile

**Status: Verified — fixed and deployed (PR #32).**

The PDF read `Quote.subtotalMinor` as a net value; the database stores the
gross. With any discount present, Subtotal printed the gross plus the discount
again and Taxable Value printed the gross, while the tax lines beneath — always
correct — were charged on a different number. Visible on every discounted
quotation. The layout suite now asserts the column reconciles.

### A4 — Payment confirmation formatted every amount as rupees

**Status: Verified — fixed and deployed (PR #32).**

`notifyPaid` hard-coded `INR`. A dollar payment would have been confirmed to
the customer as a figure roughly 88 times too small, in the one message whose
purpose is to state the amount received.

### A5 — Dashboard revenue summed across currencies

**Status: Verified — fixed and deployed (PR #32).**

`_sum: { totalMinor }` across orders of any currency adds cents to paise. Now
scoped to rupee orders, with the tile labelled accordingly.

## Ruled out

Checked, and not defects. Recorded so they are not re-investigated.

- **`TType` on `/hardware`** — not a doubled letter. It is the value
  "PowerEdge T" abutting the next field's label "Type" in a spec table's text
  layer.
- **`sameAs` missing from structured data** — assumed empty, found populated
  with three profiles (LinkedIn, Facebook, Instagram), reaching both the
  `Organization` and `LocalBusiness` blocks.
- **Mail not configured** — reported as a possible cause of missing
  notifications. Production reports `graph_complete=true` and
  `acs_complete=true`; mail works. See B1 for the actual cause.
- **Enquiries "landing in Support"** — by design. Contact-form messages are
  stored as support tickets so that no inbound message is lost when email is
  down; they carry a topic, and the quote-request flow writes to `Enquiry`
  separately. Both paths confirmed working in production.

## Open findings

### B1 — Internal notifications go to an address nobody reads

**Status: Blocked — needs one admin setting.**

Production reports `notification_address_set=false`, so `salesInbox()` falls
back to the sales address on the contact page and every notification has gone
to `sales@techzoidtechnologies.com`. The site therefore sends *from* that
address *to* that address, which is a common Junk-folder trigger.

Fix is one field: **Settings → Email → "Send a copy of enquiries and orders
to"**. Not done from here deliberately — this repository is public, and
committing a personal address publishes it permanently.

### B2 — No Indian telephone number anywhere on the site

**Status: Blocked — needs the number.**

Checked against the rendered pages:

    Organization   telephone        (absent)
    Organization   contactPoint     sales — email only
    LocalBusiness  telephone        (absent)
    /contact       tel: links       2, both the Ajman office

Consequences: a Google Business Profile cannot be verified without one; a
citation is name, address *and* phone, so the listings work in
`seo/listings.md` cannot start; and `/software-licensing-company-delhi` offers
a "Call the Delhi office" button that leads to a page showing a UAE number.

One configuration value (`COMPANY_PHONE_SALES`, or the settings field) reaches
the structured data, the contact page and the quotation letterhead together.

### B3 — Seed data has drifted from production content

**Status: Needs business approval on where to run it.**

`prisma/seed-data/pages.ts` does not include recently added pages. The
entrypoint seeds and then *baselines* content migrations on an empty database,
so a brand-new deployment would not receive them. Production is unaffected.

`npm run content:export` must be run from a checkout whose database matches
production — run here, it would have deleted real content, including the
consent and cookie-policy copy.

### B4 — Foreign-currency quotations print rupee tax terms

**Status: Blocked — needs the terms written.**

`SiteSettings.quoteTermsForeign` ships empty, so a dollar or dirham quotation
falls back to the rupee terms and their "exclusive of applicable GST" clause,
which is false on an export supply. The field exists and is wired through to
both the email and the PDF.

## Not yet audited

Listed so the gaps are visible rather than implied complete. None of these has
been inspected against the brief's checklist:

- Homepage information hierarchy against the seven buyer questions
- Full catalogue record audit — names, SKUs, duplicates, licence terms,
  editions, GST treatment, availability claims
- Product-page template consistency across all 93 routes
- Navigation and conversion journey, end to end, including mobile
- Lighthouse / Core Web Vitals measurement — no figures taken, and none will be
  quoted until they are
- Accessibility pass to WCAG 2.2 AA beyond the existing `verify:a11y` suite
- Dependency vulnerability review
- Brand and partnership claim verification
