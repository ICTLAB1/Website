# Search Console: 5xx, 404 and redirect lists — 17 November 2026

## A. The 83 server errors

**82 filter URLs.** They return **200** today. The exact URL in the report was
fetched live three times (about 1.7 s each) and a dozen hostile variants were
tried earlier — repeated parameters, a price ceiling, contradictory filters,
invalid enum values, huge page numbers, SQL-looking strings. None errors: the
query layer drops values outside the licence-type and availability enums before
they reach Prisma, and unknown brands or series simply match nothing.

So the cause is not a crash that reproduces. The evidence points at the
deployments: the pages were crawled on **24–25 October**, and **seven deploys ran
on exactly those two days** (24 Oct 15:54, 16:03, 16:54, 20:32, 20:46, 20:57 UTC
and 25 Oct 19:27). Each recreates the container and Caddy answers 502 for the
gap. That is the likeliest explanation, but it is an inference — the server
logs for those hours would settle it and are not reachable from here. The crawl
itself was the flood the previous change blocked.

What was added regardless: a regression test built from the report's URL shape
(repeated parameters, `max=5000`, Autodesk × hardware series), so the parser can
never turn one into an exception.

**The 83rd**, `www…/blog/categories/microsoft`, now redirects (below).

## B. The 404s (78 URLs listed)

Today every one answers in **two hops** (`www` → main domain, then the app) and
ends in a 410 or 404; Search Console files a 410 under "Not found". Now:

| Pattern | Result |
| --- | --- |
| `/blog/tags/<x>`, `/blog/categories/<x>` | 301 → `/blog` |
| `/service-page/<x>` | 301 → `/services` |
| `/product-page` (bare) | 301 → `/products` |
| `/devopssolutions` | 301 → `/services/cloud` |
| `/roboticssolutions` | 301 → `/solutions` |
| `/trainingandprograms` | 301 → `/services` |
| `/book-online` | 301 → **`/contact`** |
| `/refund` | 301 → `/refund-policy` |
| `/_api/<x>` | **410 Gone**, and `Disallow: /_api/` in robots.txt |
| `/product-page/<slug>` (23) and the `/ar/` copy of each | see below |
| `/post/<slug>` (10 new) | see below |

**Products.** Each goes to the same product, its successor, the page that
contains it, or — where asked for — the publisher's hub. Examples: SQL Server
2022 → the same product; Windows Server 2022 → 2025; BIM 360 → Autodesk
Construction Cloud; Defender for Business → the Business Premium page, which
includes it; the AutoCAD toolset → AutoCAD. The full table is
`next.config.ts (`legacyRedirects`)`.

**Posts.** Redirected to the article or page that answers the same question
(Defender guide → the Business Premium security article; "authorised resellers"
→ the genuine-licences article), the blog index only for the one listicle
nothing answers.

**Deliberately different from the brief**

- **`/book-online` goes to `/contact`, not `/contact-us`.** `/contact-us` is not
  a page here (it redirects to `/contact`); sending it there would be a chain.
- **No catch-all.** An unmapped `/product-page/<x>` or `/post/<x>` stays **410**.
  Google reads a redirect to an unrelated page as a soft 404, which leaves the
  URL on the report anyway. All 78 reported URLs are covered explicitly, so the
  brief's list is fully handled.
- **Tracking parameters are kept, not stripped.** `?utm_source=…` passes through
  the redirect. Removing it would break campaign attribution for anyone arriving
  from a tagged link, and Google ignores the parameter either way.
- **Brand-hub fallbacks are the weakest case.** Five products (Project plans,
  Visual Studio Professional, Alias, Windows 10 Home) redirect to
  `/brands/microsoft` or `/brands/autodesk` because that was asked for. Google
  may report a few of these as "soft 404" instead of clearing them. If it does,
  removing the entry (it becomes 410) is the right response.

## C. Redirect hygiene

- **Chains.** `http://www.…` and any `www` path take two hops: Caddy's
  http→https, then www→main, and for old URLs a third at the app. Collapsing
  that means editing `deploy/Caddyfile`, which is bind-mounted and **not
  reloaded by a normal deploy** — a change would not take effect without a
  manual reload on the VM, and a syntax error takes the whole site down. Not
  done here. Two hops to a permanent destination is ordinary and Google follows
  it; the old-URL cases are now `www` → *one* app redirect → destination.
- **Internal links.** 191 distinct internal paths linked from the home page,
  contact, products, a brand, services, blog and about were each requested:
  **none redirects.** `sitemap.xml` was already clean (274/274 canonical equals
  the URL). The site's own contact page is `/contact`, and nothing links
  `/contact-us`. `dell-poweredge-r760-server` is a retired record and is not
  linked or in the sitemap.

## Tests

`tests/legacy-redirects.test.ts` runs all 78 reported URLs through the real
redirect table in Next's first-match order, then through the real proxy for the
rest; checks no destination is itself redirected (no chains), no duplicate
sources, the `/ar/` copies match, and that unmapped retired URLs stay 410.
