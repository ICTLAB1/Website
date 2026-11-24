# SEO changes for Google India, 24 November 2026

What changed, what was left alone and why, and the one thing that needs a person
on the server.

## Titles and descriptions

- **Product pages** (`/products/*`): `<Name> Price in India – Buy Licence | TechZoid`,
  under 60 characters where the name allows (the ladder is in `src/lib/seo-copy.ts`:
  full pattern, then without "– Buy Licence", then the name abbreviated; a name
  that still cannot fit keeps the shorter pattern and runs long — 25 of 134 do).
  Hardware says `– Get Quote` instead of `– Buy Licence`, because it is not bought
  by licence. This replaces the hand-written `seoTitle` on the five products that
  had one.
- **Landing pages** (`/autocad`, `/adobe-acrobat`, `/adobe-photoshop`,
  `/adobe-illustrator`, `/adobe-creative-cloud`, `/adobe-premiere-pro`,
  `/fusion-360`, `/aec-collection`, `/autodesk-construction-cloud`,
  `/microsoft-365/business-*`, `/zoho*`): retitled by the content migration
  `2026-11-landing-titles-say-india`, each now saying "Price in India" or
  "Reseller in India". It applies only where the title is still the old one.
- **Brand catalogue pages** (`/brands/*`): `<Brand> Licences Price in India`,
  `… Hardware Price in India`, `… Licences & Hardware in India`.
- **Descriptions**: every indexable page's description now passes through
  `fitDescription` in `buildMetadata`, which brings it to 140–160 characters and
  makes it say India; commercial pages also say GST invoice and "Get a quote
  today". Policy, contact, careers and similar pages get the length and India but
  no sales call to action. Sentences added are statements the site already makes
  everywhere; nothing is claimed that a page did not.

## Home page

The H1 is "Microsoft, Adobe & Autodesk Licensing Partner in India". "Trusted IT
Hardware & Software Solutions Partner" and "Enterprise IT Solutions. Simplified."
stay visible beneath it as a subheading and a tagline.

## Structured data

Already present and unchanged: Organization (with phone, email, address, the UAE
office, LinkedIn/Facebook/Instagram `sameAs`), WebSite, BreadcrumbList from the
visible breadcrumb, FAQPage wherever there is an FAQ, Product on every product
page (offers only where a price is shown), Article on blog posts.

Added: **LocalBusiness on every page** (it was the contact page only), including
the UAE office as a `location`; Product `image` for software, where the page shows
the product's own mark; blog `author` is "TechZoid Technologies"; FAQPage `url`
now names the page it is on.

## Alt text

Every image now has alt text: the header and footer logo ("TechZoid Technologies
logo"), the ISO seals ("ISO 9001:2015 certified", "ISO/IEC 27001:2022 certified",
"ISO/IEC 20000-1:2018 certified"), brand marks ("<Brand> logo"), product marks
("<Product> logo"), partner badges ("<Brand> <designation> badge") and the hero
photographs (the plain-words descriptions in `src/lib/page-photos.ts`).

Brand marks say "<Brand> logo", not "<Brand> authorised partner logo": that
phrase would assert a partnership with every publisher in the catalogue, and
partner status is shown only through the gated badge system.

## AutoCAD

`/products/autocad` is **not** redirected: it has its own content (variants,
price, FAQ, Product markup, Buy now). The three pages are separated by purpose
instead — price article (`/blog/autocad-subscription-price-in-india`), buying
page (`/autocad`, "Buy AutoCAD Licence"), product page — and the first two now
link to each other.

## Blog price articles

`/blog/autocad-subscription-price-in-india`,
`/blog/windows-11-pro-upgrade-licence-price-in-india` and
`/blog/microsoft-365-business-basic-price-in-india` show "Last updated", carry
five FAQs each (with FAQPage markup) and link onward. The AutoCAD and Business
Basic articles also had prices for terms the catalogue no longer lists (monthly,
3-year, a ₹1,46,300 annual price); their price sections were brought to the
catalogue (AutoCAD ₹1,41,250 + GST ₹25,425 = ₹1,66,675; Business Basic ₹2,040 +
GST ≈ ₹2,407). Migration `2026-11-blog-price-faqs`.

