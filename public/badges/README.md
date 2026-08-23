# Partner programme badges

Files here are served at `/badges/<name>`, and a brand points at one through its
`partnerBadgeUrl` — set in `prisma/seed-data/partner-status.ts`, or from the
admin panel under **Brands → (the brand) → Partner status**.

A badge is **evidence**, not decoration. It is the artwork a publisher issues to
a company that holds a specific designation in its partner programme, and it is
the thing a procurement officer looks at when deciding whether a claim about the
relationship is true.

## What is here

| File | Designation | Publisher |
|---|---|---|
| `microsoft-solutions-partner.png` | Solutions Partner | Microsoft |
| `adobe-certified-reseller.png` | Certified Reseller | Adobe |

Both were supplied by the business from the publishers' own partner programmes.
Each was trimmed of its transparent margin and scaled to 160 pixels tall — four
times the height it renders at — and nothing else was changed. No recolouring,
no cropping into the lockup, no removal of the publisher's mark from the badge.
Every one of these programmes prohibits exactly that, and an altered badge is no
longer the badge that was issued.

## The rule this directory exists to enforce

**A badge goes up only for a designation the business actually holds, and comes
down when it lapses.**

That is not a style preference. `Brand.partnerConfirmedAt` records when the
designation was last verified and `lib/brand-partner.ts` stops publishing it
after `CONFIRMATION_VALID_DAYS`, so a badge left here after a programme year
ends stops being displayed on its own rather than waiting for somebody to
notice. Adding a file here without setting `partnerConfirmedAt` does nothing,
which is the intended behaviour.

Do not add a badge for a brand this business supplies but holds no designation
with. Supplying a publisher's products and being accredited by that publisher
are different facts, and the site states them separately: brand logos appear
under "brands we supply", and only these badges appear under accreditations.

## Where they appear

- The brand page, beside the partner label.
- The quotation PDF, in the accreditations band — which is why they are PNG
  rather than SVG: PDF cannot hold an SVG, and the badge has to print.

## Adding another

1. Take the file from the publisher's partner portal or brand-assets programme.
   Not from a search engine, and not from another company's website.
2. Trim and scale it to 160 pixels tall.
3. Put it here, point the brand's `partnerBadgeUrl` at it, and set
   `partnerLabel` to the designation **exactly as the programme names it** —
   "Solutions Partner", not "Partner"; "Certified Reseller", not "Authorised".
4. Set `partnerConfirmedAt` to the date the designation was verified, and
   `partnerReference` to the membership or agreement number if there is one.
   That field is never published; it is there so the claim can be checked.
