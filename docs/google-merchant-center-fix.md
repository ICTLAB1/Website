# Google Merchant Center: "No global identifier provided"

Date: **24 August 2026**

## The issue as reported

> No global identifier provided (e.g. GTIN, brand) — 11 products

All eleven `link` values are legacy `/product-page/*` URLs from the previous
Wix site.

## Root cause

**This application does not generate a Merchant Center feed.** The only
generated files are `sitemap.xml` and `robots.txt`; there is no feed route, no
Content API client and no scheduled export anywhere in the codebase.

So the feed carrying those eleven items is not produced here. It is the previous
Wix store's feed, still connected to the Merchant Center account. That matters
because it decides where the fix has to happen:

- The error is about **fields missing from feed items** — `gtin`, `mpn` or
  `brand` — not about what the website serves at those URLs.
- The eleven URLs had already stopped serving product pages before this ticket
  was raised. Every one redirected; none appeared in `sitemap.xml`; none was
  linked from anywhere on the site.

**No change in this repository can clear this error.** It is cleared in
Merchant Center, by removing the feed that contains the items.

## What was nevertheless wrong here

Six of the eleven were falling through a catch-all redirect onto `/products`,
the catalogue listing. A redirect that lands on a listing page answers a
different question from the one the visitor asked; Google scores it as a soft
404 and passes nothing through it. It looked, from the outside, like a working
redirect.

That is fixed, along with the rest of the legacy shop. See
[`legacy-product-url-migration.md`](./legacy-product-url-migration.md) for every
URL and its measured status.

## Fix implemented

| | |
|---|---|
| Legacy URLs with a real answer here | **301** to that page, one hop |
| Legacy URLs without one | **410 Gone** |
| Unlisted URLs under a retired prefix | **410 Gone**, no catch-all |
| Redirect status | `301`, not the `308` Next emits for `permanent: true` — several feed and link-checking tools follow 301 and stop at 308 |
| `mpn` in Product structured data | Emitted where the catalogue holds a manufacturer part number (**4** of 36 hardware products) |
| `manufacturer` | Emitted for hardware, where brand and manufacturer are the same company |
| `image` | Emitted only for a real photograph, never for a category illustration |

Retired prefixes: `/product-page/` · `/service-page/` · `/blog/categories/` ·
`/post/` · `/shop-1`. Handled in `src/proxy.ts`; redirects in `next.config.ts`
run first, so a listed URL still redirects and only what no rule claims is Gone.

## No identifiers were invented

Per the brief, and because an invented one is worse than a missing one — Google
matches products across merchants on these values, so a wrong `mpn` attaches
this listing to somebody else's product.

- **GTIN** is assigned by GS1 to the manufacturer, never to a reseller. This
  business cannot legitimately supply one it has not been given.
- **Software licences have no GTIN at all.** Microsoft, Adobe and Autodesk
  subscriptions are not barcoded goods. `identifier_exists: false` is the
  correct declaration for them in a feed — never a fabricated value.
- **TechZoid's internal SKU is never published as a GTIN or MPN.** The `mpn`
  emitted is the manufacturer's own part number from their line card.

## What blocks a feed being built here

Merchant Center requires `image_link` on every item. **0 of 85 active products
carry a photograph** — the representative-illustration map is deliberately empty
pending artwork, so hardware pages currently show a labelled empty frame.

A feed generated from this catalogue today would therefore carry zero items.
Product photographs are the blocker, and they are the same blocker that stops
any product page earning a rich result.

Identifier coverage as it stands:

| | Count |
|---|---|
| Active products | 85 |
| With a photograph | **0** |
| With a manufacturer part number | **4** (all HP hardware) |
| Hardware products | 36 |

## Merchant feed changes

None, because there is no feed in this repository to change.

When one is built, it must:

- use the **canonical** product URL as `link` — the same URL the page's
  `<link rel="canonical">` and its Product JSON-LD `url` carry, never a
  `/product-page/*` URL and never a URL that redirects;
- set `identifier_exists: false` on every software licence;
- carry `mpn` only where a manufacturer part number is recorded, and `gtin`
  only where the manufacturer has supplied one;
- omit any product with no photograph rather than substitute a generic image —
  a single laptop picture across many models is against Merchant Center policy
  and misrepresents the goods.

## Validation procedure

1. `npm run build` — must exit 0.
2. `npm test` — unit tests.
3. `npm run verify:seo` — asserts, on the running application:
   - every legacy redirect is followed **hop by hop** and fails on more than one;
   - every retired URL answers **410**;
   - no redirect target is the generic catalogue listing;
   - every page has one canonical, one `h1`, a title and a description;
   - no `/product-page/*` URL is in `sitemap.xml`;
   - Product structured data declares a photograph only where one exists.
4. `npm run verify` — the full gate.
5. Regenerate `legacy-product-url-migration.md` and confirm
   `0 × 200 · 0 redirect chains`.

## What still has to happen in Merchant Center

1. **Products → Feeds.** Find the feed containing these eleven items. If its
   source is the Wix store or a stale upload, **delete or disconnect it**. That
   removes all eleven items and the error with them.
2. Decide whether a feed for the current catalogue is wanted at all. It cannot
   carry anything until products have photographs.
