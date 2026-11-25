# SEO TODO, November 2026

Things the brief asked for that need a fact or a decision from the business. Nothing here was invented.

1. **Zoho pricing post.** `/blog/zoho-pricing-in-india-how-it-works` is not in the repo seed. The migration upgrades it
   only if it exists on production. If it does not, write it from the `/products/zoho-workplace` price data.
2. **AutoCAD LT availability.** The variant is "on request", so its schema says `PreOrder`, not `InStock`. Change the
   variant's availability in the admin if it is in fact stocked.
3. **Product schema on hub pages.** `/microsoft-365`, `/cad-software`, `/bim-software` and `/price-list` carry the plain
   answer and question headings but no Product schema: they list many products, and one price would misstate them.
4. **Partner levels.** The plain answers say "authorised" only where `currentPartnerBadges()` confirms a level.
   Autodesk has none recorded, so those pages say "Autodesk reseller". Add confirmed levels in the admin to change that.
5. **Older blog bodies** still contain typed rupee amounts. They should become `{{price:slug}}` tokens so they cannot go stale.
6. **Unsold brand pages** now 404. If a brand becomes sold, add a product or a brand guide and it returns by itself.
7. **`/hardware?family=` pages** are self-canonical on purpose (they are real category views); everything else
   with a facet canonicalises to the clean URL.
8. Search Console: request indexing for the URLs listed in the hand-off, then watch "Crawled, not indexed" for the old facet URLs.
9. **Home page "popular" button** links to `/products?sort=popular` from CMS data (`prisma/seed-data/pages.ts`); the link block has no `rel` field, so it
   is still a followable link to a robots-blocked URL (the page canonicalises to `/products`). Point the button at `/products` in the admin.
