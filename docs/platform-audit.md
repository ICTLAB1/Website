# Platform audit and expansion plan

Written before any code was changed for the platform expansion, so the work
extends what is here rather than replacing it.

## 1. What exists today

**Framework.** Next.js 16.3 App Router, React 19, TypeScript strict, Tailwind
v4, Prisma 6 on Postgres 16. Server components throughout; server actions for
writes; no client-side data store. 218 routes.

**Data model.** 34 models. The commercial spine already runs end to end:

```
Enquiry → Quote → Order → Payment → Licence → Renewal
```

with `Company`, `User`, `Session`, `AuditLog`, `SiteSettings`,
`PaymentSettings`, `MailSettings` around it, a CMS (`Page`, `PageSection`,
`NavigationItem`), and a catalogue (`Brand`, `Category`, `Product`,
`ProductVariant`, `ProductSpec`, `Price`).

**Catalogue.** Software and commercial hardware in one model, separated by
`licenceType = HARDWARE` and `formFactor`. Variants carry the configuration
(processor, memory, storage, graphics, warranty…). Prices are integer minor
units in three currencies. Search is trigram-indexed. Filters are faceted and
hide themselves when they can narrow nothing. No price is shown on any public
hardware surface, enforced by a verification suite.

**Enquiry basket.** A real basket with quantities, mixing software and
hardware, submitting to `Enquiry` with `EnquiryItem` snapshots.

**Customer area.** `/account` with enquiries, quotes, orders, licences,
renewals, support and company details.

**Admin.** Products, customers, enquiries, quotes, orders, support, users,
settings, pages, navigation, plus a descriptor-driven CRUD framework for
content records.

**Security.** Hashed opaque sessions, CSRF, rate limiting, account lockout,
email verification before transacting, audit log, secret encryption at rest,
server-side authorisation on every protected route, and an attack suite that
proves the boundaries.

**Integrations.** Razorpay (credentials from the admin panel, encrypted),
Microsoft 365 mail over Graph with OAuth, both behind provider abstractions
and both reporting "not connected" until credentials exist.

## 2. Gap analysis against the expansion brief

Sections that are **already met** by the above: 1–3 (positioning and
terminology, enforced by a crawl check), 4–5 and 9 (catalogue and filters,
software plus HP/Dell/HPE hardware), 8 (search), 11 (product detail), 13–14
(brand logos and landing pages), 17 (enquiry basket), 55 in part, 57 in part,
60 (payments), 77–79 in part, 80 (SEO, with a verification suite), 90–91
(mobile and performance), 95–98 (configuration, no public development
warnings, brand name, legal pages), 99 and 104 (no invented data), 100
(admin settings).

The table below is what is **missing or partial**, and it is the work plan.

| # | Brief | State | Module |
|---|---|---|---|
| 23–25 | Organisation profile, multiple addresses, customer roles, multiple users per customer | Partial — one `Company`, but every account query is scoped by **user**, so a colleague sees nothing | **1** |
| 76 | Nine internal roles | Missing — only CUSTOMER / SALES / ADMIN | **1** |
| 78 | Organisation-level data isolation | Partial — isolation is per user, not per organisation | **1** |
| 18 | RFQ identifiers and the full status set | Partial — `Enquiry` has 4 statuses, not 10 | 2 |
| 15–16 | Build my requirement, BOQ upload | Missing | 2 |
| 19–21 | Quotation fields, versioning, customer actions | Partial — quotes exist; no versions, no revision request, no PO upload | 2 |
| 56 | PDF generation | Missing — quotations are emailed as HTML | 2 |
| 22 | Customer dashboard | Partial — no devices, documents or notifications | 3 |
| 27 | Purchase order upload | Partial — `poNumber` only, no document | 3 |
| 28 | Delivery tracking | Missing | 3 |
| 34–35 | Devices, asset and warranty management | Missing | 3 |
| 36–38 | Support categories, ticket workflow, timeline, attachments | Partial — a ticket is a single message with no thread | 3 |
| 55, 79 | Document management and secure document access | Missing | 3 |
| 30–33 | Renewal reminder cadence, dashboard, calendar, automation | Partial — `Renewal` rows exist; no cadence, no calendar | 3 |
| 39–46 | CRM: leads, pipeline, tasks, timeline, account manager, scoring | Missing entirely | 4 |
| 47–48 | Margin and approval thresholds | Missing — quote items have no cost | 4 |
| 49 | Customer-specific pricing | Missing | 4 |
| 74 | Sales commission | Missing | 4 |
| 72–73 | Management dashboard and reporting | Partial — today's counts only | 4 |
| 50–52 | Procurement, supplier records, inventory | Missing | 5 |
| 6–7, 53 | Import architecture for manufacturer catalogues | Partial — JSON files applied by a content migration; no admin import, no validation report | 5 |
| 10 | Product comparison | Missing | 5 |
| 12 | Product images | **Blocked** — the catalogue is image-ready, but no photographs have been supplied and none may be invented | 5 |
| 59, 61–65 | WhatsApp, accounting, CRM, Microsoft, Google integrations | Missing — to be built as abstractions, marked "not connected" | 6 |
| 66 | Government and PSU procurement workflow | Partial — GeM is positioning only | 6 |
| 67–69 | BOQ extraction and AI advisors | Missing | 6 |
| 70–71 | Notification centres | Missing | 6 |
| 81–86 | Analytics, marketing automation, abandoned RFQ, quote expiry, feedback | Partial — quotes expire; the rest missing | 6 |
| 87–88 | Knowledge base, dynamic FAQ | Partial — blog and FAQ exist, not organised as a knowledge centre | 6 |
| 92–94 | API and webhook architecture | Partial — internal APIs only | 6 |

## 3. Module order

Modules follow the brief's own phasing, and each one ships complete: schema,
migration, server actions, screens, tests, verification, and no regression in
the existing gate.

1. **Organisation and roles.** Companies with addresses, contacts and their own
   users; customer roles; internal roles; every record scoped to its
   organisation. Everything after this depends on it.
2. **RFQ and quotation.** Requirement builder, BOQ upload, RFQ statuses, quote
   versioning, customer quote actions, PDFs.
3. **Customer portal.** Documents, devices, warranty, delivery tracking,
   ticket threads, renewal cadence and calendar.
4. **CRM.** Leads, pipeline, tasks, customer timeline, margin, approvals,
   reporting.
5. **Operations.** Import architecture, suppliers, procurement, comparison.
6. **Automation and integrations.** Notifications, webhooks, provider
   abstractions, analytics, knowledge base.

## 4. Standing constraints

- No invented data of any kind: customers, partner status, specifications,
  prices, availability, warranty, legal or contact details. Where a value is
  unknown it becomes configuration and is reported as a deployment
  requirement.
- No public hardware pricing.
- No internal cost, margin or commission on any customer-facing surface.
- No cross-organisation data access, enforced in the query layer rather than
  the interface.
- The existing website keeps working: every change runs the full gate
  (typecheck, lint, unit tests, build) and the verification suites.
