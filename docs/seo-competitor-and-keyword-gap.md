# Who ranks, why, and what TechZoid can actually win

Measured on 7 November 2026 against Google India, via live SERP fetches and a
cross-engine search index. Every number below has a source named beside it.
Nothing here is estimated by hand.

Two things to read first, because they change what the rest of the document is
for.

**The site is not failing technically.** An external crawl of 20 sampled pages
returns an on-page score of 95.9 with zero high-severity issues. Canonical
host, robots, sitemap, breadcrumbs, Open Graph, `Product`/`Article`/`FAQPage`/
`BreadcrumbList`/`Organization` JSON-LD, GA4, GTM, Google Ads and Consent Mode
are all present and correct on the live site. The 81 images on the home page
all carry `alt`; the 30 that are empty are correctly marked `aria-hidden`.
There is no technical win sitting unclaimed that would move rankings.

**The site is failing commercially.** 37 organic keywords, an estimated 45
visits a month, one keyword in the top ten and none in the top three. The
whole of the organic traffic is worth about $29/month at this market's CPCs.

So the gap is not "fix the SEO". It is that the site answers a question Google
is not asking on the queries that matter, and that nobody links to it.

---

## 1. The finding that matters most

For every near-miss commercial keyword, TechZoid ranks with the **wrong page
type**, and loses to a competitor's **product page**.

| Keyword | Vol/mo | TechZoid | Its URL | Beaten by | At |
| --- | --- | --- | --- | --- | --- |
| autocad software price | 2,900 | **25** | `/blog/autocad-subscription-price-in-india` | `pisoftware.in/product/autocad-lt/` | **4** |
| autocad subscription | 2,900 | **16** | `/blog/autocad-subscription-price-in-india` | `wroffy.com/product/autocad-lt/` | **10** |
| autocad price | 1,600 | **19** | `/blog/autocad-subscription-price-in-india` | `wroffy.com/product/autocad-lt/` | **6** |
| autocad price in india | 1,300 | **19** | `/blog/autocad-subscription-price-in-india` | `pisoftware.in/product/autocad-lt/` | **2** |
| autocad software price in india | 1,300 | **23** | `/blog/autocad-subscription-price-in-india` | `wroffy.com/product/autocad/` | **4** |
| microsoft 365 business standard subscription | 1,300 | **30** | `/products/microsoft-365-business-standard` | `ssmnetworks.in/products/…` | **8** |
| microsoft 365 business basic price | 480 | **28** | `/blog/microsoft-365-business-basic-price-in-india` | `radiant.in/microsoft-365-business-b…` | **5** |
| fusion 360 price | 390 | **30** | `www…/product-page/autodesk-fusion-360-business-license` | `pisoftware.in/product/…` | 22 |
| autocad subscription plans | 320 | **27** | `www…/products/autocad` | `pisoftware.in/…` | 19 |
| revit software price | 320 | **29** | `www…/revit` | `pisoftware.in/product/autocad-revit-lt-suite/` | 18 |

Source: cross-engine search index, keyword-gap join, 7 Nov 2026.

Three separate causes are visible in that one table.

### 1a. Intent mismatch, and self-competition

On "autocad price in india" Google ranks commerce pages. TechZoid answers with
an article. The article does rank — position 19 on a 1,300/month term is real
work — but it is structurally the wrong page for the query, and it is
*competing with TechZoid's own product page* for it. `/products/autocad` and
`/blog/autocad-subscription-price-in-india` both target the same intent. The
weaker one is winning internally, and neither is winning externally.

This is not a reason to delete the article. It is a reason to decide, per
query, which URL is the answer, and to make the other one point at it.

### 1b. Equity is still mid-migration

Three of those ten ranking URLs are on `www.` — a host that now 301s to the
apex — and one of them is still a legacy Wix `/product-page/` path. The search
index also reports `www.techzoidtechnologies.com` as a *separate property*
holding 20 keywords and 13 of the site's estimated monthly visits, excluded
from the apex's 37.

The redirects themselves are correct. I verified eight externally-linked
legacy URLs and every one 301s to a sensible successor:

```
/product-page/microsoft-365-business-basic-annual-subscription  301 -> /products/microsoft-365-business-basic
/product-page/m365-business-premium-annual-license              301 -> /products/microsoft-365-business-premium
/post/why-your-business-needs-a-microsoft-office-365-license    301 -> /microsoft-365
… 8 of 8 resolve
```

So this needs no code change. It needs the consolidation to finish, which is a
matter of Google recrawling, and of not adding new internal links to `www.`

