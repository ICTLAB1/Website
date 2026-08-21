# FoxPopz Sales

Centralised field-sales app: reps take orders at shops, mark them delivered, capture payment (cash/UPI/credit, full or partial), and every step generates a professional GST invoice they can send on WhatsApp — plus a full admin dashboard and reports for you.

Stack: React + Vite + Tailwind v4, Supabase (auth + Postgres + RLS), deployed on Netlify.

## Roles

Three tiers now:

- **Sales Person** (`rep`) — takes orders, marks delivery/payment on their own orders. Cannot delete any entry.
- **Manager** — sees and manages every order, shop, and payment company-wide (mark delivered, collect payment, adjust stock, reassign shops). Cannot delete a sale, and cannot add or edit team member logins.
- **Admin** — full authority, including deleting a sale and adding/managing team members. Deletion is admin-only now, full stop — not even the sales person who created the entry can delete it themselves.

Set a person's role from **Admin → Reps** (or when creating their login there).

## Roles

Three tiers now:

- **Sales Person** (`rep`) — takes orders, marks delivery/payment on their own orders. Cannot delete any entry, cannot edit order/delivery dates after the fact.
- **Manager** — sees and manages every order, shop, and payment company-wide (mark delivered, collect payment, adjust stock, reassign shops, add sales/payments on any shop). Can edit order/delivery dates to correct mistakes. Cannot delete a sale, and cannot add or edit team member logins.
- **Admin** — full authority, including deleting a sale and adding/managing team members.

Set a person's role from **Admin → Reps** (or when creating their login there).

## Editing dates

