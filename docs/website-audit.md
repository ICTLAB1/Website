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

### A6 — Two servers listed twice

**Status: Verified — fixed.**

- **Where** `Product` rows `dell-poweredge-r760-server` and
  `hpe-proliant-dl380-server`, duplicating `dell-poweredge-r760` and
  `hpe-proliant-dl380-gen11`.
- **Problem** Two URLs for the same machine, from two generations of the
  catalogue. They compete for the same query and split the authority between
  them, and they disagree with each other — one offers five configurations,
  the other one.
- **Evidence** Queried `Product`: the thin records have one variant each, no
  `series` and no `formFactor`, so they are invisible to
  `/hardware?family=servers` entirely; the detailed records carry five and
  three variants respectively.
- **Severity** Medium. Ordinary duplicate content, on two of the most
  commercially significant hardware pages.
- **Root cause** A second catalogue generation added server records without
  reconciling them against the first.
- **Fix** `2026-10-merge-duplicate-servers`. The detailed record survives; the
  `featured` flag and popularity score move across to it first, so the
  homepage does not quietly lose a slot; the thin record is archived, not
  deleted. The withdrawn URLs 301 to the surviving product — the same machine,
  so the destination answers the question the visitor arrived with. The
  `Servers` category held only these two records, so the menu entry pointing
  at it is repointed to `/hardware?family=servers`, which finds all nineteen.
- **Verification** On a rebuilt production server: both old URLs return 301 to
  the survivor, both survivors return 200, the sitemap lists the survivors and
  not the duplicates, and both servers are still on the homepage. Migration
  re-run reports "content is up to date". `verify:crawl` passes across 269
  pages with no broken links.

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

## Catalogue audit — scope covered

90 active products, checked structurally against the database and by rendering
a sample. Findings above (A1, A6); everything below was checked and found
sound, or is a business question rather than a defect.

**Found sound.** No duplicate product names. No record missing a description
or short description. No record without variants. Canonical URLs present on
product pages. No page renders a fabricated price: the 185 zero-priced
variants show a quote route, and `₹0` appears nowhere. `Product` structured
data is a well-formed `AggregateOffer` with nested priced offers — an earlier
reading of it as "an offer with no price" was wrong, because an
`AggregateOffer` carries `lowPrice` rather than `price`.

**Missing images are deliberate.** All 90 records have an empty `imageUrl`,
and this is not a defect: `lib/representative-image.ts` supplies a category
illustration with an explicit disclaimer that it illustrates the category
rather than photographing the model. That disclaimer is what makes it honest,
and it should not be removed if photographs are added piecemeal.

### C1 — No product carries an HSN code

**Status: Needs business input.**

All 90 are null. The quotation PDF has a column for it and prints a dash. HSN
is expected on an Indian tax invoice, so this is a commercial-compliance gap
rather than a rendering one, and the codes are business data that cannot be
inferred here.

### C2 — Forty products claim to be in stock

**Status: Needs business verification.**

`availability` is `IN_STOCK` on 40 records, `MADE_TO_ORDER` on 42 and
`ON_REQUEST` on 8. A stock claim is a commitment to a buyer and the brief is
explicit that none should be published unsupported. Whether 40 lines are
genuinely held is a question for the business, not a defect to fix here.

### C3 — Sixty percent of the catalogue has never been source-verified

**Status: Needs a process, not a code change.**

`sourceCheckedAt` is null on 54 of 90. The field is exactly the
"last verified" concept the brief asks for and it already exists; it is simply
unused for most records. Commercial details — edition, term, availability —
drift, and a record nobody has checked since seeding is a record that may now
be wrong.

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

## Performance — measured

Taken 22 October 2026 on a production build (`next build` + `next start`) in
this container, over loopback. Read them as **bytes shipped**, which is what
they measure honestly. The timings are not field Core Web Vitals: there is no
network latency, no Caddy compression in front and no real device, so LCP here
is faster than any real visitor will see. No figure below is estimated.

Measured at 390px with 4x CPU throttling, before and after the image work:

| Page | Before | After | |
| --- | --- | --- | --- |
| `/` | 3,240 KB | 1,111 KB | −66% |
| `/products` | 2,732 KB | 693 KB | −75% |
| `/hardware` | 2,685 KB | 620 KB | −77% |
| `/contact` | 2,654 KB | 615 KB | −77% |

**CLS is 0 on every page measured**, at both widths, before and after. LCP
ranged 148–600 ms and did not regress.

