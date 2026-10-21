# Listings and citations

Off-page SEO is work on other people's websites. None of it can be done from
this repository, and most of it needs a credential nobody should paste into a
script. What *can* live here is the part that goes wrong when it is improvised:
the exact text to put in every listing, so that fifty directories describe one
business rather than fifty slightly different ones.

That consistency is the whole mechanism. Search engines match a business across
the web on name, address and telephone — the three together, character for
character. "Pvt Ltd" in one place and "Private Limited" in another is two
businesses to a parser, and the authority that should accumulate to one of them
is split between both.

## Before anything else: there is no Delhi telephone number

The site publishes no Indian phone number. Not in the structured data, not as a
`tel:` link, nowhere. The only number anywhere on the site is the Ajman
office's `+971 58 939 7239`.

Checked rather than assumed, against the rendered pages:

    Organization   telephone        (absent)
    Organization   contactPoint     sales — email only, no telephone
    LocalBusiness  telephone        (absent)
    /contact       tel: links       2, both +971 58 939 7239

This blocks the work below rather than inconveniencing it:

- **A Google Business Profile cannot be created without one.** It is the single
  largest local-search lever available and the verification step is a call or
  an SMS to the listed number.
- **A citation is name, address *and* phone.** Without a phone there is nothing
  to be consistent about, and listings built now would all have to be revisited.
- **The Delhi page already asks for it.** `/software-licensing-company-delhi`
  carries a call to action reading "Call the Delhi office", pointing at a
  contact page that offers a UAE number.

The fix is one line of configuration — `COMPANY_PHONE_SALES` in `deploy/.env`,
or the field on `/admin/settings` — and it reaches the structured data, the
contact page and the quotation letterhead at once, because they all read the
same value. Everything below assumes it is set.

## The canonical block

Copy from here. Do not retype, and do not improve it for a particular form; a
field that will not take this text should be left shorter rather than reworded.

    Legal name      TechZoid Technologies Private Limited
    Trading name    TechZoid
    Street          407, 4th Floor, Pearl Business Park
                    Netaji Subhash Place, Pitampura
    City            New Delhi
    State           Delhi
    Postcode        110034
    Country         India
    Phone           (not yet published — see above)
    Email           sales@techzoidtechnologies.com
    Website         https://techzoidtechnologies.com
    GSTIN           07AAICT5606J1Z4

Where a directory asks for a single-line address:

    407, 4th Floor, Pearl Business Park, Netaji Subhash Place, Pitampura,
    New Delhi, Delhi 110034, India

Where it asks for a short description (155 characters, fits most fields):

    Enterprise software licensing and IT procurement from Delhi — Microsoft,
    Adobe, Autodesk, Zoho and enterprise hardware, with GST invoicing.

Where it asks for a longer one:

    TechZoid Technologies Private Limited is a Delhi-based enterprise software
    licensing and IT procurement partner. We supply Microsoft, Adobe, Autodesk
    and Zoho licensing, AWS cloud services and enterprise hardware from HP, HPE
    and Dell to businesses across the National Capital Region and India. ISO
    9001:2015, ISO 27001:2022 and ISO/IEC 20000-1:2018 certified. GST invoicing,
    purchase orders and tender documentation supported.

Every claim in those paragraphs is already published on the site. Nothing here
may be added to without adding it there first — a directory is not the place a
new claim about this company gets made.

### The Ajman office is a separate listing

It is a branch, not a second address on the Delhi listing. Listing two addresses
against one profile is how a profile gets suspended. It has its own details:

    Office C1-1F-SF2571, Ajman Free Zone C1 Building, Ajman Free Zone, Ajman
    Business Licence 42287 · TRN 105122230300001 · +971 58 939 7239

## What is already done

- **`sameAs` is populated** with three profiles — LinkedIn, Facebook and
  Instagram — and reaches both the `Organization` and `LocalBusiness` blocks.
  This is the property that tells Google a profile elsewhere and this domain are
  one business, which is what makes a mention elsewhere count here at all.
- **A disavow file exists** at `seo/disavow.txt`, covering 967 domains from the
  paid-link campaign pointed at this site. See `README.md` beside it; it still
  needs uploading.

## Where to list, in order

The order is by what each returns, not by how easy it is.

1. **Google Business Profile** — business.google.com. Needs the phone. Verify
   at the Pitampura address. Primary category *Software company*; secondary
   *Computer store* and *Computer consultant*. This is the one listing that
   appears in a map pack and the only one that can rank for "near me".
2. **Partner locators.** The highest-authority links available, and earned
   rather than bought — these are vendors' own sites linking to a partner they
   have verified. The designations already published on the site are:
   Microsoft *Solutions Partner*, Adobe *Certified Reseller*, Zoho, HP, Cisco
   and Acer *Partner*. Each has a partner portal where the public directory
   entry is edited; each needs that portal's login.
3. **GeM seller profile** — the site already carries a GeM mark, so the
   registration exists. The public seller page is a citation and a procurement
   channel at once.
4. **IndiaMART, Justdial, Sulekha, TradeIndia.** Indian B2B directories. Treat
   them as citations first and lead sources second; the lead quality is mixed,
   the NAP consistency is not optional.
5. **Bing Places** — bingplaces.com, and it will import the Google listing once
   that exists, which is the only reason to do it in this order.
6. **LinkedIn company page** — already exists. Check that the website URL, the
   address and the legal name match the block above exactly; a page created
   years ago rarely does.
7. **Udyam and Startup India.** Both registrations are held and shown on the
   site. Their public directory entries are low-traffic and high-trust.

After each one, paste the resulting public URL into **Settings → profile URLs**.
That is what feeds `sameAs`, and it is the step that turns a listing from a page
that exists into a page search engines associate with this domain. There is a
check on it: `npm run verify:settings` asserts a configured profile URL reaches
`sameAs` and that a malformed one is refused.

## Two things not to do

**Do not buy links.** This site is already the target of a paid-link campaign —
967 domains, all carrying the same anchor text, appearing at eighty to ninety a
day. Whoever is responsible, the file in this directory exists to discount them.
Adding bought links to that is indistinguishable from the attack.

**Do not write a listing the site does not support.** Every directory asks for
services, certifications and credentials, and the temptation is to tick the box
that fits. A claim in a listing that is not on the site is a claim nobody will
remember making and that a customer will eventually quote back.
