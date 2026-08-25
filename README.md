# Enterprise Technology Marketplace

A B2B marketplace for enterprise software licensing, cloud and IT solutions —
catalogue, multi-brand enquiry basket, quotation workflow, direct purchasing,
order fulfilment, customer account area and an administrative back office.

The full commercial chain is implemented end to end: an enquiry becomes a
quotation, a quotation becomes an order, and a fulfilled order issues licence
and renewal records into the customer's account.

> **Before going live**, three things need attention. Populate the remaining
> business identity variables in `.env` — until they are set the site *omits*
> those details rather than displaying placeholder company information, and the
> admin dashboard lists exactly what is missing. Appoint a grievance officer and
> set `COMPANY_GRIEVANCE_OFFICER_NAME` and `..._EMAIL`; publishing a named
> officer is a legal requirement for an online seller in India, not a nicety.
> And have the five legal pages reviewed by the company's own adviser:
> `docs/legal-review-checklist.md` lists what to put in front of them. The pages
> themselves carry no draft notice — they are written to be read by customers —
> and each prints an effective and a last-updated date taken from its record.

---

## Stack

| Concern        | Choice                                                          |
| -------------- | --------------------------------------------------------------- |
| Framework      | Next.js 16 (App Router, React 19, TypeScript strict)             |
| Styling        | Tailwind CSS v4 with design tokens in `src/app/globals.css`      |
| Database       | PostgreSQL 16 via Prisma 6                                       |
| Authentication | First-party sessions: bcrypt + opaque tokens stored as HMACs     |
| Validation     | Zod, at every request boundary                                   |
| Email          | Nodemailer over SMTP; logs instead of sending when unconfigured  |
| Testing        | Vitest (unit) + Playwright/axe-core (browser verification)       |

---

## Getting started

```bash
# 1. Dependencies
npm install

# 2. Configuration
cp .env.example .env
#    Set DATABASE_URL, and generate AUTH_SECRET:
#      openssl rand -base64 48

# 3. Schema and sample catalogue
npm run db:migrate
npm run db:seed          # 8 brands, 49 products, 75 SKUs, 13 services, 8 articles

# 4. Run
npm run dev              # http://localhost:3000
```

To bootstrap an administrator, set `SEED_ADMIN_EMAIL` and a
`SEED_ADMIN_PASSWORD` of at least 10 characters before seeding. There is no
default administrator password: without those variables the seed skips the
admin account and says so.

---

## Scripts

| Script                       | Purpose                                              |
| ---------------------------- | ---------------------------------------------------- |
| `npm run dev`                | Development server                                    |
| `npm run build` / `start`    | Production build and server                           |
| `npm run check`              | typecheck → lint → unit tests → build                 |
| `npm run typecheck`          | `tsc --noEmit`                                        |
| `npm run lint`               | ESLint (Next 16 no longer lints during build)         |
| `npm test`                   | Vitest unit tests                                     |
| `npm run verify`             | Browser suites — needs a running server, see below    |
| `npm run db:migrate`         | Create and apply a migration in development           |
| `npm run db:deploy`          | Apply pending migrations (use this in production)     |
| `npm run db:seed`            | Seed catalogue and content                            |
| `npm run content:export`     | Write the live CMS content back to the seed file       |

### Browser verification

`npm run verify` drives a real Chromium against a running production build:

```bash
npm run build && npm run start &
npm run verify
```

| Suite | What it proves |
| --- | --- |
| `verify:responsive` | No horizontal page scroll and no console errors, across 12 pages × 8 widths (375–1920) |
| `verify:a11y` | Zero axe-core violations (WCAG 2.1 A/AA + best practice) across 16 pages × 2 widths |
| `verify:motion` | Reveals cause no layout shift (CLS 0.0000), content is present and visible with JavaScript disabled, reduced motion is honoured |
| `verify:interactions` | Mobile drawer, search autocomplete, basket, quote submission, catalogue filtering, keyboard navigation |
| `verify:lifecycle` | Enquiry → quotation → discount → issue → accept → order → fulfilment → licences and renewals, across two browser sessions |
| `verify:admin` | The descriptor-driven CRUD screens: create, edit, validate, archive |
| `verify:cms` | A page created after the build renders on demand; an unpublished page 404s; a block with an unreadable payload is skipped rather than fatal |
| `verify:page-editor` | Page and block editing, reordering, publishing, and the two ways a bad payload is refused |
| `verify:navigation` | Menu editing: a refused `javascript:` href, live propagation to the public header, edit, hide, add-child, reorder, cascade delete |
| `verify:authz` | A SALES session submitting a real, live-bound page/block/navigation action writes nothing — with positive controls proving the same submission as ADMIN does write |
| `verify:attack` | Price and status tampering, cross-tenant access, CSRF, privilege boundaries |
| `verify:acceptance` | End to end: create a page, add and reorder blocks, publish, add a menu link, and confirm the page, menu, sitemap and SEO metadata all follow — with no redeploy |