### P1 — 1.85 MB of PNG on every page

**Status: Verified — fixed.**

PNG was 2,535 KB of the homepage's 3,240 KB. Two files were most of it: the
footer lockup at 1,113 KB and the header wordmark at 738 KB, both 2167 px wide
and drawn at 303×44 and 191×64. As WebP at a width that still covers a 3×
display they are 72 KB and 85 KB. Masters kept; aspect ratios preserved to
within 0.005; `alphaQuality: 100` because a lossy alpha channel fringes against
the charcoal footer.

### P2 — A 190 KB favicon, and 14 other PNGs

**Status: Verified — fixed.**

1,042 KB to 360 KB, recompressed in place with no filename changed — brand
logo paths are database values, `lib/pdf/assets.ts` looks for exactly
`public/logo.png`, and `manifest.ts` names the icons. The quotation PDF's
hand-rolled PNG parser accepts palette colour type, which was checked against
the source and then confirmed by rendering the letterhead.

### Remaining weight

JavaScript is 149–165 KB per page and fonts 131 KB, both reasonable. The
largest single asset left is `clients/hal.webp` at 80 KB. Nothing here is
urgent.

## Security

### S1 — Seven dependency advisories, one critical

**Status: Verified — four fixed, three deferred.**

`next` 16.3.1 → 16.4.2 (critical: unauthenticated RCE — **Windows-hosted only,
so this Linux deployment was never exposed**), `nodemailer` 9.0.5 → 10.2.1
(two advisories), `source-map-js`, `deepmerge-ts`, `sharp`. The nodemailer
major was verified end to end through the SMTP-sink suite rather than assumed.

`sharp` is not imported anywhere in `src/` — it arrives as an optional
dependency of the image optimiser, so its libheif advisory was never reachable
from application code.

### S2 — Three advisories need Prisma 7

**Status: Needs a decision.**

`prisma`, `@prisma/config` and `deepmerge-ts` each report high and each is
fixable only by Prisma 7.10.1, a semver-major step from 6.19.3. That is a
migration with its own testing, not a line in a security commit. The exposure
is in the CLI and config path that runs at build and migrate time, not the
query engine serving requests.

Checked and clean: `verify:authz` 17/17, `verify:attack`, no secrets in the
client bundle (`verify:crawl` checks for leaked configuration across 269
pages).

## Accessibility and responsiveness

**Status: Verified — no violations found.**

- `verify:a11y` — no violations across 21 pages × 2 widths
- `verify:responsive` — no horizontal overflow or console errors across 16
  pages × 11 widths, and no navigation panel escapes the viewport at 5 desktop
  widths
- `verify:interactions` — 26/26, including that the first tab stop is the skip
  link and that it targets main content

This is automated coverage, not a full WCAG 2.2 AA audit. axe-core finds a
meaningful subset; it does not judge whether the reading order makes sense or
whether an error message is useful.

## Site-wide metadata

**Status: Verified — sound.**

All 200 indexed pages: 200 status, unique title, unique description, canonical,
exactly one `<h1>`, `og:title`. No duplicate titles or descriptions. No
description over 160 characters.

One correction worth recording: an earlier pass of this reported five
over-length descriptions. That was a measurement bug — it counted the HTML
attribute, where `&` is `&amp;` and `'` is `&#x27;`. Decoded, the longest is
160. Twenty titles exceed 60 characters once `| TechZoid` is appended, the
longest 67; that is a truncation inefficiency rather than a defect, and
rewriting twenty titles risks rankings for no proven gain.

### A7 — The Delhi page was an orphan

**Status: Verified — fixed.**

In the sitemap, linked from nowhere. Now in the footer's Company column after
Contact. `verify:seo` reports an inbound link for every one of 200 pages.

### A8 — A stale lifecycle check

**Status: Verified — fixed.**

`verify:lifecycle` had been failing since the currency work renamed the
dashboard tile to "Fulfilled revenue (₹)". The product was right and the check
was stale; I had not run this suite when I made that change.

## Not yet audited

Listed so the gaps are visible rather than implied complete. None of these has
been inspected against the brief's checklist:

- Homepage information hierarchy against the seven buyer questions
- Product-page template consistency against the brief's fifteen-point structure
- Navigation and conversion journey, end to end, including mobile
- Field Core Web Vitals — the figures above are loopback measurements of bytes
  shipped, not real-user data
- Manual accessibility review beyond what axe-core automates
- Brand and partnership claim verification
