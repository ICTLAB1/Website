# Implementation plan

Companion to `website-audit.md`. That file records what is wrong; this one
records what to do about it and in what order.

Ordered by what it costs the business to leave undone, not by what is
interesting to build. Two things sit above everything else, and neither is a
code change: the site cannot be found locally without a telephone number, and
enquiries are arriving where nobody reads them.

## Now — blocked on one answer each

These are finished engineering waiting on a value. Each is minutes of work once
the answer exists, and each blocks something larger.

| | What | Blocked on |
| --- | --- | --- |
| B1 | Point internal notifications at a read mailbox | One admin field |
| B2 | Publish the Delhi telephone number | The number |
| B4 | Export terms for foreign-currency quotations | The wording, past counsel |

B2 is the gate for the whole of off-page SEO: no phone, no Google Business
Profile, no consistent citations, and `seo/listings.md` cannot begin.

## Next — repair before expansion

The brief is explicit that confirmed defects come before new catalogue, and it
is right: a bigger catalogue with the same defects is a bigger problem.

1. **Catalogue record audit.** Every product: name, SKU, duplicates, licence
   term, edition, GST treatment, availability. The brand-name defect (A1) was
   found by rendering a page rather than reading the data; the same method
   should be applied to the catalogue systematically. Expect findings and
   budget for them.
2. **Product-page template consistency** across all 93 routes, against the
   fifteen-point structure in the brief. Establish which fields are genuinely
   present before designing a template that assumes them.
3. **Navigation and conversion journey**, desktop and mobile, landing page to
   submitted enquiry. Record dead ends.
4. **Measure before optimising.** Lighthouse and Core Web Vitals on a
   production build, recorded with the environment. No performance work until
   there is a number to improve, and no number quoted that was not measured.
5. **Accessibility pass** beyond the existing `verify:a11y` suite, to WCAG 2.2
   AA.
6. **Dependency vulnerability review.**

## Then — design and structure

Deliberately after the repairs. The brief warns against redesigning the
homepage while leaving the problems underneath it, and the audit has already
shown problems underneath it.

7. Design tokens taken from the actual logo artwork; type scale; spacing scale.
8. Homepage information hierarchy against the seven buyer questions.
9. Page templates: product listing, product detail, brand, solution, industry,
   government and procurement.
10. Search, filters and the quote basket.
11. Catalogue and brand expansion, in batches, unverified records kept in draft.

## Working rules for this programme

Drawn from what has already gone wrong in this codebase, not from general
principle.

**Read production, do not reason about it.** Two defects in this audit (A2,
B1) were originally misdiagnosed from the source. Both were settled in minutes
by the read-only diagnostics workflows. Where a claim is about what the live
site does, read the live site.

**Render the page, do not read the component.** A1 was invisible in the source
— the component looked correct and the `aria-hidden` made it look deliberate.
It was obvious in the extracted text of the rendered page.

**A test that does not bite is not a test.** Every fix in this audit was
confirmed by reverting it and watching the test fail. A1's test fails two of
four cases when reverted.

**Content is data.** Copy lives in `Page` and `PageSection` rows. A copy change
ships as a content migration — idempotent, guarded, reporting what it did — not
as an edit to a `.tsx` file.

**Claims need a source.** No certification, partner status, customer count or
price goes on a page unless it is already on file. Where evidence is missing,
the claim is flagged, not invented or quietly dropped.

**Small and reversible.** Products are archived, never deleted. Withdrawn URLs
get a 301 to the nearest live equivalent rather than a 404.

## Out of scope until asked

The brief describes an AI product-discovery assistant, a customer portal with
renewal management, and payment and order management. None should start before
the repairs above are done, and the last needs the current fulfilment,
accounting and tax processes understood first.