Two of the suites need database access for their fixtures (`verify:authz` and
`verify:attack` shell out to `psql`), so they assume the local development
database.

---

## Architecture

```
src/
  app/                     routes (App Router)
    [...slug]/             every CMS page, rendered from the database
    admin/                 back office — guarded by requireStaff in the layout
    account/               customer area — guarded by requireUser in the layout
    api/                   JSON endpoints (auth, enquiries, contact, search)
  components/              UI kit, layout, catalogue, enquiry, admin
    blocks/                one renderer per block type
  lib/
    admin/                 the descriptor-driven CRUD framework
    auth/                  sessions, CSRF, password hashing, rate limiting
    blocks/                block schemas, form shapes, reference resolution
    queries/               all database reads, grouped by surface
    validation.ts          every request schema
prisma/
  schema.prisma            relational schema
  seed-data/               catalogue, services and editorial seed content
scripts/verify/            browser verification suites
tests/                     Vitest unit tests
```

**Legal pages.** The terms of sale, privacy policy, refund and cancellation
policy, delivery policy and cookie policy are CMS pages like any other, so the
company's adviser can have wording changed without a deploy. Each carries a
`NOTICE` block saying the document is awaiting that review; approving it means
deleting one block in the admin panel. Entity details are never transcribed
into the text — the registered name, address, GSTIN and grievance officer are
rendered from configuration by the `COMPANY_INFO` block, so they cannot drift
between five documents.

**Content.** Every marketing page — the home page, `/microsoft-365`,
`/solutions/manufacturing`, `/about` and 40 others — is a database row plus an
ordered list of typed blocks, rendered by one route (`app/[...slug]`). Nothing
about them is compiled in. The navigation is a two-level tree assembled from one
flat query. Both are edited in the admin panel at `/admin/pages` and
`/admin/navigation`, and an edit reaches the public site immediately: writes
invalidate cache tags rather than waiting for a deploy.

A handful of paths keep their own route file (`/`, `/about`, `/enterprise`,
`/resources`) so they can be reasoned about and given route-specific behaviour
later, but they render through the same block pipeline — there is one renderer,
not two. Static routes win over the catch-all, and a path nothing claims returns
a genuine 404.

Blocks store *references* — a product slug, a brand, "featured" — never copies,
so a price shown on a landing page is the catalogue price because it is the same
row. Business identity is the deliberate exception in the other direction: the
`COMPANY_INFO` block and `CTA_BANNER`'s contact address read server
configuration at render time, so an administrator can place the panel without
being able to edit a GSTIN through a content form.

Block payloads are JSONB validated by a zod schema chosen on the block's type,
on write **and on read**. Reading is the important half: a row written by an
older version of the application, a migration, or by hand can hold a shape the
renderer does not expect, and that must cost one skipped section rather than a
failed marketing page.

The catch-all route deliberately leaves `dynamicParams` at its default of true.
It was once false, which fixed the set of valid paths at build time — so a page
created in the admin panel returned 404 until the next deploy, which is exactly
what a database-driven site exists to avoid.

**Motion.** Animation is present but deliberately restrained: short durations, a
decelerating curve, and only `transform` and `opacity` so the compositor can run
it without layout or paint. Three rules hold everywhere:

- Content is never hidden by markup. `Reveal` applies its hidden state after
  hydration and only to elements already below the fold, so a reader never sees
  content disappear, and a reader without JavaScript sees a normal page.
- `prefers-reduced-motion` is honoured, and honoured *correctly*: the reduced
  block also resets the reveal transform, since disabling a transition alone
  would leave content stuck in its translated, transparent start state.
- Nothing animates that would move layout. Verified: scrolling the homepage
  through every reveal measures a Cumulative Layout Shift of 0.