- **When taking an order or marking delivery**, there's now a date/time field — defaults to right now, but can be backdated (e.g. entering a paper order the next day). It can't be set in the future.
- **After the fact**, an admin or manager can click **"Edit dates"** on any order card (in Admin → Sales, a shop's page, or the Orders tab) to correct the order date or delivery date. Sales persons don't see this control.

## How the workflow works

1. **Take Order** — rep visits a shop, picks products, saves it. Status: *Order Received*. Nothing charged yet.
2. **Mark Delivered** — when the goods actually go out, the rep opens the order and confirms delivery. This is also where payment is captured: **Cash**, **Cash + Credit** (part now, rest on udhaar), **UPI**, **UPI + Credit**, or full **Credit**. This step generates the tax invoice PDF and can send it straight to the shopkeeper on WhatsApp.
3. **Collect balance** — for anything left on credit, either rep or admin can collect it later against that specific order, from the Orders list or the shop's page.

Every screen that lists orders — the rep's **Orders** tab, the shop detail page, and Admin → Sales — shows the same four-way status: **Order Received**, **Delivered**, **Payment Pending**, **Payment Received**, so nothing is ambiguous about what stage a sale is at.

## What's included

- **Rep app (mobile-first, bottom nav: Home / Orders / Take Order / Shops / Ledger):** order-taking, the Orders status tabs, shop management with GPS capture, khata (outstanding ledger).
- **Products:** MRP, selling price, and HSN/SAC code per product — all reflected on the invoice with GST split into CGST+SGST and an automatic "you saved ₹X" line.
- **Invoicing:** full-page tax invoice PDF styled after your official letterhead — logo mark, GSTIN/FSSAI/UDYAM badges, bill-to and bank-details boxes, itemized HSN table, CGST+SGST, amount in words, terms & conditions, and a scan-to-pay UPI QR for anything still due. Sequential invoice numbers, saved permanently, auto-downloaded. "Send on WhatsApp" opens a pre-filled chat — the rep taps the paperclip once to attach the just-downloaded PDF.
- **Delete a sale:** rep (their own) or admin (any) can delete a mistaken entry — reverses stock, removes the linked payment and invoice, atomically.
- **Discounts:** optional per-order discount (₹), applied before GST.
- **Admin app:** dashboard with **today's** orders-received/delivered/sales/pending stats plus all-time totals, sales-by-rep chart, all shops, product & stock management, all orders (with the same status tabs), all collections, and a **Reports** page — day-by-day sales/collections/order-counts with a date-range picker, 7/30/90-day presets, and Excel export.
- **Team management:** admins add new rep/admin logins directly from **Admin → Reps** — no Supabase dashboard needed for routine hiring (one-time setup required, see below).
- **Excel export:** Sales, Collections, Outstanding-by-shop, and the day-by-day Reports view.
- **Admins can log sales too:** an "Admin" link on rep screens and a "Log a sale" link on admin screens move between both.
- **Data model:** every sale is an `order`; every rupee received is a `payment`, always linked to the order it was collected against. Outstanding for any shopkeeper is always `SUM(orders) - SUM(payments)`, and an order's own payment status is `SUM(payments for that order) vs order total` — so nothing can silently drift out of sync.
- **Security:** Postgres Row Level Security — a rep only sees/edits their own shopkeepers, orders, and payments. Admins see everything, enforced in the database itself.

## 1. Create the Supabase project (5 min)

1. Go to [supabase.com](https://supabase.com) → New project.
2. **SQL Editor** → New query → paste `supabase/schema.sql` → Run.
3. New query → paste `supabase/invoicing.sql` → Run.
4. New query → paste `supabase/enhancements.sql` → Run.
5. New query → paste `supabase/order-lifecycle.sql` → Run. (Adds delivery-status tracking. Safe to re-run.)
6. New query → paste `supabase/manager-role.sql` → Run. (Adds the Manager role and restricts sale deletion to admins only — replaces the earlier rule that let a sales person delete their own entry. Safe to re-run.)
7. **Project Settings → API** → copy your **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.

```bash
npm install
npm run dev
```

## 3. Create your admin account

1. Supabase → **Authentication → Users → Add user** → your email + password (tick "Auto confirm user").
2. Sign in to the app — you'll land on the rep view by default.
3. Supabase **SQL Editor**, run:
   ```sql
   update profiles set role = 'admin' where id =
     (select id from auth.users where email = 'you@example.com');
   ```
4. Refresh — you're now in the admin view.

## 4. Add your sales reps

You can do this directly inside the app, but it needs a one-time setup because creating a login+password requires a privileged key that can't live in the browser.

### 4a. Deploy the "add team member" function (one-time)

1. `npm install -g supabase`
2. From the project folder: `supabase login`, then `supabase link --project-ref YOUR-PROJECT-REF`.
3. `supabase functions deploy admin-create-user`
4. Set its secret:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   Get the key from **Project Settings → API → service_role key**. Never put this in frontend code or GitHub.

### 4b. Add people

**Admin → Reps → Add team member** — name, email, phone, role. It shows a one-time temporary password to share (WhatsApp is fine).

## 5. Add your product catalog

**Admin → Products** — name, SKU, HSN/SAC, MRP, selling price, opening stock. Stock auto-decrements on delivery.

## 6. Set your invoice & payment details

Open `src/lib/businessConfig.js` — legal name, address, GSTIN, CIN, FSSAI, UDYAM, bank details, and `upiId` are all pre-filled from what you've shared. **Please double-check `upiId`** — your letterhead shows `linavsuperfoods@idfcfirst`, but you'd separately typed `linavsuperfoods@idfcbank`; I went with the letterhead, but confirm before going live since this is where customer payments land.

## 7. Deploy to Netlify

```bash
npm run build
```

Push to GitHub, then Netlify → **Add new site → Import from Git**, set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` under environment variables. `netlify.toml` already has the build settings.

## Notes on UPI confirmation

No app — not even the UPI apps themselves — can automatically tell a third-party website when a payment lands, without a payment gateway (Razorpay, Cashfree, etc.) in between, which needs a KYC'd merchant account. Until that's set up, confirmation is a single tap by the rep once they see the payment land — standard practice for small businesses today. The QR itself is fully automatic and pre-fills the exact amount.

## Notes on WhatsApp sending

`openWhatsAppChat()` opens a pre-filled `wa.me` chat — works with zero setup. WhatsApp's click-to-chat links can't auto-attach files (a WhatsApp platform limit, not this app's), so the invoice auto-downloads first and the rep taps the paperclip once. Fully automatic sending needs a WhatsApp Business Cloud API account and an approved message template — ask if you want that wired up later.

## Ideas for v2

- Automatic UPI payment confirmation via Razorpay/Cashfree (needs KYC + merchant account).
- Fully automatic WhatsApp sending via WhatsApp Business Cloud API.
- Photo proof of delivery / signature capture.
- Route planning / visit check-ins with GPS.
- Payment due reminders sent automatically to shopkeepers.
