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

### S3 — The privacy policy published retention periods nothing enforced

**Status: Fixed, and switched on in reporting mode only.**

The privacy policy publishes a table of seven retention periods and then says,
of everything outside a statutory minimum, that it "can be, and is" deleted.
Nothing in the codebase deleted any of it. `deleteMany` appeared only against
sessions, tokens and rate-limit buckets; there was no scheduled purge, no cron
entry, and no retention module.

Under the Digital Personal Data Protection Act, 2023 a published retention
period is a commitment to the person whose data it is. A commitment nothing
implements is a false statement on a public page, which is the part that makes
this a defect rather than a missing feature.

Three of the seven rows are enforceable in this database — enquiries that led
to nothing, closed support tickets, audit entries — and
`src/lib/privacy/retention.ts` now implements those and names the other four
with the reason each is held back, so the table is accounted for in full rather
than silently partial. Two of the four are statutory *minimums* the policy
itself says cannot be shortened; deleting against them would implement a
sentence the policy does not contain.

`POST /api/privacy/retention` **reports and deletes nothing** unless the body
says `{"apply":true}`. That is not timidity: the first run against production
meets however many years of backlog nobody has ever applied a rule to, so every
eligible row is historical and the count is the only evidence of whether the
rules say what their author meant. Against the development database the dry run
reports 35 enquiries eligible and 9 held back for carrying a quotation, deal or
document — so the exclusion is doing work rather than passing vacuously.

### S4 — Closing a ticket recorded no closure date

**Status: Fixed.**

Found while implementing S3, and it is why that rule could never have fired.
The published period for a support ticket runs "3 years from closure", and
`resolvedAt` — the only closure date there is — was never written by the admin
form that closes most tickets. `ticket-service.ts` stamped it on RESOLVED and
deliberately left it alone on CLOSED, which is right for a ticket resolved on
Tuesday and closed on Friday but leaves a ticket taken straight from OPEN to
CLOSED with no date at all. The status form in `quote-actions.ts` never touched
the column.

So the retention rule would have reported zero for ever, the admin page said
nothing about when a ticket was resolved, and no response-time figure could be
computed from a closure. One helper, `closedAt`, now decides the column from the
status in both paths: stamp on resolution, keep an existing date when a resolved
ticket is later closed, stamp when there is none, clear on reopening.

### S5 — A scheduled route's token never reached the container

**Status: Fixed.**

`QUOTE_FOLLOWUP_TOKEN` was documented in `.env.example`, documented in the
deployment guide with a cron line to install, and read by the route — and absent
from `deploy/docker-compose.prod.yml`. Compose forwards only the variables named
in a service's `environment` block, so the value sat in the server's `.env` and
never reached the process.

The route therefore answered 404 to its own cron line. No quotation follow-up
has ever been sent automatically, and `expireStaleQuotes()` — which the same run
performs — never ran either, so quotation statuses have only ever been corrected
at the moment a customer responded.

Nothing about that failure is visible from outside: the route is *meant* to
answer 404 when the token is unset, `curl` reports success because it got a
response, and the only symptom is an absence of email. `tests/scheduled-route-tokens.test.ts`
now walks every `route.ts`, collects each `process.env.*TOKEN` it reads, and
fails if one is missing from the compose file or from `.env.example`.

Checked and clean: `verify:authz` 17/17, `verify:attack`, no secrets in the
client bundle (`verify:crawl` checks for leaked configuration across 269
pages). Security headers audited in full — `nosniff`, `DENY`,
`strict-origin-when-cross-origin`, a nonce-based CSP with `strict-dynamic`,
`same-origin` COOP, a permissions policy disabling camera, microphone,
geolocation, payment and USB, and HSTS at two years with `includeSubDomains;
preload`. Nothing to fix. Upload handling likewise: the type is taken from the
file's magic bytes and the extension is used only to disambiguate a ZIP
container, so a renamed executable is refused on its contents.

## Accessibility and responsiveness

**Status: Verified — no violations found.**

- `verify:a11y` — no violations across 21 pages × 2 widths
- `verify:responsive` — no horizontal overflow or console errors across 16
  pages × 11 widths, and no navigation panel escapes the viewport at 5 desktop
  widths
- `verify:interactions` — 26/26, including that the first tab stop is the skip
  link and that it targets main content

### A11 — The accessibility suite was testing WCAG 2.1, not 2.2

**Status: Fixed.**

`verify:a11y` ran axe-core with the tags `wcag2a`, `wcag2aa`, `wcag21a` and
`wcag21aa` — so the suite reported a clean WCAG **2.1** AA run while the brief
and this document both said 2.2. The gap is one automatable rule, and it is the
one that matters most on a phone: `target-size`, success criterion 2.5.8, which
fails a tap target under 24 × 24 CSS pixels with no spacing to make up for it.
Nothing in the 2.1 set notices a 20px icon button. The 2.2 tags are now in the
run.