**Money.** Stored and computed as integer minor units (paise). Floating point is
never used for prices, discounts or tax. All quotation and order arithmetic goes
through `src/lib/pricing.ts`, which is pure and exhaustively unit tested: a
discount can never push a line negative, tax is charged on the discounted
amount, and document totals always reconcile against their lines exactly.

**Commercial lifecycle.**

```
enquiry ──(staff drafts)──► quotation ──(staff issues)──► SENT
                                                            │
                                   (customer accepts + PO)  ▼
                                                          order ──(staff fulfils)──► licences
                                                                                     + renewals
```

Prices are read from the catalogue when a quotation is drafted and then frozen
onto its lines, so a later catalogue change cannot alter a quotation already
sent — which is what makes its stated validity period meaningful. Issued
quotations are locked against editing for the same reason.

**Purchase modes.** Each product carries `DIRECT`, `ENQUIRY` or `BOTH`. Products
that permit it offer a direct purchase at `/buy?sku=…`, raised against a
purchase order with no payment taken. Enquiry-only products have no direct
purchase path, enforced independently by the route and by the API.

**Enquiry integrity.** The browser basket sends only `sku` and `quantity`. The
server re-resolves every SKU from the catalogue and rebuilds each line, so
nothing a user can edit in localStorage or in a request body affects what is
recorded or quoted.

---

## Security

Implemented, and covered by the tests in `tests/security.test.ts` plus the
browser suites:

- **Authorisation** is server-side on every protected route. `/admin` and
  `/account` are guarded in their layouts, and each server action re-checks the
  role independently. Hiding a control is never the access control.
- **Ownership** is part of the query, not a check afterwards: account reads are
  scoped by `userId` in the `WHERE` clause, so an altered reference in a URL
  matches nothing and 404s. Draft quotations are excluded from customer views
  entirely — an unsent draft is internal working material.
- **Pricing is never accepted from a client.** The enquiry basket and the direct
  purchase endpoint both send a SKU and a quantity only; unit price, discount,
  GST and status are resolved server-side. A request carrying a price is priced
  correctly regardless.
- **One order per quotation is enforced by a unique index**, not by an
  application check, so two concurrent acceptances cannot both succeed.
- **Inbound messages are stored before any mail is attempted**, and staff read
  them at `/admin/support`. Notification email is best-effort; nothing a
  customer sends depends on SMTP being configured.
- **Sessions** are opaque random tokens; only an HMAC is stored, so a database
  disclosure cannot be replayed. Cookies are HttpOnly, Secure in production and
  SameSite=Lax. Sessions are revoked on sign-out, password reset and role change.
- **CSRF**: same-origin check plus a double-submit token on every JSON endpoint;
  Server Actions carry Next.js's own Origin/Host verification.
- **Rate limiting** on sign-in (per IP *and* per account), registration,
  password reset, enquiry, contact and search, plus account lockout.
- **Enumeration resistance**: sign-in, registration and password reset return
  identical responses whether or not an account exists, with timing equalised.
- **Input validation** through Zod with unknown keys stripped, so a client
  cannot smuggle a role, price or status into any write.
- **Headers**: nonce-based CSP with `strict-dynamic`, HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and COOP.
- **Errors** return a generic message plus a correlation id; diagnostics stay in
  the server log, which redacts credential-shaped fields automatically.
- **No secrets reach the browser.** The one `NEXT_PUBLIC_*` variable is the
  analytics measurement ID, which is a public identifier printed in the page
  source by design; nothing else is exposed, and the build output is checked for
  credential strings.

### Known limitations

- **Rate limiting is per process.** `src/lib/auth/rate-limit.ts` holds counters
  in memory. Running more than one instance requires backing `hit()` with a
  shared store (Redis `INCR` + `EXPIRE`); the call signature is designed so only
  that file changes.
- **`X-Forwarded-For` must come from a trusted edge.** If the app is exposed
  directly, a client can spoof the header and dilute IP-based limits. The
  per-account sign-in limit, CSRF check and honeypots are unaffected.
- **No payment processing.** The platform is enquiry- and quotation-led by
  design; orders are recorded but no card data is handled anywhere.