One exception is worth fixing: `/post/top-productivity-software-by-leading-tech-companies`
currently ranks **14** for "cloud productivity suite" (260/month) and is
answered **410 Gone** with no successor. `src/proxy.ts` blanket-410s the
`/post/` prefix, and its own comment anticipates this case — "the list above is
expected to grow a redirect where a replacement later appears". That URL has
no replacement yet, which is the actual gap.

### 1c. The competitors' page shape

`pisoftware.in` and `wroffy.com` both win with `/product/<sku>/` pages that
state a price in INR, say "GST invoice", and name the Indian market in the
title. TechZoid's product pages exist and are well built, but on the evidence
of the table above they are not the page Google has chosen to rank.

---

## 2. Who actually ranks

Live SERP, Google India, 7 November 2026.

### "microsoft 365 reseller india" — TechZoid is not in the top 20

| # | Domain | What ranks |
| --- | --- | --- |
| 1 | learn.microsoft.com | Microsoft's own "find a partner" page |
| 2 | shrevya.com | Home page, price-led: "plans starting at ₹111/user/month" |
| 3 | radiant.in | Product page, "Office 365 ProPlus" |
| 4 | shivcloud.in | Home page, "20–35% off" |
| 5 | microsoft.com | Microsoft's own |
| 6 | wroffy.com | "Microsoft Gold Partner in India" |
| 7 | techprofuse.com | "Authorized Microsoft 365 Partner & Reseller India" |
| 8, 10 | radiant.in | Two more product pages |
| 9 | dynamicgroup.in | "Trusted Gold Microsoft Partner" |
| 11–19 | skynetiks, elioplus, techbliss, growthwell, nexelt, cloudfirst, fes.cloud, bigeyeglobal | Mostly city-qualified reseller pages |

An AI Overview is present on this query.

### "adobe reseller india" — TechZoid is not in the top 20

| # | Domain | What ranks |
| --- | --- | --- |
| 1 | pisoftware.in | "#1 Adobe Reseller in India" |
| 2 | dolphincomputer.co.in | "Gold Adobe reseller" |
| 3 | crayon.com | Global (now SoftwareOne) |
| 4 | insight.com | Global |
| 5 | **scribd.com** | A PDF titled *"Verify Adobe Resellers in India"* |
| 6 | softwaresuggest.com | Directory listing |
| 7 | veyroninfotech.com | "Adobe Authorized Reseller in India" |
| 9, 10 | dwao.in | An explainer: *"Adobe Creative Cloud Reseller — Benefits & How to Choose"* |
| 17 | sunlitesystems.com | "Adobe Authorized Distributor, Dealer, Reseller" |

The AI Overview for this query is *about verifying authorisation*. It cites
Adobe's own partner directory and names LDS Infotech as an "Authorized Adobe
Platinum Reseller".

### "autodesk reseller india" — TechZoid is not in the top 10

| # | Domain | What ranks |
| --- | --- | --- |
| 1 | sniperindia.com | Home page |
| **2, 4, 5, 7** | **pisoftware.in** | **Four city pages: Nashik, Ahmedabad, Bengaluru, Indore** |
| 3 | softwaresuggest.com | "11 Best Autodesk Partners in 2026" |
| 6 | autodesk.com | Autodesk's own office locations |
| 9 | joinsarvo.org | Mumbai directory entry |

`pisoftware.in` holds **five of the ten positions** on a national head term,
using city-qualified landing pages. That is the single most replicable tactic
visible in this data.

### Architecture, backlinks and content, compared

| | TechZoid | wroffy.com | pisoftware.in | radiant.in | ssmnetworks.in |
| --- | --- | --- | --- | --- | --- |
| Winning page shape | blog articles | `/product/<sku>/` | `/product/<sku>/` + city pages | `/product/` + plan pages | `/products/<sku>` |
| Price on page | product pages only | yes, in INR | yes, in INR | yes, in INR | yes |
| City pages | one (`/software-licensing-company-delhi`) | — | **many, and they rank** | — | — |
| Indexed keywords | **37** | — | — | 25¹ | **79** |
| Est. organic/mo | **45** | — | — | 3¹ | **316** |
| Referring domains | **102** | — | — | — | — |
| Domain rank (0–1000) | **116** | — | — | — | — |

¹ From the overlap set only, so understated. Competitor authority figures were
not pulled individually — see *What is not measured* below.

`ssmnetworks.in` is the nearest comparable and earns roughly **seven times**
TechZoid's organic traffic from twice the keywords.

---

## 3. The strategic problem nobody has named

Every competitor above sells the same thing on the same claim: **"authorised"**.
Nine of the twenty Microsoft results and at least four Adobe results put
*Authorized*, *Certified*, *Gold* or *Platinum* in the title tag. On the Adobe
query, Google's own AI Overview is a guide to checking that claim, and a
third-party PDF explaining how to verify it ranks **fifth**.