### WCAG 2.2 — the five criteria no rule engine can decide

**Status: New suite, `verify:wcag22`, clean across 12 pages.**

2.2 added six success criteria. axe-core automates exactly one of them, so a
clean axe run at 2.2 tags is not a 2.2 audit. The new suite drives a browser
through the other five:

| Criterion | How it is decided |
| --- | --- |
| 2.4.11 Focus Not Obscured (AA) | Tab forty stops, and ask the browser what is painted at the centre of each focused element |
| 2.5.7 Dragging Movements (AA) | Look for drag-only affordances; none exist, which is how the site passes |
| 3.2.6 Consistent Help (A) | Record the help link's position as a fraction of each page's links, and compare across pages |
| 3.3.7 Redundant Entry (A) | Every control holding personal data carries an `autocomplete` token, so a browser can refill it |
| 3.3.8 Accessible Authentication (AA) | No password or one-time-code field blocks paste, and each names itself to a password manager |

The focus check tabs for real rather than calling `.focus()` from inside the
page, and that distinction was not academic: the first version drove focus by
script and reported ninety-nine footer links as "off screen", which was
measuring its own scroll timing rather than the page. It now reports only
elements that something is painted over.

It was also confirmed to bite rather than to pass vacuously — inserting a
sticky bar over the top 400 pixels of each page turns the clean run into
sixty-two findings. Its one known blind spot is stated in the script: an
overlay drawn as a `::before`/`::after` pseudo-element is attributed by
`elementFromPoint` to its originating element and is not caught.

3.3.7 passes properly rather than narrowly. The enquiry form does not merely
carry `autocomplete` tokens; it prefills from the signed-in account, so a
returning customer is not asked for their name, company, email and telephone a
second time.

Automated coverage is still not the whole of 2.2 AA. Nothing here judges
whether a reading order makes sense, whether an error message is useful, or
whether a heading describes what follows it. What is now true is that the
machine-checkable part is checked against the right version of the standard.

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

## Product page template — audited

All 88 product pages, against the brief's fifteen-point structure.

**At 100%:** breadcrumb, `Product` structured data, brand named, image,
summary, features, price-or-quote route, delivery and support, related
products, enquiry call to action.

**Complementary, not missing:** Specifications showed 41% and licence terms
59%, which looks like a gap until you check whether they overlap — zero pages
have both, zero have neither. Hardware has no licence term and software has no
spec sheet, and the source says so where the choice is made.

### A9 — FAQs on 13 of 88 product pages

**Status: Verified — improved to 69 of 88.**

The answers existed; they were written against the brand and published only on
the brand page. 56 products had no FAQ of their own and a brand behind them
with relevant answers already written. Those now appear on the product page
under a heading that names the brand — "Frequently asked questions about
Microsoft licensing" — so a programme-level answer cannot be read as a claim
about one model. A product with its own answers shows those alone, as before.

Nineteen remain without, because their brands have none either. Those need
writing; inventing them to fill a template would be inventing product
information.

## Search — audited, sound

Tested against the brief's own cases on the running site:

| Query | Result |
| --- | --- |
| `M365 Business Premium` | finds Microsoft 365 Business Premium |
| `Adobe Acrobat` | Acrobat Pro and Standard only — no Office contamination |
| `AutoCAD` | AutoCAD plus the AEC and PDM collections that contain it |
| `office 365`, `m365`, `acrobat pro`, `poweredge` | all return sensible sets |
| `autocadd` (misspelt) | clean empty state offering to source it |

No fuzzy matching, which the brief lists as optional. The empty state does the
work instead, and it offers a quote route rather than a dead end.

### A10 — Price checks broke the moment a foreign rate was set

**Status: Verified — fixed.**

`verify:prices` and `verify:hardware` enforce "hardware is quoted, never
priced" by scanning the whole `<body>` for a rupee sign. The header's currency
selector reads "₹ INR" once an administrator sets a dollar or dirham rate, so
both suites would have reported a price on every hardware page the first time
multi-currency display was switched on in production. They scan `main` now.

Worth recording how it surfaced: the suites failed here, and the first
diagnosis — that the server merge had promoted a priced record — was wrong. No
hardware variant on this site carries a price at all. The rupee sign came from
a USD rate left in this container by an earlier test run.

## Conversion path — verified