- **Content search is trigram-indexed on the two tables that grow.** `Product`
  and `Faq` carry `pg_trgm` GIN indexes, so `LIKE '%term%'` uses an index rather
  than scanning; measurements are in the
  `20260821070000_search_trigram_index` migration. Brands, services and
  articles are bounded by the business and still scan, deliberately — an index
  the planner declines to use costs writes and buys nothing.
- **Typed block forms cover eight of the sixteen block types.** Those eight
  carry almost every stored block; the rest are edited through the
  schema-validated JSON editor, which stays available on every block. A unit
  test asserts that every key in a form-backed schema has a form field, because
  `saveBlockForm` rebuilds the payload from the declared fields alone — a key
  without a field would be silently dropped on the next save.

---

## Environment variables

All server-side. See `.env.example` for the full annotated list.

**Required**

| Variable       | Notes                                                        |
| -------------- | ------------------------------------------------------------ |
| `DATABASE_URL` | PostgreSQL connection string                                  |
| `APP_URL`      | Canonical absolute origin — canonical URLs, sitemap, redirects |
| `AUTH_SECRET`  | 32+ bytes; required in production. `openssl rand -base64 48`  |

**Email** (optional — messages are logged when absent, and nothing fails
silently): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD`, `MAIL_FROM`, `SALES_NOTIFICATION_EMAIL`.

**Business identity** (review before launch): `COMPANY_LEGAL_NAME`,
`COMPANY_TRADING_NAME`, `COMPANY_TAGLINE`, `COMPANY_EMAIL_SALES`,
`COMPANY_EMAIL_SUPPORT`, `COMPANY_EMAIL_ENTERPRISE`, `COMPANY_PHONE_SALES`,
`COMPANY_PHONE_SUPPORT`, `COMPANY_ADDRESS_LINE1`, `COMPANY_ADDRESS_LINE2`,
`COMPANY_CITY`, `COMPANY_STATE`, `COMPANY_POSTCODE`, `COMPANY_COUNTRY`,
`COMPANY_GSTIN`, `COMPANY_CIN`, `COMPANY_SUPPORT_HOURS`.

**Scheduled work** (optional; each route refuses everything when its token is
unset, rather than defaulting to open): `CRM_DELIVER_TOKEN` for
`/api/crm/deliver`, `QUOTE_FOLLOWUP_TOKEN` for `/api/quotes/follow-ups`. Both
are called by cron — see `deploy/README.md`, sections 10 and 11. Without the
follow-up one, quotations are never chased and never expire on their own.

**Analytics** (optional): `NEXT_PUBLIC_GA_MEASUREMENT_ID`, a comma-separated
list of GA4 measurement IDs, defaulting to the two the business uses. Empty
switches analytics off. It is public by nature — it is served in the page — and
it is the only `NEXT_PUBLIC_` value this application has. The tag loads on
public pages only; see `src/lib/analytics.ts` for why the signed-in paths are
excluded.

**Tag Manager** (optional): `NEXT_PUBLIC_GTM_CONTAINER_ID`, one container id,
defaulting to the one the business uses. Empty switches the container off
without touching GA4 — the two are deliberately independent, so a broken
container version cannot take the measurement down with it. Both load from the
same host and share one `dataLayer`, so the consent defaults govern the
container's tags exactly as they govern GA4's. Google's `<noscript>` frame is
not rendered: Consent Mode is JavaScript, and a visitor who cannot run it
cannot be asked. Anything published into the container is subject to the cookie
policy like anything else on the site — a tag that sets a cookie the policy
does not name makes the policy untrue, and the policy is the thing that has to
change first.

**Grievance officer** (legally required before launch):
`COMPANY_GRIEVANCE_OFFICER_NAME`, `COMPANY_GRIEVANCE_OFFICER_EMAIL`,
`COMPANY_GRIEVANCE_OFFICER_PHONE`. The Consumer Protection (E-Commerce) Rules
2020 require an online seller to publish a named officer with contact details,
acknowledge a complaint within 48 hours and resolve it within one month. The
legal pages state those commitments; these variables are who they name. Until
they are set, the grievance panel says so rather than naming nobody.

---

## Running it

The quickest way to see the whole thing working — database, seed content,
admin panel — is the compose file:

```bash
cp .env.example .env          # then set AUTH_SECRET
docker compose up --build     # first run takes a few minutes
```

Then open <http://localhost:3000>, and the admin panel at
<http://localhost:3000/admin> with the seeded credentials
(`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, defaulting to
`admin@example.test` / `ChangeMe!Admin123`).

