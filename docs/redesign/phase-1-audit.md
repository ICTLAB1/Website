# Redesign, Phase 1: audit of the live site (22 Nov 2026)

Read-only. Nothing was changed on the live site. Sources: the repository, the live
`sitemap.xml`, `robots.txt` and homepage HTML, and Search Console (via OpenRush),
last three months to 21 Nov 2026.

## Platform (already chosen, not changing)
- Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Prisma 6 on Postgres.
- Pages are database-backed CMS rows (blocks), edited in `/admin`; content changes
  ship as idempotent content migrations. Navigation is database-driven.
- Hosting: one Azure VM, Docker, Caddy. Deploy is a manual GitHub Actions run to
  production. **There is no staging environment.**
- Motion today: CSS plus two small components (`reveal`, `count-up`). No GSAP or
  Motion library.

## URL inventory (live sitemap: 276 URLs)
products 135 · blog 36 · industries 17 · services 14 · solutions 10 · brands 10 ·
Microsoft/Zoho/Revit/etc. hub pages ~35 · city pages 3 · policy/support ~10 · home.
Also live and indexable outside the sitemap list above: `/careers`, the five
enquiry landing pages, `/managed-it-services` (new, not yet deployed).

## Homepage today
- Title `TechZoid | Enterprise Software Licensing & IT Solutions`; description,
  canonical `https://techzoidtechnologies.com`, Open Graph all present.
- H1 `Trusted IT Hardware & Software Solutions Partner`. 16 H2s, including: one
  procurement partner for your technology stack, registered GeM seller,
  certifications & registrations, organisations supplied, licensing and
  procurement guidance, ready to consolidate your technology procurement.
- Structured data: `Organization`, `WebSite` (plus `BreadcrumbList` on inner pages).
- 81 images, none without alt, 30 lazy-loaded. GTM `GTM-THHL334G`, GA4
  `G-P0H1WJDZ7Y`, Google Ads tag, consent banner.
- **Verified statistics, as published today:** Products listed 134 · Licensable SKUs
  283 · Technology brands 64 · Purchase order: One. These match the brief.

**Finding: most of the requested homepage sections already exist** (stats, logo
marquee, GeM seller, certifications, industries, guidance, final CTA). The work is
mostly visual: photography, typography, motion, mega-menu imagery.

## Functionality that must not break
Product search and catalogue filters, product pages, enquiry basket and
`/enquiry`, quotation requirement forms (`/requirement`, upload), contact form,
five landing-page enquiry forms, `/thank-you`, support and tickets, accounts,
orders and payments, admin, CRM delivery, chat assistant, live careers feed,
Meta Pixel and Conversions API, campaign banners.

## SEO baseline (Search Console, 24 Aug to 21 Nov)
- Site total: 662 clicks, 56,695 impressions, average position 15.3.
- **The homepage is the single most important page**: 268 clicks at position 5.0
  (apex) plus 72 at 5.3 (`www`). Changing it carries the most risk.
- Other top pages: `/products/microsoft-office-ltsc-professional-plus-2024`,
  `/careers` (position 3.5), the price-in-India blog posts, `/about` (3.3),
  `/industries` (2.7), `/contact` (4.1).
- Duplicate hosts: `www.` and apex both appear in Search Console.
- Old Wix `/post/...` URLs still draw impressions; they redirect already.
- `robots.txt` blocks filter and search URLs and admin/account/API paths.

## Risks
1. **Homepage H1 and copy** are ranking at position 5. Replacing the H1 with
   "Technology. Simplified. Business. Empowered." is a keyword change.
2. **No staging.** Production deploys are one click; "build and test in staging
   first" needs infrastructure (subdomain, certificate, separate database, noindex).
3. **Photography.** Twenty photographs of people, offices and sectors cannot be
   produced honestly from here without a decision on source (see below).
4. **Motion libraries.** GSAP/Motion would add script weight on the page that
   earns most of the traffic; CSS and the existing components cover most of the list.
5. **Scope.** Eight redesigned pages plus mega-menus is several PRs, not one.
6. **Placeholders found:** the careers photos are mockup crops, to be replaced.
7. The Meta deploy check ends red (Meta denies reading the dataset name); the token
   itself is in the container.

## Not yet measured
Core Web Vitals (LCP, INP, CLS) from field data; a full per-page title/H1/schema
crawl of all 276 URLs. Proposed for Phase 2 start, so they are the "before" numbers.