- `verify:requirements` 23/23
- `verify:crm` 41/41
- `verify:prices` 37/37, `verify:hardware` 23/23 (after the fix above)
- `verify:lifecycle` 19/19 — enquiry through to fulfilment and renewal
- `verify:acceptance` 20/20, `verify:authz` 17/17

## Homepage — assessed, no restructure warranted

It answers all seven of the brief's buyer questions, and its section order
already matches what the brief proposes: hero with search, trust strip,
featured categories, popular products, sector coverage, GeM registration,
certifications, organisations supplied, what a first engagement looks like,
licensing guidance, closing call to action. The statistics in the hero are read
from the database rather than written down.

Rebuilding it would be change for its own sake, which the brief warns against
twice.

### A12 — A validation library was writing to customers

**Status: Fixed.**

Found by submitting the contact form empty and reading the page, which is the
only way this one surfaces — the schema looks fine:

```
Business email    String must contain at least 3 character(s)
```

It names a programming type, counts characters instead of saying what to do,
and sits beside messages written for a person — "Enter your full name.", "Tell
us a little more (at least 10 characters)." The email validator was the only
one on that form with no message, so Zod supplied its own.

It was not one field. Every `.max()` in the shared schemas was messageless, so
pasting an over-long value into any field on the site produced the same
sentence, and every `z.enum()` produced worse:

```
Invalid enum value. Expected 'SALES' | 'ENTERPRISE' | 'SUPPORT' | 'GENERAL',
received ''
```

which also publishes the internal identifiers of every option.

Fixed in two places, because one of them is a floor and the other is the point.
`lib/zod-messages.ts` installs a global error map, so a validator with no
message still produces a sentence written for a person — thirty-seven files
define schemas, and adding a message to each validator fixes today and nothing
about the next schema somebody writes. The shared helpers then carry explicit
messages where the generic cannot be specific: `trimmed()` messages its own
maximum, and the email, SKU and country minimums say what they mean rather than
quoting a threshold.

`tests/validation-messages.test.ts` submits what a browser submits — every
field present, empty or malformed, never a missing key — to all eighteen shared
schemas and fails on anything that reads like a library default. Removing the
error map fails it on eight of them.

Confirmed on the rendered page, not from the test: empty email now reads "Enter
your email address.", an over-long one "Use 254 characters or fewer.", a bad
topic "Choose one of the options."

## Catalogue record audit — complete

**Status: Structurally clean. Four data gaps, all needing the business.**

The implementation plan put this first among the repairs, and it is now done
across all 88 active products and their 268 variants.

Clean, and each checked rather than assumed:

| Checked | Result |
| --- | --- |
| SKUs used by more than one product | 0 |
| Normalised product-name collisions | 0 — the two duplicate servers were the only pair |
| Variant names disagreeing with `termMonths` | 0 |
| Variants not at 18% GST | 0 |
| Products with no short description | 0 |
| Products with no variants | 0 |
| Hardware builds with no `formFactor`, so `/hardware` cannot find them | 0 |
| Products hiding a price because their *first* variant is unpriced | 0 |

The last two were suspicions, and both were wrong. Twelve unpriced variants sit
on products `isHardware()` calls software — four of them storage, networking and
a workstation — but they carry no build on any variant and `isQuoteOnly()`
catches every one of them on its final guard, so no page shows a broken price.

The remaining gaps are data, not defects, and none can be filled from here:

| | Gap | Needs |
| --- | --- | --- |
| C1 | 88 of 88 products have no HSN/SAC code | The codes, from the business's tax filings |
| C2 | 40 products claim `IN_STOCK`, unverified | See below — materially softer than recorded |
| C3 | 84 of 88 have no manufacturer part number | The line cards |
| C4 | 19 products have no FAQ of their own *and* no brand FAQ to fall back on | All 19 are HP; one set of HP brand FAQs fixes all of them |

**C2 is softer than this document previously said.** All 40 `IN_STOCK` claims
are on software; not one is on hardware. "In stock" for a CSP subscription or a
download entitlement is not a warehouse claim — it is available on demand — and
hardware, which is where the claim would be a real exposure, makes no stock
claim at all. It is still worth confirming the 40 are provisionable, but it is
not the misstatement risk it was recorded as.

## Not yet audited

Listed so the gaps are visible rather than implied complete. None of these has
been inspected against the brief's checklist:

- Homepage information hierarchy against the seven buyer questions
- Product-page template consistency against the brief's fifteen-point structure
- Navigation and conversion journey, end to end, including mobile
- Field Core Web Vitals — the figures above are loopback measurements of bytes
  shipped, not real-user data
- Manual accessibility review beyond what axe-core and `verify:wcag22`
  automate — reading order, usefulness of error messages, whether headings
  describe what follows them
- Brand and partnership claim verification
