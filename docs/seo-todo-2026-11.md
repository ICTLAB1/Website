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
10. **GA4 generate_lead added.** In GA4 Admin > Events mark `generate_lead` as a key event, then in Google Ads > Goals > Conversions import it
   (or point the existing "Request quote" action at `generate_lead`). It fires once per accepted enquiry from the enquiry basket, the contact
   form (sales and enterprise topics only, as before), the landing and quick enquiry forms, the BOQ upload and the chat assistant's captured lead,
   with `form_name`, `page_path`, `value: 1`, `currency: INR`. `click_to_call` and `click_whatsapp` fire on tel: and WhatsApp link clicks.
   The site configures two GA4 properties (`G-P0H1WJDZ7Y` and `G-2CEL7BH689`), so the event reaches both; mark the key event in whichever one
   Google Ads is linked to. Not tracked on purpose: the careers screening form (a candidate, not a lead) and the support and general topics of the
   contact form.
11. **Solution pages added (27 Nov).** `/data-centre-solutions`, `/web-application-firewall`, `/email-security`, `/zero-trust-network-access`, `/data-loss-prevention`.
   Owner to confirm the items listed under "Round 4" in `docs/seo-content-2026-11b.md` (Microsoft plan contents, which models TechZoid quotes, and whether
   TechZoid installs and configures these products). The guides' "last updated" date (`GUIDES_UPDATED`) still reads 24 Nov and is shared by every guide.
   Not built from the gap report: AI services, cloud migration and cost optimisation, Device as a Service, AV, Apple (need business confirmation).
