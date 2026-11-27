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
12. **Unindexed pages round (27 Nov): please verify these statements before they are relied on.**
   - Five articles (`/blog/microsoft-office-ltsc-2024-vs-microsoft-365`, `how-to-buy-genuine-microsoft-licences-in-india`,
     `how-government-departments-procure-genuine-software`, `windows-server-2025-licensing-explained`, `preparing-for-a-software-licence-audit`)
     now carry general statements that the owner should check against current public rules: Windows Server core minimums (8 per processor, 16 per
     server) and the two-virtual-machine allowance of Standard; GST at 18% on software; the Copyright Act, 1957 point on knowing use of an infringing
     copy; GST and company-law record-keeping periods (the text tells the reader to ask their accountant); and the general GeM / GFR description
     (thresholds are deliberately not stated).
   - 48 product pages gained "who it is for" and comparison text, built only from each record's own description and features. Items to confirm with
     the publishers' current documentation: whether Navisworks Simulate itself includes clash detection (the catalogue record says it does; the text
     tells the reader to confirm the edition), what Microsoft 365 E7 contains, and any Autodesk or Adobe product described only in general terms.
   - Hardware spec rows that held the field name ("Processor: processor") on 24 HP and HPE products were replaced with the values the builds carry.
   - **No technical figures were invented.** Where a record has no spec the page says specifications are confirmed on the quotation.
   - Brand pages without a catalogue (Cisco, Fortinet) now list every product by name so each model has a link from its brand hub.
13. **Titles.** Every title is now 60 characters or fewer: `fitTitle` in `src/lib/seo-copy.ts` keeps the opening keyword phrase and drops endings such as
   "| Quote & Guide", "Price in India" and long sub-titles, and keeps "| TechZoid" only if it fits. If a particular page needs a hand-written title,
   set it in that page's metadata; it will be kept if it already fits.
