# Meta lead tracking (Pixel + Conversions API)

Dataset / Pixel ID `1143158141004040` (not secret; `NEXT_PUBLIC_META_PIXEL_ID` overrides, empty switches Meta off).

## What is reported

| Event | When | Browser | Server |
|---|---|---|---|
| `PageView` | every page, incl. client-side navigations | yes | no |
| `ViewContent` | product/solution pages (`isContentPath` in `src/lib/meta.ts`), `content_name` = page title | yes | no |
| `Contact` | click on `mailto:`, `tel:`, WhatsApp link | yes | yes |
| `Lead` | after a form is accepted (never on click) | yes | yes, with hashed email + phone |

`Lead` and `Contact` carry one `event_id` on both sides so Meta counts each once. A lead's id is `lead-<reference>`.

## Consent (stricter than Google)

Nothing loads, no cookie is set and nothing is sent until the visitor presses **Accept analytics**. Google's tag runs by default outside the EEA; Meta's does not, because the server has no region signal. Consequence: Meta sees only visitors who accepted. If you later want "on by default outside the EEA" it needs a country header from the edge. Refusing later tells a loaded pixel `consent revoke` and stops all further reports.

## Forms and the thank-you page

Requirement forms (landing pages, `/requirement`, upload) and the contact form go to `/thank-you` after success. The basket keeps its existing `/enquiry/submitted` page. All report `Lead` through `pushConversion` (`src/lib/analytics-events.ts`). `/thank-you` reads the reference from `sessionStorage`, never the URL, and reports the lead only if the form page had not (same id, so no duplicate). Contact-form messages count as leads only for the SALES and ENTERPRISE topics, like the Google conversion.

## Campaign on every enquiry

`utm_*` and `fbclid` are saved to `sessionStorage` on arrival and submitted as hidden fields (`AttributionFields`). They appear in the staff email and in the enquiry (`requirement` text) or ticket message.

## Server endpoint

`POST /api/meta/events` (same-origin + CSRF, 40 requests/hour/IP). A `Lead` must name a real enquiry or ticket created in the last hour; email and phone are read from that record, not from the request. Token: `META_CAPI_TOKEN`, sent as a `Bearer` header, never in a URL.

## Setup

1. On the VM, edit `deploy/.env` (the file next to `docker-compose.prod.yml`) and set `META_CAPI_TOKEN="<system user token>"`.
2. Redeploy (or `docker compose up -d`) so the container picks it up.

## Checking it (Events Manager)

1. Events Manager > dataset 1143158141004040 > **Test events**; copy the test code (e.g. `TEST12345`).
2. Optional but needed to see *server* events there: set `META_TEST_EVENT_CODE="TEST12345"` in `deploy/.env` and redeploy.
3. In the Test events tab, enter the site address, open it, press **Accept analytics**, submit a test enquiry.
4. `Lead` should show twice: **Browser** and **Server**, marked **Deduplicated**. Remove `META_TEST_EVENT_CODE` afterwards.

Local verification: `PORT=3101 node scripts/verify/meta-tracking.mjs` (server started with `APP_URL=http://test.localhost:3101` and a dummy `META_CAPI_TOKEN`).