## Redirects

- Eight old Wix URLs Google had still seen, with no redirect (answering 410), now
  go to the product that replaces them in one hop. The biggest, the CorelDRAW
  2021 page, had 3,822 impressions.
- `www` → apex is already a single 301 that keeps path and query.
- **Not done: old Wix URLs asked for on `www` still take two hops** (www → apex,
  then the legacy rule). Only the web server can fix that, because `www` never
  reaches the app. This needs a person to apply on the VM and reload Caddy. The
  snippet was written but could not be tested here (no Caddy binary was
  available), so it is **not** in `deploy/Caddyfile`:

  ```caddyfile
  # inside the {$SITE_ADDRESS} block, before the existing redir
  @legacy_on_redirect_host {
  	host {$SITE_REDIRECT_FROM}
  	not host {$SITE_DOMAIN}
  	path /product-page /product-page/* /ar/product-page/* /post/* /blog/tags/* /blog/categories/* /service-page/*
  }
  handle @legacy_on_redirect_host {
  	reverse_proxy app:3000 {
  		header_up Host {$SITE_DOMAIN}
  		header_up X-Real-IP {remote_host}
  		header_down Location ^(/.*)$ https://{$SITE_DOMAIN}$1
  	}
  }
  ```

  Wrap the existing `redir` and `reverse_proxy` in a following `handle { … }` so
  the two do not both run, run `caddy validate`, then `caddy reload`.

## Speed

Not converted to static generation. Every page renders the header, which reads
the session cookie, and the security policy carries a per-request nonce; neither
can be static. Measured locally, the server answers in 30–80 ms. From the build
sandbox even a static image takes about a second to first byte, so the
1.0–1.4 s versus 0.25 s difference reported cannot be reproduced from here.
Hero images are already `priority`; the logo belt is deliberately eager.

## Internal links

No page lacks an inbound link. Every product page links its brand and at least
two other products. `/microsoft-365`, `/adobe-licensing` and `/autodesk-licensing`
now end with an index of every product under them and the related articles
(`src/components/marketing/hub-index.tsx`), built from the catalogue as it stands.

## A bug found on the way

The product card showed "Buy now" for quote-only products, whose `/buy` page
answers 404. It now checks the product's purchase mode and that the variant is one
a customer may buy directly. All 75 "Buy now" links on the site were opened.

## Pages added after a review of a reference site (24 November 2026)

Migration `2026-11-adobe-apps-faq-and-guides`. The reference site's pages were
read for structure only; nothing was copied, and no price, response time,
certification or discount figure of theirs is claimed.

- **New:** `/adobe-indesign`, `/adobe-after-effects`, `/adobe-lightroom`,
  `/adobe-firefly`, `/adobe-express` (each from the catalogue's own description
  and what the site already says about Adobe Teams licences), and `/faq` (sixteen
  answers already written for other pages, looked up by question so they cannot
  drift). `/faq` is linked from the footer.
- **Updated:** `/adobe` gains "Buying Adobe in India" and an index of the app
  pages; `/managed-it-services` gains "Common ways to start" (service desk, plus
  endpoints, plus resilience and security), labelled as starting points rather
  than packages.
- **Deliberately not made:** priced Silver/Gold/Diamond tiers (no tiers, prices or
  response times have been set); pages for structured cabling, database
  administration and remote support (not offered as such, or already covered by
  `/services/it-helpdesk` and `/sql-server`); a second Microsoft 365 Business page
  (`/microsoft-365` and its plan pages already answer that search); pages for
  Audition, Animate, Stock and Frame.io (reached from `/adobe`).
