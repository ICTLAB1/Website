# Enterprise Technology Marketplace

A B2B marketplace for enterprise software licensing, cloud and IT solutions —
catalogue, multi-vendor enquiry basket, quotation workflow, direct purchasing,
order fulfilment, customer account area and an administrative back office.

The full commercial chain is implemented end to end: an enquiry becomes a
quotation, a quotation becomes an order, and a fulfilled order issues licence
and renewal records into the customer's account.

> **Before going live**, populate the business identity variables in `.env`
> (company name, registration, addresses, contact details) and have the four
> legal pages reviewed by a qualified adviser. Until those values are set the
> site *omits* the corresponding details rather than displaying placeholder
> company information, and the admin dashboard lists exactly what is missing.

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
npm run db:seed          # 8 vendors, 49 products, 75 SKUs, 13 services, 8 articles

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

### Browser verification

`npm run verify` drives a real Chromium against a running production build:

```bash
npm run build && npm run start &
npm run verify
```

- `verify:responsive` — no horizontal page scroll, no console errors, across
  11 pages × 8 widths (375, 390, 414, 768, 1024, 1280, 1440, 1920)
- `verify:a11y` — zero axe-core violations (WCAG 2.1 A/AA + best practice)
  across 14 pages × 2 widths
- `verify:interactions` — mobile drawer, search autocomplete, basket, quote
  submission, catalogue filtering, keyboard navigation
- `verify:lifecycle` — enquiry → quotation → discount → issue → accept → order
  → fulfilment → licences and renewals, driven through two browser sessions

---

## Architecture

```
src/
  app/                     routes (App Router)
    [...slug]/             vendor + solution landing pages from a content registry
    admin/                 back office — guarded by requireStaff in the layout
    account/               customer area — guarded by requireUser in the layout
    api/                   JSON endpoints (auth, enquiries, contact, search)
  components/              UI kit, layout, catalogue, enquiry, admin
  content/landing/         typed marketing-page registry (40 pages, one route)
  lib/
    auth/                  sessions, CSRF, password hashing, rate limiting
    queries/               all database reads, grouped by surface
    validation.ts          every request schema
prisma/
  schema.prisma            relational schema
  seed-data/               catalogue, services and editorial seed content
scripts/verify/            browser verification suites
tests/                     Vitest unit tests
```

**Landing pages.** `/microsoft-365`, `/autocad`, `/solutions/manufacturing` and
37 others are one route (`app/[...slug]`) reading a typed registry, with
`generateStaticParams` and `dynamicParams = false`. Product data on those pages
is read live from the database by slug, so prices never drift from the
catalogue. Static routes always win over the catch-all, and an unregistered
path returns a genuine 404.

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
- **No secrets reach the browser.** Nothing is exposed via `NEXT_PUBLIC_*`, and
  the build output is checked for credential strings.

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
written for this application. Vendor and product names are used descriptively to
identify the software being resold; no vendor marketing copy, imagery or logo
asset is reproduced, and vendor identity is rendered as styled type rather than
trademarked artwork.

Catalogue prices in the seed data are **indicative sample values** for
development. Replace them with distributor pricing before going live — the UI
labels all pricing as indicative and subject to written quotation.