That is the currency of this market. **TechZoid can make it, and the evidence
is already on file** — I checked after writing the first draft of this
document, which claimed the opposite.

`prisma/seed-data/partner-status.ts` records six designations confirmed by the
business on **23 August 2026**, two of them with the exact programme wording
because the business supplied the issued badge for each:

| Brand | Designation | Badge on file |
| --- | --- | --- |
| Microsoft | **Solutions Partner** | yes |
| Adobe | **Certified Reseller** | yes |
| HP, Cisco, Acer, Zoho | "Partner" (placeholder) | no |

The handling is stricter than most sites manage. `src/lib/brand-partner.ts`
will not print a designation unless it is on file, dated by a person, and
deliberately published; the badge is gated on the same check as the words, so
"a lapsed designation comes down in words and stays up as a picture" cannot
happen. And the claim **expires on its own after 400 days**
(`CONFIRMATION_VALID_DAYS`), rather than staying up until somebody notices.

The five credentials in `Organization` JSON-LD are held to the same standard.
`prisma/seed-data/certifications.ts` records each one transcribed from the
certificate itself — standard, certificate number, issuing body, scope, issue
and expiry dates, and a verification URL — on the stated reasoning that "a
number that does not match the certificate is worse than no number at all".

So there is no claim to retire here, and two things to do instead:

**Re-confirm before the designations lapse.** Confirmed 23 August 2026 plus
400 days puts the automatic expiry at roughly **late September 2027**. On that
date the Microsoft and Adobe badges disappear from the site by design. That is
correct behaviour and it needs a diary entry, not a code change.

**Supply the programme wording for the other four.** HP, Cisco, Acer and Zoho
sit at the placeholder "Partner", which the seed file calls "deliberately the
weakest claim that is still true". In a market where nine of the top twenty
Microsoft results put a specific tier in the title tag, a precise designation
is worth more than a generic one — and for these four it is a matter of
supplying wording that already exists, not of acquiring anything.

**This makes the head terms targetable.** My first draft advised leaving
"microsoft 365 reseller india" and "adobe reseller india" alone on the grounds
that the authorisation claim was unavailable. It is available and documented,
so the brand pages that those queries land on should carry the designation and
the badge — `/microsoft`, `/microsoft-365`, `/adobe` and
`/adobe-creative-cloud`. On the Adobe query in particular, where Google's own
AI Overview is a guide to verifying authorisation and a third-party PDF about
verification ranks fifth, a documented, verifiable designation is the whole
differentiator.

Even so, **do not chase the head terms first.** Positions 1–10 are held by
Microsoft, Adobe, Autodesk, global resellers with real authority, and
directories, and all three head terms carry an AI Overview that takes the
click. A domain rank of 116 with 102 referring domains does not displace them
this year. The designation is a reason to put the badge where the query lands,
not a reason to reorder the priorities below.

---

## 4. Where TechZoid can realistically compete

Ranked by evidence, not by volume.

### Priority 1 — Finish the ten keywords already on page 2 or 3

Nothing else on this list has a better ratio of effort to revenue. These are
terms where the site already ranks 16–30 against named competitors at 2–10, on
a combined **13,800 searches a month**, every one commercial or transactional.

The work per keyword is: decide which URL answers it, make that URL the one
with the price and the quote path, point the other one at it internally, and
stop the two competing.

Expected shape of the win: a move from 19 to 8 on "autocad price in india"
(1,300/mo) is worth roughly 30–60 visits a month on its own — more than the
entire site currently earns. No guarantee attaches to that; it is the
arithmetic of click-through by position, not a promise.

### Priority 2 — Delhi NCR service-area pages

`pisoftware.in` proves city pages win national reseller terms. TechZoid is at
Netaji Subhash Place, Pitampura, New Delhi, and serves Delhi NCR, so Delhi,
Noida and Gurgaon pages describe something real.

They must be written as **service-area** pages that state plainly where the
office is. The brief's own rule applies — no fake locations, no implied
offices. One honest Delhi page beats five that imply branches.

### Priority 3 — Government and GeM procurement

This is the gap nobody in the top 20 is filling, and it is the one place
TechZoid has a structural advantage rather than a copy advantage. "Government
software supplier India" and "GeM software seller" are in the target list, the
site already has `/industries/government-psu`, and government buyers search
for process ("how does a department buy genuine software") far more than for
"reseller".

No competitor in the measured set ranks a serious GeM or government
procurement explainer. Content here needs no authorisation claim to be
credible — it needs accuracy about the procurement process.

