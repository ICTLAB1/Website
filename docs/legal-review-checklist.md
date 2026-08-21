# Legal documents: what to confirm with your adviser

The five legal documents — Terms of Sale, Privacy Policy, Refund Policy,
Delivery Policy and Cookie Policy — are drafted against Indian law as it applies
to a business-to-business reseller, and describe how this business actually
operates. **They are not legal advice.**

Each page used to open with a warning block saying exactly that, addressed to
whoever reviewed the site before launch. Those blocks were visible to every
customer, which made a finished site look unfinished, so they were removed. The
questions they raised are real, so they are recorded here instead — for the
company and its adviser, not for the public.

None of these is a defect. Each is a commercial decision that a lawyer should
confirm rather than a developer choose. Every one of them is editable in the
admin panel under **Pages**, without a deploy.

## Terms of Sale (`/terms`)

Two clauses are commercial decisions rather than legal requirements:

- **Payment** states 30 days from the date of invoice.
- **Limits on our liability** caps aggregate liability at the amount paid under
  the order giving rise to the claim.

## Privacy Policy (`/privacy`)

- The retention periods in *How long we keep it* follow the statutory minimums
  under the Companies Act, 2013 and the CGST Act, 2017.
- The Digital Personal Data Protection Act, 2023 is in force but its rules are
  still being notified. The document is drafted to meet it and should be
  revisited once those rules are final.

## Refund Policy (`/refund-policy`)

Two commercial defaults, both deliberately conservative:

- Refunds are processed **within 10 business days** of approval.
- Cancellation before provisioning is **free of charge**.

## Delivery Policy (`/delivery-policy`)

The timelines on the page are indicative. The authoritative timeline for any
given order is the one stated on its quotation — by design, because lead times
differ by publisher and by programme.

## Cookie Policy (`/cookie-policy`)

The document describes the site exactly as built: it sets a session cookie and a
CSRF token, and nothing else. **If analytics, a chat widget, an advertising
pixel or any other third-party script is added later, this page must be updated
and a consent mechanism added.** No consent mechanism exists today because
nothing on the site requires one.

## Dates shown on the page

Each legal page prints "Effective from" and "Last updated" beneath its heading.
Neither is typed into the content: they are read from the page record, so
`publishedAt` supplies the effective date and `updatedAt` moves on its own
whenever the document is edited. A stale date on a legal document is a real
problem, and this is the only way to be sure it cannot happen.