The container applies migrations on every start and seeds only when the
database has no pages, so restarting never overwrites content edited in the
admin panel. `docker compose down -v` discards the volume and the next start
seeds from scratch.

Without Docker, the same thing takes a local PostgreSQL 16 and Node 22:

```bash
npm ci
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET
npm run db:deploy
npm run db:seed
npm run dev
```

---

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set `APP_URL` to the public HTTPS origin and generate a fresh `AUTH_SECRET`.
   Do not reuse a development secret — rotating it invalidates all sessions and
   outstanding password-reset links, which is the intended behaviour.
3. Fill in the business identity and SMTP variables.
4. Apply migrations and build:

   ```bash
   npm ci
   npm run db:deploy
   npm run build
   npm run start
   ```

5. Terminate TLS in front of the app. `Secure` cookies and HSTS are enabled
   whenever `NODE_ENV=production`, so the site must be served over HTTPS.
6. If the app sits behind a proxy or CDN, ensure `X-Forwarded-For` is set by
   that edge and not passed through from clients.
7. Seeding is optional in production and refuses to run unless
   `SEED_ALLOW_PRODUCTION=true` is set explicitly.

### Before the site is public

Everything below is a genuine blocker rather than a nicety.

| | |
| --- | --- |
| **Change the seeded administrator password.** | The seed creates the first admin from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. The defaults are published in this repository. Set both to real values before the first seed, or sign in and change the password immediately after. |
| **Generate a fresh `AUTH_SECRET`.** | `openssl rand -base64 48`. Never reuse a development value; it derives the keys that sign sessions and password-reset tokens. |
| **Set `APP_URL` to the real HTTPS origin.** | Canonical URLs, the sitemap, Open Graph tags and the cookie/redirect safety checks all read it. |
| **Appoint a grievance officer.** | `COMPANY_GRIEVANCE_OFFICER_NAME` and `_EMAIL`. Publishing a named officer is required of an online seller in India. |
| **Have the legal pages reviewed.** | `docs/legal-review-checklist.md` lists the clauses that are commercial decisions rather than legal requirements. All five are editable in the admin panel. |
| **Configure SMTP.** | Without it, quotations and order confirmations are written to the log instead of being delivered. |
| **Confirm the database has `pg_trgm`.** | The search migration creates the extension; a managed provider may require enabling it first. |

### Publishing it

**[`deploy/README.md`](deploy/README.md) is the runbook** — a single virtual
machine, automatic HTTPS, and a cutover that puts the site on a subdomain first
so it can be checked against a real certificate before any customer-facing DNS
changes. It also covers backups, updates, and keeping an old site's URLs
working.

```
deploy/
  docker-compose.prod.yml   app + Postgres + Caddy, nothing exposed but 80/443
  Caddyfile                 TLS obtained and renewed automatically
  .env.prod.example         every value, with what happens if it is unset
  backup.sh                 nightly dump, fourteen kept, verified before rotating
```

The app needs a Node runtime and a PostgreSQL database — it is server-rendered
and database-backed, so it cannot be published as static files. A managed
platform (Vercel, Railway, Render, App Runner) with a managed Postgres works
too; check the region if data residency matters, since several default to the
United States while the privacy policy commits to transferring personal data
abroad only for provisioning.

Either way the release steps are the same: apply migrations, then start the new
version. `npm run db:deploy` is safe to run repeatedly and never drops data;
`prisma migrate reset` must never be pointed at a production database.

### Housekeeping

Two maintenance functions are safe to call from a scheduled job:

- `purgeExpiredSessions()` in `src/lib/auth/session.ts` deletes expired session
  rows.
- `expireStaleQuotes()` in `src/lib/quote-service.ts` marks quotations past
  their validity date as expired. Expiry is also checked at the moment a
  customer responds, so this is housekeeping rather than a correctness
  requirement.

---

## Content and trademarks

Catalogue copy, service descriptions and articles in this repository were
written for this application. Brand and product names are used descriptively to
identify the software being resold; no publisher marketing copy, imagery or logo
asset is reproduced, and brand identity is rendered as styled type rather than
trademarked artwork.

Catalogue prices in the seed data are **indicative sample values** for
development. Replace them with distributor pricing before going live — the UI
labels all pricing as indicative and subject to written quotation.