### Priority 4 — Licensing-decision articles

The blog is already the site's best asset: `/blog/autocad-subscription-price-in-india`
alone accounts for **24 of the site's 45 estimated monthly visits**. The
pattern works. Extend it where a real decision is being made — Business
Standard versus Business Premium, Office LTSC 2024 versus Microsoft 365,
AutoCAD subscription versus the alternatives — and link each article to the
product page that answers the transactional half.

### What to ignore

The raw keyword-gap join returned 60 terms. Most are head terms owned by the
vendors themselves — "adobe photoshop" (135,000/mo), "microsoft 365
subscription" (110,000/mo), "lightroom pro" (60,500/mo). A consultant who
hands those over as a target list is selling volume, not revenue. They are not
winnable from domain rank 116 and the traffic would not convert if they were.

The realistic subset of that join, after filtering for India-, price- or
licence-qualified commercial intent:

| Keyword | Vol/mo | CPC (USD) | Intent |
| --- | --- | --- | --- |
| microsoft 365 subscription plans | 8,100 | 1.06 | transactional |
| microsoft 365 price | 5,400 | 0.48 | commercial |
| adobe creative cloud price / cost | 4,400 | 0.09 | commercial |
| premiere pro price | 4,400 | 1.06 | commercial |
| microsoft 365 business basic | 3,600 | 1.02 | transactional |

---

## 5. Backlinks: one urgent thing

| Metric | Value |
| --- | --- |
| Domain rank | 116 / 1000 |
| Referring domains | 102 |
| Total backlinks | 138 |
| Dofollow ratio | 51.4% |
| **Spam score** | **28** |
| Broken backlinks | 18 |

The anchor-text distribution contains this, with **24 backlinks from 24
separate referring domains**:

> "High Quality Dofollow Backlinks DA 50 PA 40 Premium PBN Network Service
> techzoidtechnologies.com Rank First Page Google Fast SEO Link Building Buy
> Backlinks Online Cheap"

Plus four more from "Best Pinterest Tool SiteToSocial.com to Grow Your Website
Traffic Fully Automated".

**Roughly 28 of 102 referring domains — more than a quarter of the link
profile — are a private blog network footprint.** Whether somebody bought
links or a spam network scraped the domain, the effect is the same and it needs
a decision. Options, in order of preference:

1. Establish whether any link-building was ever bought for this domain. If it
   was, stop it.
2. Prepare a disavow file for the PBN footprint and the Pinterest-tool cluster,
   and submit it in Search Console.
3. Do not add to it. The brief already rules out paid links and PBNs; this is
   the reason that rule matters here specifically.

The 18 broken backlinks are worth reclaiming, and the legacy redirect map
already handles the ones I checked, so most of that 18 is likely counted
against URLs that now resolve.

Legitimate link targets, given what this business actually has: the GeM and
government procurement content above (genuinely citable), the licensing
explainers, Delhi NCR business directories and associations, and the ISO/DPIIT
registrations which carry their own directory listings.

---

## 6. What is not measured

Stated so this document is not read as more complete than it is.

- **Competitor authority** — `domain_rank` and referring domains were pulled
  for TechZoid only. The competitor column in §2 is from the keyword-overlap
  set, which understates any competitor whose keywords do not overlap.
- **Competitor on-page detail** — their architecture is inferred from SERP
  URLs and titles, not from crawling their sites.
- **Field Core Web Vitals** — no Search Console or CrUX access, so no real-user
  LCP/INP/CLS. Lab measurement is covered separately.
- **Actual Search Console data** — impressions, clicks and average position are
  Google's own numbers and beat every estimate here. Connecting the property
  would replace the §1 table's estimates with measurements.
- **Search volumes** are a third-party index's monthly averages for India, not
  Google Keyword Planner's, and the two routinely differ.
- **AI Overview presence** was captured for the three head terms only. It is
  present on all three, which is itself a reason the head terms are a poor
  first target: an AI Overview takes the click.

## Sources

- Live Google India SERPs, 7 Nov 2026, depth 10–20, three queries.
- Cross-engine search index: domain summary, top keywords, top pages,
  competitor overlap, keyword-gap join (60 gaps, 10 losing).
- Backlink index: authority summary and anchor distribution (29 anchors).
- External crawl of 20 sampled pages: on-page score 95.9, 0 high / 1 medium /
  2 low. The medium finding (duplicate title) is the apex counted with and
  without its trailing slash, and the `no_image_alt` low finding is a false
  positive — I checked all 81 home-page images directly.
- Direct HTTP checks of the live site: canonical host, robots.txt, 250-URL
  sitemap, eight legacy redirects, JSON-LD on four page types, analytics IDs.
