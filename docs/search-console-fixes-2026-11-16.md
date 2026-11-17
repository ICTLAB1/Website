# Search Console brief — each claim checked, 16 November 2026

Every item in the brief was verified against the live site and the code before
anything was changed. Some were true, some were already done, two were not true
as stated, and one would have needed invented content.

| # | Claim | Finding | Action |
| --- | --- | --- | --- |
| 1a | 10 brand pages are `noindex` | **True, and deliberate.** Each has **no active products**; the page itself says "There is no published catalogue for Kaspersky yet". The rule (`app/brands/[slug]/page.tsx`) noindexes a brand with zero products and the sitemap omits the same brands. | **Not changed — see below.** |
| 1b | Only 9 brands in the sitemap | True, and consistent: exactly the 9 brands that have products. | None |
| 1c | Duplicate `robots` meta tag | **Not true.** Every page checked emits exactly one. | None |
| 2 | ~257,000 junk filter URLs | **True, and caused by this project.** The `Disallow` rules were removed on 22 Oct ("noindex does the job"); Google reports finding the URLs "since late October". `noindex` keeps a page out of the index but not out of the *crawl*, which is the cost. | Fixed: targeted `Disallow` + `rel="nofollow"` on the links that generate them |
| 3a | 83 server errors | **Cannot be diagnosed from here.** All 274 sitemap URLs return 200; malformed filter input (bad values, huge page numbers, SQL-ish strings) returns 200, never 5xx. The failing URLs are outside the sitemap. | Need the Search Console URL list |
| 3b | 80 × 404 | Same: need the URL list to add redirects. Unknown URLs correctly 404. | Need the URL list |
| 3c | 142 "page with redirect" | Sitemap and canonicals are clean: 274/274 canonical equals the listed URL, no redirects. `www`→apex, `http`→`https`, trailing slash all redirect correctly. One known 2-hop chain: `http://www.…` → `https://www.…` → apex. | Noted; harmless |
| 3d | 394 thin product pages | Product pages already carry Product + Offer/AggregateOffer + FAQPage + Breadcrumb + Organization JSON-LD. Description length not changed — see below. | None |
| 3e | `Host:` line in robots.txt | True. | Removed |
| 4a | Landing pages for three queries | **Already exist**: `/blog/autocad-subscription-price-in-india`, `/blog/windows-11-pro-upgrade-licence-price-in-india`, `/products/microsoft-office-ltsc-professional-plus-2024` + `/microsoft-office-ltsc`. A second page per query would compete with these. | None |
| 4b | Organization schema | Already has the address, `telephone`, and the three `sameAs` profiles. | None |

## What changed

**Crawl rules** (`src/lib/crawl-rules.ts`, `src/app/robots.ts`). Blocks:
- any `/products` or `/hardware` URL with two or more parameters;
- the sort / series / form / availability / licence / price / search parameters
  on their own.

Deliberately **not** blocked: `/products`, `/products?category=x`,
`/products?brand=x`, `/products?page=n`, and
**`/hardware?family=laptops|desktops|servers`** — those three are indexable
landing pages and a wider rule would have removed them from search. 27 tests pin
both sides.

**Links.** Facet filters, sort options, filter chips and the brand-by-category
cards on brand pages are now `rel="nofollow"`. Visitors use them as before.

**`Host:`** line removed.

**Verify script.** `scripts/verify/indexation.mjs` used to assert "no robots rule
may carry a query string" — the policy that caused the flood. It now asserts the
flood URLs are blocked *and* that the indexable ones are not.

## The brand pages — why they were not flipped to `index`

The brief says every brand "we sell" must be indexable, and that a brand with no
content should get "the main products" so it can be. Both depend on those brands
having products, and **they have none**. Giving them products here would mean
inventing a catalogue, availability and — for brands like Kaspersky, Lenovo and
VMware — an implied supply relationship, which this project has ruled out since
the start. Indexing pages that say "no published catalogue yet" is the thin-content
pattern the rule exists to avoid.

It reverses itself automatically: **the day a brand gets its first active
product, its page becomes indexable and enters the sitemap, with no code change.**
So the fix for these ten is a catalogue decision, not an SEO one: if the business
does supply Kaspersky, Acer, Lenovo etc., add real products at Admin → Products.

## Needed from Search Console to finish items 3a–3c

Export the URL lists from the 5xx, 404 and "page with redirect" reports.
