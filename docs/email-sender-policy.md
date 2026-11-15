# Automated email: From and Reply-To

Policy, set 15 November 2026: **every automated email is sent from
`DoNotReply@techzoidtechnologies.com` with Reply-To
`sales@techzoidtechnologies.com`.**

Half of this is code and is done. The other half is a setting plus DNS, which
has to be done in the mail provider and the DNS zone — it cannot be hard-coded,
because a From address the provider has not verified does not deliver.

## Reply-To — done in code

`src/lib/mail.ts` now has one rule, `resolveReplyTo`, applied below every send
(`sendMail` and `sendMailVerbose`), across all three channels — SMTP, Microsoft
Graph and Azure Communication Services:

> a message keeps the Reply-To its sender set; a message that set none gets the
> sales inbox.

The sales inbox resolves to the published sales address, which is already
`sales@techzoidtechnologies.com`.

This also fixed a live defect. **Quotations and quote follow-ups were going to
customers with no Reply-To at all** — a customer replying to a quotation
reached the no-reply From address and was lost. They now reply to the sales
team. The follow-up email's own copy, which claimed "replying reaches them
directly", is corrected to say it reaches the sales team.

`tests/mail-reply-to.test.ts` locks both halves: no Reply-To → sales inbox; an
explicit Reply-To wins.

### The one deliberate exception

**Internal lead notifications are not touched.** When a contact form, enquiry,
requirement or order comes in, the system emails *your staff* an alert, and
that alert's Reply-To is the *customer's* address — so a colleague hitting
Reply reaches the lead, not the sales inbox they are reading the alert in.
Those set their Reply-To explicitly, so the rule leaves them alone. This is
correct, but say so if you want those routed to `sales@` too and I'll change
it.

## From — a setting, plus DNS

The From address is whatever the active mail provider is configured with, and
sending as `@techzoidtechnologies.com` requires that domain be verified in that
provider or the mail bounces or lands in spam. Both steps are yours to make —
I have no admin login, DNS access, or production database from here.

Find the active provider at **/admin/settings** (Mail), then:

**If Azure Communication Services (ACS):**
1. In the Azure portal, add `techzoidtechnologies.com` as a **custom domain**
   on the Communication Service and verify it — Azure gives you the TXT, SPF
   and DKIM records to add to the DNS zone.
2. Once verified, set the **sender address** to
   `DoNotReply@techzoidtechnologies.com`.
3. Put the same value in the From-address field at /admin/settings.

**If Microsoft Graph:**
- Graph sends as a real mailbox, so `DoNotReply@techzoidtechnologies.com` must
  exist as a mailbox (or a shared mailbox the app can send as) in the tenant,
  with the domain's SPF/DKIM already set for Microsoft 365. Set the Graph
  sender to it.

**If SMTP:**
- Set the From address at /admin/settings (or the `MAIL_FROM` env) to
  `DoNotReply@techzoidtechnologies.com`, and make sure the DNS zone has an
  **SPF** record authorising your SMTP relay and a **DKIM** key for it. Without
  those, mail from this address is spam-filtered.

A **From name** of `TechZoid Technologies` alongside the address renders as
`TechZoid Technologies <DoNotReply@techzoidtechnologies.com>`.

## DMARC — worth doing once From is on the domain

Once outbound mail is `@techzoidtechnologies.com` with SPF and DKIM aligned,
add a **DMARC** record (`_dmarc.techzoidtechnologies.com`). Start at
`p=none` with a reporting address to watch for a fortnight, then move to
`p=quarantine`. It is the record that stops anyone else sending as your domain,
and it is only safe to enforce once your own SPF/DKIM are confirmed passing.

## What to check after the setting is made

- Send yourself a test from /admin/settings → the From should read
  `DoNotReply@techzoidtechnologies.com`.
- Reply to it → the reply should address to `sales@techzoidtechnologies.com`.
- Trigger a quotation to a test address → same From, Reply-To the sales inbox.
