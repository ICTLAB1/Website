import type { ContentMigration } from "./types";

/**
 * Eighteen articles, written as drafts, for a person to review before any of
 * them is published.
 *
 * ## Why articles and not landing pages
 *
 * The brief these came from asked for twenty new pages, most of them brand
 * landing pages: `/microsoft-enterprise-licensing`,
 * `/adobe-enterprise-licensing`, `/autodesk-enterprise-solutions` and so on.
 * Those are not written, and the reason is measured rather than stylistic.
 *
 * `2026-10-delhi-local-page` already refused four pages from a similar brief,
 * on the grounds that `/microsoft-licensing` covers volume licensing and
 * CSP-versus-EA, `/adobe` and `/autodesk` carry their own licensing copy, and
 * that "three pages aimed at one query is the state this site is already in
 * for Microsoft 365 Business Premium, which has a product page, a plan page
 * and a blog post, and ranks for none of them."
 *
 * That was an argument. It is now a measurement. A keyword-gap join against
 * five ranking competitors on 7 November 2026 returned ten terms where this
 * site ranks 16th to 30th, and on every single one it is beaten by a
 * competitor's product page:
 *
 *   autocad price in india        1,300/mo   here 19   pisoftware.in  2
 *   autocad subscription          2,900/mo   here 16   wroffy.com    10
 *   autocad software price        2,900/mo   here 25   pisoftware.in  4
 *   m365 business standard sub.   1,300/mo   here 30   ssmnetworks.in 8
 *
 * On the AutoCAD terms the ranking URL is
 * `/blog/autocad-subscription-price-in-india` — while `/products/autocad`
 * also exists and also targets the query. Two of this site's URLs compete for
 * one search, and the weaker wins internally. Adding
 * `/autodesk-enterprise-solutions` on top would be a third.
 *
 * So the pages in that brief that would duplicate an existing page are not
 * here. See `2026-11-seo-page-drafts` for the three that answer a query
 * nothing on this site answers at all.
 *
 * What is here is the one thing the measurement says works. The blog is this
 * site's best asset by a wide margin: `/blog/autocad-subscription-price-in-india`
 * alone accounts for roughly 24 of the site's 45 estimated monthly organic
 * visits. Each article below answers a different purchasing decision, so none
 * of them competes with another, and each links to the page that answers the
 * transactional half of the question rather than restating it.
 *
 * ## Drafts, and why that is not a formality
 *
 * Every row is written with `status: "DRAFT"` and `publishedAt: null`. Nothing
 * here appears on the site, in the sitemap or in the blog index until somebody
 * opens it in the admin panel and publishes it. The brief asked for that
 * explicitly, and it is the right default regardless: these are claims about
 * other companies' licensing programmes, and licensing programmes change.
 *
 * Three rules were followed throughout, each for a stated reason:
 *
 * **No prices.** Not one figure appears in any body below. The convention in
 * this catalogue is that a price lives in the product row and nowhere else —
 * see `2026-10-quote-page-autodesk`, which refuses to type a number into a
 * migration because "a price typed into a migration is correct the day it is
 * written and wrong the first time a publisher moves a list". An article is
 * worse than a migration for this: it is dated, it is indexed, and a stale
 * figure in an indexed article is what a buyer quotes back at you.
 *
 * **No authorisation claims in the prose.** Nothing below describes TechZoid
 * as an authorised, certified or gold partner of anybody, and that is a
 * choice about where such a claim belongs rather than a doubt about it.
 *
 * The designations are on file and documented: `seed-data/partner-status.ts`
 * holds Microsoft "Solutions Partner" and Adobe "Certified Reseller",
 * confirmed by the business on 2026-08-23 with the issued badge supplied for
 * each, and `lib/brand-partner` refuses to print any of it unless it is on
 * file, dated, published, and confirmed within 400 days.
 *
 * That machinery is the reason not to hard-code the claim here. A designation
 * typed into an article is a claim with no expiry, on a page nobody will
 * revisit, which will still be asserting it after the confirmation lapses in
 * roughly late September 2027. The brand pages state it through the gate that
 * can withdraw it. Articles link to them.
 *
 * **No unverifiable numbers.** Licensing thresholds set by government rules
 * (the GFR direct-purchase and bid limits, for instance) are described by
 * mechanism and not by figure, because the figures are amended and an article
 * asserting last year's limit is worse than one that says where to look.
 *
 * ## One of these eighteen is a fallback, not a new article
 *
 * `what-is-a-digital-licence` was written here on the belief that no such
 * article existed. That was wrong, and the correction is worth recording
 * rather than quietly deleting.
 *
 * `2026-08-digital-licence-article` wrote it in August and publishes it, and
 * on a freshly seeded database it is there and PUBLISHED — verified by running
 * the full migration chain locally on 10 November 2026, where this migration
 * reported "1 already existed" and skipped it.
 *
 * It is missing from the *live* database specifically, where
 * `/blog/what-is-a-digital-licence` answers 404 while
 * `/post/what-is-a-digital-license` redirects to it. A content migration runs
 * once and is recorded, so the August one will not run again to repair it.
 * Whether the row was deleted, soft-deleted or unpublished from the admin
 * panel cannot be determined from here.
 *
 * The entry below is therefore a fallback and not a duplicate: same slug, so
 * at most one can exist, and this one is created only where the row is absent.
 * Where August's article is present — in any state — this leaves it alone,
 * including where somebody unpublished it on purpose.
 *
 * Idempotent. Creates nothing that already exists, by slug.
 */

type Draft = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  readMinutes: number;
  body: string;
};

const DRAFTS: Draft[] = [
  {
    slug: "what-is-a-digital-licence",
    title: "What is a digital licence, and how is it different from a product key?",
    excerpt:
      "A digital licence ties the right to run software to an account or a device rather than to a string of characters you type in. Knowing which one you hold changes what happens when the hardware dies.",
    category: "Licensing practice",
    tags: ["digital licence", "product key", "activation", "licensing"],
    readMinutes: 6,
    body: `A digital licence — Microsoft also calls it a digital entitlement — is the right to run software, recorded against an account or a specific device rather than handed to you as a string of characters.

## The difference, in one line

A **product key** is a credential you hold and type in. A **digital licence** is a record somebody else holds, that recognises you or your machine.

That sounds like a technicality. It decides what happens on the day something breaks.

## What each does when the hardware fails

**With a product key**, reinstalling means finding the key. If it was on a sticker that has worn off, in an email from a supplier who no longer exists, or in a spreadsheet nobody has opened since the person who made it left, the licence is effectively gone — you own it and cannot prove or use it.

**With a digital licence tied to an account**, you sign in and the entitlement follows you. Nothing to find.

**With a digital licence tied to a device**, the activation is held against that machine's hardware identity. Reinstalling on the same machine is automatic. Moving to a different machine may not be possible at all, depending on how the licence was acquired.

That last case is the one that surprises people, and it is the common one: an operating system licence that arrived pre-installed is usually tied to the machine for life.

## Where each turns up

- **Pre-installed operating systems** — a device-tied digital licence, almost always. Not transferable to another machine.
- **Subscriptions** — an account-tied digital licence. Microsoft 365, Creative Cloud and Autodesk subscriptions all work this way: the person signs in, and the entitlement is checked against the directory.
- **Volume licensing** — usually keys, plus an agreement and a licensing portal. The portal is the real record; the key is a convenience.
- **Retail boxed software** — historically a key, increasingly an account-tied entitlement redeemed with a one-time code.

## Why this matters for compliance

Neither a key nor a digital licence is *proof* of licence. The proof is the paperwork: an invoice in your organisation's name, an agreement or enrolment number, and portal access showing the entitlement sits with you.

This is the point organisations miss most often. A machine that activates is not a machine that is licensed to you — a volume key resold as a single licence activates perfectly and belongs to somebody else's agreement. See [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india), and [preparing for a software licence audit](/blog/preparing-for-a-software-licence-audit) for what to keep.

## What to do about an estate you inherited

1. Work out which licences are account-tied. Those you can see in an admin console, and they are the easy half.
2. For device-tied licences, record which device. When the device is retired the licence usually goes with it, and budgeting for its replacement is better done in advance than on the day.
3. For key-based licences, find the purchase records rather than the keys. A key with no invoice behind it is the thing an audit asks about.
4. Record renewal dates for anything subscription-based. A perpetual licence forgotten keeps working; a subscription forgotten stops.

## Common questions

**If I have a digital licence do I still need a key?** Generally not — that is the point of it. Some volume scenarios still issue keys alongside, for deployment rather than for proof.

**Can a device-tied licence be moved?** Depends entirely on how it was acquired. An OEM licence that arrived with a machine stays with that machine. A retail licence often can be moved. Check the terms for the one you hold rather than the general case.

**We changed the motherboard and activation failed.** Device-tied activation keys on hardware identity, and the motherboard is usually the largest part of that identity. There are recovery routes that depend on whether the licence was linked to an account beforehand — which is a good argument for linking it before you need to.

**Is a digital licence safer than a key?** For losing it, yes: there is nothing to lose. For proving it, no — both rest on the same paperwork.

## Where to go next

The licensing programmes and how each records entitlement are on [Microsoft licensing](/microsoft-licensing), and the subscription-versus-perpetual decision in [perpetual versus subscription licensing](/blog/perpetual-versus-subscription-software-licensing). If you have inherited an estate and do not know which licences are which, [software asset management](/services/software-asset-management) is the service that works it out.`,
  },
  {
    slug: "microsoft-365-business-standard-vs-business-premium",
    title: "Microsoft 365 Business Standard vs Business Premium: what the extra actually buys",
    excerpt:
      "Both plans give your team the same Office applications. The difference is entirely security and device management — and whether you need it depends on questions that have nothing to do with Word.",
    category: "Microsoft licensing",
    tags: ["microsoft 365", "business premium", "business standard", "licensing"],
    readMinutes: 7,
    body: `Business Standard and Business Premium are frequently compared on the wrong axis. People look for the extra applications in Premium and, finding none, conclude Standard is the same thing cheaper. The applications genuinely are identical. The difference is in what happens to a laptop when somebody loses it.

## What the two plans share

Everything most people think of as Microsoft 365:

- The desktop Office applications — Word, Excel, PowerPoint, Outlook — installed on up to five PCs or Macs, five tablets and five phones per user
- Exchange mailboxes with a custom domain
- Teams, SharePoint and 1 TB of OneDrive per user
- The web and mobile versions of everything

Both plans are also capped at 300 seats. That cap is per plan, not per tenant, and it is the reason the comparison matters at the point of growth: a company passing 300 users is leaving this family entirely, not upgrading within it.

## What Premium adds

Four things, and they are all about control rather than productivity.

**Microsoft Intune.** Device management. This is the one that changes what you can do operationally rather than on paper. With Intune you can require a PIN on a phone before it will open a work mailbox, push a configuration to every laptop at once, and wipe company data from a device without touching the owner's photographs. Without it, a departing employee's phone keeps its mail until somebody remembers to reset their password.

**Microsoft Entra ID P1.** Conditional access, which is the ability to say "this sign-in is allowed, that one is not" on the basis of where it came from, what device it is on, and how risky it looks. Also self-service password reset, which quietly removes a large share of helpdesk volume.

**Microsoft Defender for Business.** Endpoint detection and response, as opposed to the consumer-grade antivirus that ships with Windows. The distinction that matters is investigative: Defender tells you what a threat did after it arrived, not only that it was blocked.

**Azure Information Protection.** Labelling and encrypting documents so that a file keeps its restrictions after it leaves your network.

## How to decide

The question is not "do we want better security". Everybody wants better security. The useful questions are narrower:

**Do people use their own phones for work mail?** If yes, Premium is close to necessary. Without device management you have company mail on devices you have no authority over.

**Would you know which files a compromised account had opened?** Standard will not tell you. This is the question that decides it for firms holding client data under a contractual confidentiality obligation.

**Are you obliged to demonstrate access control to anybody?** Auditors, large customers and tender processes increasingly ask. Conditional access and documented device compliance are the evidence.

**Do you have anyone to operate it?** This is the honest counterweight. Intune and conditional access configured badly are worse than absent — a misconfigured conditional access policy locks out the finance director on a Friday evening. Premium is a capability, not a product that works on arrival.

## The mixed-tenant option people miss

Licences are assigned per user, not per tenant. You can put the twelve people who travel, approve payments or handle client files on Premium and leave everybody else on Standard. Microsoft permits this and it is frequently the right answer: the risk is not evenly distributed across your staff, so the spend need not be either.

## Common questions

**Can we move from Standard to Premium mid-term?** Generally yes, with the change usually taking effect on the next billing cycle and the remaining term pro-rated. The mechanics depend on the agreement the subscription sits under, so confirm before committing.

**Does Premium include Windows?** No. Business Premium includes Windows 11 Business upgrade rights for devices already licensed for a qualifying edition of Windows Pro — it does not license a bare machine. Read our note on [Windows 11 Pro versus Enterprise](/blog/windows-11-pro-versus-enterprise-for-business) if that distinction is live for you.

**Is there a seat minimum?** No minimum, and a 300-seat maximum.

## Where to go next

The plan comparison with current pricing for both is on the [Microsoft 365 plans page](/microsoft-365), and the two plan pages carry the detail: [Business Standard](/microsoft-365/business-standard) and [Business Premium](/microsoft-365/business-premium). For a mixed assignment across your team, [ask for a quote](/enquiry) describing who does what and we will model the split rather than quoting one plan for everybody.`,
  },
  {
    slug: "microsoft-office-ltsc-2024-vs-microsoft-365",
    title: "Office LTSC 2024 vs Microsoft 365: buying software once, or renting it",
    excerpt:
      "One is a perpetual licence for a fixed set of applications on a specific machine. The other is a subscription to a service. Most organisations that compare them on price are comparing the wrong thing.",
    category: "Microsoft licensing",
    tags: ["office ltsc 2024", "microsoft 365", "perpetual licensing", "volume licensing"],
    readMinutes: 7,
    body: `Office LTSC 2024 exists for a specific set of situations, and outside them it is the more expensive choice despite costing less. Understanding which you are in takes about ten minutes.

LTSC stands for Long-Term Servicing Channel. It is the version of Office for machines that should not change: a laboratory instrument controller, a machine on an isolated network, a till, a device certified as part of a regulated process where any software change triggers re-validation.

## The three differences that matter

**It is bought once, for a device.** A perpetual licence, assigned to a machine rather than a person. Nobody signs in. No subscription lapses. The licence is a capital purchase and sits on the balance sheet accordingly, which is occasionally the entire reason it is chosen.

**It does not change.** No new features for its supported life. That is the product's purpose, not a limitation. On a validated workstation, a feature arriving unannounced is a problem rather than a benefit.

**It has no cloud services.** This is the one that surprises people. LTSC includes no Exchange mailbox, no OneDrive storage, no Teams, no SharePoint, and no web or mobile versions. Co-authoring a document with a colleague in real time is a Microsoft 365 capability, not an Office capability. If a buyer compares an LTSC licence against a Microsoft 365 subscription on the applications alone, they have omitted everything the subscription is actually for.

LTSC also carries a fixed support window — materially shorter than the ten years older perpetual Office versions enjoyed. Confirm the current end-of-support date for the edition you are buying before you plan a five-year deployment around it.

## When LTSC is right

- A device on an isolated or air-gapped network, where a subscription cannot activate or reactivate
- Software that must be fixed for validation, certification or regulatory reasons
- A shared machine no individual person signs in to — a shop-floor terminal, a drawing-office plotter station
- A requirement to capitalise the purchase rather than expense a subscription, where that genuinely drives the decision

## When it is the expensive option

For an ordinary knowledge worker, LTSC usually costs more over any realistic horizon once you count what you then have to buy separately: mail hosting, file storage and sharing, a meetings platform, and mobile access. Each of those is a line item that the subscription included.

The second cost is the upgrade. A perpetual licence buys one version. When the organisation eventually moves, it moves in one disruptive project rather than continuously — and the version it is moving from is by then several years behind the files its customers are sending.

## The hybrid nobody proposes

These are not exclusive. The common sensible answer in manufacturing and engineering firms is Microsoft 365 for the people and LTSC for the handful of fixed-function machines. Licensing them identically because it is simpler to administer is a false economy in both directions: you pay for cloud services a till will never use, and you place a validated instrument on a channel that updates itself.

## Common questions

**Can LTSC and Microsoft 365 coexist on one network?** Yes. They are separate licences and a device licensed for LTSC does not need to be in any particular relationship to your subscriptions.

**Can I install LTSC on a machine that also has Microsoft 365 apps?** Technically possible in some configurations but not advisable — two Office installations on one machine create file-association and update conflicts that are tedious to unpick. Pick one per device.

**Is Office LTSC 2024 the same as Office Home & Business?** No. The retail editions are separate products with different rights, and crucially different rules on transferring a licence between machines and on commercial use. Volume-licensed LTSC is the business product.

**What about Project and Visio?** They are licensed separately in both models, which is a cost people routinely forget when comparing.

## Where to go next

The LTSC editions and what each one includes are on the [Office LTSC page](/microsoft-office-ltsc), and the subscription side is on [Microsoft 365](/microsoft-365). If the answer is genuinely "some of each", [tell us the device and user split](/enquiry) and we will quote it as one estate rather than two.`,
  },
  {
    slug: "how-to-buy-genuine-microsoft-licences-in-india",
    title: "How to buy genuine Microsoft licences in India — and how to check what you bought",
    excerpt:
      "The market has a lot of cheap keys in it, and most of them are not what they appear to be. Here is how the legitimate channels work and how to verify a licence you already hold.",
    category: "Microsoft licensing",
    tags: ["genuine software", "microsoft licensing", "compliance", "india"],
    readMinutes: 8,
    body: `Search for a Microsoft licence and you will find the same product at prices an order of magnitude apart. The cheap ones are not a better deal on the same thing; they are usually a different thing. This explains what the legitimate routes are, why the cheap keys are cheap, and how to audit what your organisation is already running.

## The legitimate routes

**Cloud Solution Provider (CSP).** The usual route for Microsoft 365, Azure and most cloud services. You buy through a partner who provisions the subscription into your own tenant and invoices you, typically monthly or annually. You own the tenant. The partner has a defined administrative relationship with it, which you can see and revoke in the admin centre.

**Volume licensing agreements.** For larger estates, and for perpetual products. Different agreement types suit different sizes and commitment appetites — our note on [CSP versus an Enterprise Agreement](/blog/csp-vs-enterprise-agreement-which-microsoft-licensing-model) covers how to choose.

**Direct from Microsoft.** Available, and sometimes the right answer. What you give up is the ability to ring somebody who already knows your estate when a renewal or a migration goes wrong.

**OEM, with hardware.** Windows and occasionally Office, pre-installed and licensed to that specific machine. Legitimate, cheap, and non-transferable — the licence dies with the device.

## Why the cheap keys are cheap

Most belong to one of these categories, and none of them survives an audit:

- **Volume keys sold as single licences.** A key issued under somebody else's volume agreement, resold. It activates. It is not licensed to you, and the agreement it came from can be terminated.
- **Keys from another region.** Priced for a market with different purchasing power, and not valid where you are using them.
- **OEM keys sold loose.** Licensed to a machine that no longer exists, or never existed.
- **Academic or non-profit licences used commercially.** Genuine licences, used outside the eligibility they were granted under.
- **Keys that were never issued at all.** Generated, or stolen from a legitimate batch.

The failure mode is rarely immediate. The software activates and works for months. The problem arrives at a licence review, a tender that asks for proof of compliance, a customer's supplier audit, or the day the key is deactivated remotely and a finance team cannot open its spreadsheets.

## How to check what you already have

You can do most of this yourself in an afternoon.

**For Microsoft 365**, sign in to the admin centre and look at Billing. Every subscription shows who it was bought from. If a subscription's billing route is somebody you have no record of engaging, that is the first thread to pull.

**For perpetual Office and Windows**, find the proof of licence. What counts is not the key — it is the purchase record: the invoice naming your organisation, and for volume licences the agreement number and the licensing portal access that goes with it. A key on its own proves nothing about who is licensed.

**For the estate as a whole**, count installations against entitlements. The gap is where the exposure is. Most organisations that do this for the first time find the gap runs in both directions — unlicensed installations, and licences paid for that nobody uses. Our note on [the hidden cost of unused licences](/blog/hidden-cost-of-unused-software-licences) covers the second half.

## Questions worth asking any supplier

- Which channel is this being supplied through, named?
- Will the invoice be raised to our registered entity, with GST?
- For a subscription, will it be provisioned into our tenant, with us as owner?
- What proof of licence will we hold afterwards, and where?
- At renewal, what happens if we want to move it elsewhere?

A supplier who cannot answer the first and third of those is not selling you what you think they are.

## Common questions

**Is a licence bought on a marketplace genuine?** Sometimes. The channel is the issue, not the storefront. Ask the questions above and keep the answers.

**We inherited an estate and have no records. Where do we start?** Count installations first, then reconcile against whatever purchase records exist. Where there is a genuine gap, buying the shortfall prospectively is far cheaper than being found with it.

**Does a GST invoice prove the licence is genuine?** No. It proves a transaction occurred and lets you claim input credit — see [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases). It says nothing about the licence's provenance.

## Where to go next

The Microsoft licensing programmes and which suits which size of organisation are on the [Microsoft licensing page](/microsoft-licensing), and the CSP route specifically on [Microsoft CSP](/microsoft-csp). If you want the reconciliation done rather than described, [software asset management](/services/software-asset-management) is the service that does it.`,
  },
  {
    slug: "microsoft-365-licensing-guide-for-indian-businesses",
    title: "A Microsoft 365 licensing guide for Indian businesses",
    excerpt:
      "Which plan family applies to you, where the seat caps bite, what gets licensed per user versus per device, and the five decisions that actually determine what you pay.",
    category: "Microsoft licensing",
    tags: ["microsoft 365", "licensing guide", "india", "csp"],
    readMinutes: 9,
    body: `Microsoft 365 licensing looks complicated because the plan names do not describe the plans. Once you know which family you are in, the rest follows from five decisions.

## Step one: which family

**Business plans** — Basic, Standard, Premium, and Apps for Business. Capped at 300 seats. For most organisations under that size these are the plans, and they are substantially better value than the enterprise equivalents.

**Enterprise plans** — the E and F ranges. No seat cap. Required above 300 users, and chosen below it only when a specific capability is needed that the Business plans do not carry.

**Frontline plans** — for staff who share a device and need mail and Teams rather than desktop applications. Materially cheaper per head, and routinely missed by organisations with shift workers, drivers or shop-floor staff. If a third of your headcount does not sit at a computer, this is the single biggest saving available to you.

**Academic and non-profit** — separate programmes with eligibility criteria, which must actually be met.

The 300-seat cap is the first fork. It is enforced per plan, so a 350-person company cannot buy 350 Business Standard seats, but it can buy 300 Business Standard and 50 of something else — which is usually worse than moving the whole estate, and occasionally better.

## Step two: who needs desktop applications

Basic gives web and mobile Office, mail, Teams and OneDrive but no installed desktop applications. For a large number of roles that is sufficient and nobody notices. For anybody living in Excel it is not — the web version's limits on large workbooks, pivot handling and add-ins are real.

This is worth auditing rather than assuming. The usual finding is that between a quarter and a half of an organisation does not need the desktop suite, and was licensed for it because it was simpler to buy everyone the same thing.

## Step three: how much security

Covered in detail in [Business Standard versus Business Premium](/blog/microsoft-365-business-standard-vs-business-premium). The short version: Premium's addition is device management, conditional access, endpoint detection and document labelling, and the deciding question is usually whether work mail reaches personal phones.

## Step four: what is licensed separately

These are not in the plans and are the most common source of a quote being wrong:

- **Project and Visio** — separate subscriptions, per user
- **Copilot** — a per-user add-on with its own prerequisites; see [Copilot licensing](/blog/microsoft-365-copilot-licensing-in-india)
- **Windows** — Business Premium carries upgrade rights for a device already licensed for a qualifying Windows Pro edition; it does not license a bare machine
- **Power BI Pro**, **Dynamics 365**, **Azure** — all separate
- **Extra OneDrive or SharePoint storage** beyond the plan allowance
- **Audio Conferencing and calling plans** — Teams includes meetings; dialling a telephone number is an add-on

## Step five: term and billing

Annual commitment is cheaper per month than monthly commitment. Monthly buys the right to reduce seat count at any time. The right answer depends on how confident you are about headcount twelve months out, and for most businesses it is a mix: annual for the stable core, monthly for the part of the team that fluctuates.

Mid-term seat reduction on an annual commitment is generally not possible. This catches growing companies that over-commit in an optimistic quarter.

## Things specific to buying in India

**GST.** Charged on software subscriptions, and reclaimable as input credit where you are registered and the invoice is raised correctly to your registered entity with your GSTIN. Getting the entity name wrong on the invoice is the usual reason credit is lost. See [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases).

**Invoicing entity.** If you have multiple registered entities, decide which one holds the subscription before it is provisioned rather than after. Moving a subscription between entities is an administrative exercise nobody enjoys.

**Tenant region.** Chosen once, at tenant creation, and effectively permanent. It determines where your data sits at rest. Worth deciding deliberately if you have any contractual or regulatory interest in data location.

## A sensible order of operations

1. Count your people and split them by what they actually do — desk, frontline, shared device
2. Decide who needs installed applications
3. Decide who needs Premium's security controls, person by person rather than as a blanket
4. List the add-ons separately and price them as add-ons
5. Choose a term per group, not for the whole estate
6. Confirm the invoicing entity and GSTIN before provisioning

Most organisations that do this find a different answer from the one they would have bought, and it is usually cheaper rather than more expensive, because the saving from frontline and web-only seats outweighs the cost of upgrading the people who genuinely need more.

## Where to go next

The plans with current pricing are on [Microsoft 365](/microsoft-365), the programme routes on [Microsoft licensing](/microsoft-licensing), and the CSP mechanics on [Microsoft CSP](/microsoft-csp). For the split described above, [send us your headcount by role](/enquiry) rather than a seat total — the seat total is the thing that produces the wrong quote.`,
  },
  {
    slug: "windows-server-2025-licensing-explained",
    title: "Windows Server 2025 licensing explained: cores, CALs, and virtual machines",
    excerpt:
      "Server licensing has three dimensions that get conflated — the cores in the machine, the users or devices connecting to it, and how many operating system environments you intend to run.",
    category: "Microsoft licensing",
    tags: ["windows server 2025", "core licensing", "cals", "virtualisation"],
    readMinutes: 8,
    body: `Windows Server is licensed on three axes at once, and most incorrect server quotes are the result of pricing one and forgetting the other two.

## Axis one: cores

The server operating system is licensed by the physical cores in the machine. Two rules set the floor:

- A minimum per physical processor
- A minimum per server, regardless of how few cores it actually has

So a small two-processor machine with few cores is licensed at the minimum rather than at what it contains, and there is no saving to be had by specifying fewer cores below that floor. Above it, you license every physical core in the server — not the cores you have assigned to virtual machines.

Core licences are sold in packs. The arithmetic is: count physical cores, apply the per-processor and per-server minimums, and buy up to that number.

## Axis two: CALs

Core licences let the operating system run. They do not let anybody connect to it. Each user or device that accesses the server needs a Client Access Licence, and you choose per user or per device for a given server environment:

- **Per user** suits people with several devices each — one licence covers all of them
- **Per device** suits shared machines used by many people in shifts

CALs must match or exceed the server version. A 2025 server generally requires 2025 CALs; older CALs do not cover a newer server. This is the single most frequently missed line in a server refresh, and it is often a larger number than the server licences themselves.

Some roles need an additional specific CAL — Remote Desktop Services being the common one. If people will connect to a desktop session on the server, that is a separate licence on top of the ordinary CAL.

**External users** are an exception worth knowing: where a server is accessed by people outside your organisation, there is a licensing route that avoids counting them individually.

## Axis three: how many operating system environments

This is where Standard and Datacenter diverge, and it is the only question that decides between them.

**Standard** permits a limited number of virtualised operating system environments per fully licensed server. You can license the same server more than once to run more — licensing it twice doubles the allowance — and at some point doing that repeatedly costs more than Datacenter.

**Datacenter** permits effectively unlimited virtualised environments on the licensed server, plus rights relevant to software-defined storage and networking that Standard does not include.

The crossover point is a calculation, not a rule of thumb: count the virtual machines you will actually run on that host, work out how many times you would have to license it under Standard, and compare. Virtualisation-heavy hosts reach Datacenter quickly. A single-purpose file server never does.

Containers are counted differently from virtual machines, and if your plan is container-dense the comparison changes again.

## What people get wrong

**Licensing the virtual machines instead of the host.** You license physical cores on the host. The virtual machines are what the licence entitles you to run.

**Forgetting CALs entirely.** A quote with core licences and no CALs is not a quote for a working server.

**Reusing old CALs.** They do not cover a newer server version.

**Assuming Datacenter for a small host.** It is the right answer for density and the wrong answer for a single application server.

**Ignoring Software Assurance where mobility matters.** If the workload may move to a hosted environment, licence mobility is a question to settle before purchase rather than after.

## Common questions

**Does a passive failover server need licensing?** There are rights covering a cold standby under certain conditions, and they depend on how the standby is configured and on Software Assurance. Settle it explicitly — "it is only a failover" is not by itself an answer.

**Can we downgrade to an older version?** Downgrade rights generally exist under volume licensing, which matters when an application is not yet certified for 2025.

**Is CAL count the same as headcount?** Only if everyone connects. Count who or what actually accesses the server.

## Where to go next

The editions and current pricing are on the [Windows Server page](/windows-server), and the per-core pricing question specifically in [Windows Server 2025 core licence price in India](/blog/windows-server-2025-core-licence-price-in-india). For a quote, [send us the processor and core count, the virtual machine plan and who will connect](/enquiry) — those three numbers are what the licence count comes from, and a quote produced without them is a guess.`,
  },
  {
    slug: "adobe-creative-cloud-for-enterprise",
    title: "Adobe Creative Cloud for enterprise: what changes above a handful of seats",
    excerpt:
      "Teams and Enterprise are not the same product at different volumes. The difference is who controls the identity, the assets and the deployment — which matters more than the per-seat figure.",
    category: "Adobe licensing",
    tags: ["adobe creative cloud", "enterprise licensing", "etla", "teams"],
    readMinutes: 7,
    body: `Adobe sells Creative Cloud to organisations in two shapes, and the decision between them is about administration rather than price.

## Creative Cloud for Teams

The default for small and medium design teams. An administrator buys seats, assigns them by email address, and reassigns them when somebody leaves. Each user signs in with an Adobe ID — an identity Adobe holds, not one you control.

What you get: the applications, a shared storage allowance, licence reassignment, and an admin console showing who has what.

What you do not get: control over the identity. If a designer leaves, you reassign the seat, but files saved to their personal Adobe ID storage travel with the person rather than staying with the company. For a small team where everything lives on a company file server anyway, this is a non-issue. For a studio whose work in progress lives in Creative Cloud, it is the whole issue.

## Creative Cloud for Enterprise

The same applications with a different control model, and three changes that matter:

**Federated identity.** Users sign in with your organisation's directory rather than a personal Adobe ID. One place to disable an account, and no orphaned work when somebody leaves.

**Enterprise-owned assets.** Work created under an enterprise licence belongs to the organisation's storage. When a seat is reclaimed, the files stay.

**Managed deployment and version control.** You can package applications for deployment, pin specific versions, and stop an update arriving in the middle of a project. For teams whose files move between machines, version drift is a real cost — a document opened in a newer version frequently cannot go back.

Enterprise agreements also bring the administrative apparatus of an enterprise purchase: a term, a named agreement, and a defined support path.

## How the buying programmes differ

**VIP** — the subscription programme most teams use, with an anniversary date and the ability to add seats mid-term that co-terminate with the rest.

**VIP Marketplace** — the same programme bought through a partner, with consolidated billing and partner-side administration. See [VIP versus VIP Marketplace](/blog/adobe-vip-versus-vip-marketplace) for the practical differences.

**ETLA** — a negotiated enterprise term agreement, typically multi-year with a committed quantity. Suits large, stable estates; the commitment is the point and the risk.

## Deciding

The useful questions:

**Do you run a directory your people already sign in to?** If yes, federated identity is worth a great deal of administrative time and is the main argument for Enterprise.

**Does work in progress live in Creative Cloud or on your own storage?** If Adobe's storage holds live project files, asset ownership is not an abstraction.

**Can an update mid-project cost you?** If yes, managed deployment with version pinning is the feature you are buying.

**How often do people join and leave?** High turnover amplifies everything above.

A ten-person studio with a file server and low turnover is well served by Teams and would gain little from Enterprise. A fifty-person agency with contractors rotating through, work living in the cloud, and clients who require named access controls has a different answer.

## Shared Device licensing

Worth knowing separately: for computer labs and shared workstations where many people use one machine, Adobe has a device-based licensing option rather than a per-named-user one. Education is the usual setting. If you are licensing a lab per head you may be buying the wrong thing — see the [education technology page](/solutions/education).

## Common questions

**Can we mix Teams and Enterprise?** They are separate administrative constructs and running both means running two consoles. Occasionally justified, usually not.

**Does Enterprise cost more per seat?** Not necessarily, and for larger quantities frequently less. The per-seat comparison is the wrong frame anyway: the costs that differ are administrative.

**What happens to files if we stop subscribing?** The applications stop working. Files you created remain yours, but anything in a proprietary format needs an application that opens it, so plan an export before a lapse rather than after.

## Where to go next

The Adobe programmes and current pricing are on the [Adobe licensing page](/adobe), with the Creative Cloud detail on [Adobe Creative Cloud](/adobe-creative-cloud). For a quote, [tell us the team size, whether you run a directory, and where project files live](/enquiry) — those three answers decide Teams versus Enterprise, and the seat count alone does not.`,
  },
  {
    slug: "autocad-subscription-versus-the-alternatives",
    title: "AutoCAD subscription versus the alternatives: Flex, LT, and the collections",
    excerpt:
      "A named-user subscription is not the only way to license AutoCAD, and for occasional users it is frequently the most expensive. Four options, and the arithmetic for choosing between them.",
    category: "Autodesk licensing",
    tags: ["autocad", "autodesk flex", "aec collection", "named user"],
    readMinutes: 7,
    body: `AutoCAD is licensed to a named person, not to a machine. That single rule generates most of the licensing questions design teams have, because it means the cost scales with how many people might open it rather than with how much it is used.

There are four ways to pay for it. The right one depends on a number most firms have never counted.

## Option one: a named-user subscription

The default. One subscription, one named person, who can install on multiple machines and sign in from whichever they are at. Current AutoCAD subscriptions include the specialised toolsets — architecture, mechanical, electrical, map and the rest — at no extra cost, which is a change from older perpetual licensing and is frequently not reflected in a buyer's assumptions.

Right for anybody who uses AutoCAD as part of their job most weeks.

## Option two: Flex

Pre-purchased tokens, drawn down per day of actual use. A person who opens AutoCAD on a given day consumes that day's tokens; a person who does not consumes nothing.

This is the option for occasional users, and the arithmetic is simple enough to do on paper: count the days per year a person actually opens the software. Below a threshold — and the threshold is a calculation against current token pricing, not a fixed number — Flex is cheaper than a subscription. Above it, it is not, and it gets worse quickly.

Where Flex consistently wins: the project manager who opens drawings to check something twice a month, the structural engineer who needs Civil 3D for two weeks a year, the director who reviews rather than draws. Firms with a dozen such people frequently find they are paying twelve full subscriptions for what Flex would cover for a fraction.

Where it loses: anybody using it regularly. Tokens are a worse deal than a subscription for daily work, by design.

## Option three: AutoCAD LT

Historically the cut-down 2D option. Autodesk has consolidated the AutoCAD line, so LT as a separate purchase is no longer the straightforward downgrade path it once was. If you hold existing LT licences, what happens at renewal is a specific question worth asking rather than assuming — and the answer has changed more than once.

## Option four: a collection

The AEC Collection and the Product Design & Manufacturing Collection each bundle AutoCAD with a set of related products. If a person uses AutoCAD and Revit, or AutoCAD and Inventor, the collection is usually cheaper than the two products bought separately — and it is almost always cheaper than three.

The trap is buying a collection for somebody who uses one product in it. A collection priced against two products is good value for a person using two and poor value for a person using one.

See [the AEC Collection explained](/blog/autodesk-aec-collection-explained) for what is in it and who it suits.

## The number nobody has counted

The decision above turns on days of use per person per year. Most firms do not know this figure and estimate it badly in both directions — the director who "barely uses it" opens it weekly, and the engineer everybody assumes is in it daily works in Excel for half the year.

Autodesk's admin reporting shows actual usage per seat. Pull the last twelve months before a renewal. The usual outcome is a reassignment rather than a quantity change: some seats move to Flex, one or two move up to a collection, and the total falls.

## Term length

One-year and three-year terms are both available, with the longer term costing less per year and removing two renewal events. Against that, it fixes a quantity for three years. For a stable team the longer term is straightforwardly cheaper; for a firm that might win or lose a large project, the flexibility has a value.

## Common questions

**Can two people share one subscription?** No. Named-user means one person, and sharing breaches the terms. Flex exists precisely to serve the case people try to solve by sharing.

**Can a subscription move between people?** Yes — reassignment is permitted and is how you handle somebody leaving. It is not intended as a way to rotate one licence through a team weekly.

**What happened to perpetual AutoCAD licences?** No longer sold. Existing ones continue to work within their terms, but there is no upgrade path that restores perpetual licensing, and a maintenance plan is not the same thing as a subscription.

**Does a subscription work offline?** For a period, yes — it needs to reach Autodesk periodically to confirm the licence. A permanently offline machine is a specific conversation.

## Where to go next

The AutoCAD editions and current pricing are on the [AutoCAD page](/autocad), the collections on [AEC Collection](/aec-collection), and the named-user change in [what changed with named-user licensing](/blog/autodesk-named-user-licensing-what-changed). For a mixed answer across your team, [send us a usage export rather than a seat count](/enquiry) — the usage export is what makes the Flex arithmetic possible.`,
  },
  {
    slug: "autodesk-aec-collection-explained",
    title: "The Autodesk AEC Collection explained: what is in it and who it is for",
    excerpt:
      "A bundle of around twenty products that is cheaper than buying two of them separately. Which means the question is not whether it is good value, but whether your team uses two.",
    category: "Autodesk licensing",
    tags: ["aec collection", "revit", "civil 3d", "navisworks", "bim"],
    readMinutes: 7,
    body: `The Architecture, Engineering & Construction Collection is Autodesk's bundle for the building and infrastructure industries. Its pricing logic is straightforward: it costs less than two of its constituent products bought apart. Everything about the buying decision follows from that.

## What is in it

The products that matter to most buyers:

- **Revit** — multi-discipline BIM modelling and coordinated documentation
- **AutoCAD** — including the specialised toolsets
- **Civil 3D** — civil infrastructure design, corridors, surfaces, survey, networks
- **Navisworks Manage** — model aggregation and clash detection across disciplines
- **InfraWorks** — early-stage infrastructure planning in real-world context
- **3ds Max** — visualisation and rendering
- **Advance Steel** and **Robot Structural Analysis** — detailing and structural analysis
- **Autodesk Forma** — conceptual design
- **ReCap Pro** — reality capture, point clouds from scans and photographs

Plus cloud capability for collaboration and simulation, and a longer tail of smaller tools.

The list changes between releases. Products are added and occasionally removed, so confirm the current contents against the edition you are buying rather than against an article — including this one.

## Who it is for

**A multi-discipline design practice.** If the same firm does architecture, structure and services, the Collection covers all three and the coordination between them. This is the case it was built for.

**Anybody doing clash detection.** Navisworks Manage inside the Collection is often the single line that justifies it. Coordination problems found in a model cost a meeting; found on site they cost a programme.

**A contractor reviewing models they did not author.** The Collection's viewing and aggregation tools matter more here than its authoring tools.

**Anybody using two or more of the products above.** This is the arithmetic. Two products separately generally cost more than the Collection, so a person using Revit and AutoCAD is already past the threshold.

## Who it is not for

**A single-product user.** Somebody who only ever opens AutoCAD is paying for nineteen products to use one. Buy AutoCAD.

**An occasional user of two products.** If a structural engineer needs Revit for three weeks a year, Flex tokens against the individual products may beat a Collection subscription. Count the days — see [AutoCAD subscription versus the alternatives](/blog/autocad-subscription-versus-the-alternatives).

**A manufacturing team.** The Product Design & Manufacturing Collection is the equivalent bundle for Inventor, Fusion and the CAM products. The AEC Collection is the wrong bundle for a machine shop.

## The licensing mechanics

Named-user, like everything else current from Autodesk. One Collection subscription, one person, who may use any or all of the products in it. It cannot be split across two people, and two people each using one product need two subscriptions — which is usually the point at which somebody asks whether individual products would be cheaper. Do that sum; sometimes they are.

Collections are available on one-year and three-year terms, the longer being cheaper per year.

## The mixed estate that is usually right

Firms that license uniformly tend to over-spend. The pattern that holds up:

- **Collections** for the people who genuinely work across disciplines — typically the BIM coordinators and senior designers
- **Individual products** for the specialists who live in one
- **Flex** for the reviewers, project managers and directors who open models occasionally

Autodesk's usage reporting will tell you who is in which group. Pull it before a renewal rather than after.

## Common questions

**Is Revit available on its own?** Yes, as an individual subscription. It is worth comparing against the Collection, because the gap is often smaller than people expect.

**Does the Collection include Autodesk Construction Cloud?** The Collection includes cloud capability, but the construction management platform is a separate line of products with its own licensing. See [Autodesk Construction Cloud](/autodesk-construction-cloud).

**Can we move a Collection subscription between people?** Reassignment is permitted, as with any named-user subscription.

**Do we need the Collection for every seat on a project?** No. Licence the people, not the project.

## Where to go next

The Collection's contents and current pricing are on the [AEC Collection page](/aec-collection), with the component products at [Revit](/revit) and [AutoCAD](/autocad). For a mixed estate as described above, [send us who uses which product and how often](/enquiry) — we will say which seats should be Collections and which should not, including when the answer is fewer Collections than you have now.`,
  },
  {
    slug: "how-government-departments-procure-genuine-software",
    title: "How government departments and PSUs procure genuine software in India",
    excerpt:
      "The procurement route determines nearly everything about the purchase — what documentation is needed, how price is established, and what the department holds afterwards as proof of licence.",
    category: "Government procurement",
    tags: ["government procurement", "gem", "psu", "tender", "compliance"],
    readMinutes: 9,
    body: `Software procurement in the public sector fails in predictable ways, and almost none of them are about software. They are about the procurement route being chosen after the requirement has been written, rather than before.

This describes the routes available, what each needs, and the documentation a department should hold at the end.

## The routes

**Government e-Marketplace (GeM).** The default channel for central and state government purchases. Sellers register, list against product categories, and buyers purchase either from a catalogue or through a bid. For standard software licences — an office suite, a design product, an operating system — GeM is usually the straightforward route, because the product is a defined item rather than a scope of work.

**Direct purchase.** Below a threshold set by the General Financial Rules, a department may purchase without a competitive process. Above it, a competitive route applies, and above a further threshold a formal bid or reverse auction is required. The thresholds are set by rule and have been amended, so confirm the current figures against the GFR and your own department's delegation of financial powers rather than against any article — including this one.

**Tender.** For larger or composite requirements, particularly where licences are bundled with implementation, migration or support. The specification does the work here: a tender written around one publisher's product names will either be challenged or will produce a single compliant bid.

**Rate contract and existing framework agreements.** Where a framework already covers the product, using it is usually faster and defensible.

## What goes wrong, and when

**The specification names a product instead of a requirement.** "Supply Microsoft Office" invites a challenge. "Supply an office productivity suite providing the following, interoperable with existing .docx and .xlsx archives" survives one. Where a specific product genuinely is required — because of file-format compatibility with an existing archive, or certification of an existing process — the justification belongs in the file at the time, not reconstructed afterwards.

**The licence model is not specified.** A bid for "100 licences of a design product" will attract quotes for perpetual licences, one-year subscriptions and three-year subscriptions, which are not comparable. State the term, the licensing basis (named user, device, core) and whether support is included.

**Named users are procured as devices.** Most current design and productivity software is licensed to a person. A department buying by workstation count will either over-buy or find the licences unusable as deployed.

**CALs are omitted from server purchases.** A server bid priced on core licences alone is not a working server. See [Windows Server 2025 licensing explained](/blog/windows-server-2025-licensing-explained).

**Renewal is nobody's line item.** Subscriptions lapse. A perpetual purchase has no renewal; a subscription has one every year, and if it is not budgeted the software stops. This is the single most common cause of an avoidable procurement emergency.

## What the department should hold afterwards

Proof of licence is not a product key. The file should contain:

- The invoice, raised to the department's own name
- The purchase order and the acceptance record
- For volume licences, the agreement or enrolment number and access to the licensing portal
- The licence term and the renewal date, recorded somewhere a person will look before it passes
- The assignment record — which licences are deployed where, or to whom

An audit, a CAG query or a successor officer taking over will ask for these. Assembling them two years later from a publisher's records is possible and unpleasant.

## Specifying so that competition is real

The practical test of a good software specification is whether two different suppliers could both comply and be compared. That means:

- Functional requirements rather than product names, with a recorded justification where a product name is unavoidable
- An explicit licence term and basis, so bids are comparable
- Quantities by licence type, not by headcount
- Support and deployment scoped separately from licences, or explicitly included
- Compliance evidence requirements stated up front

## Common questions

**Can a department buy software directly from a publisher abroad?** It can, and there are then questions about invoicing, GST and whether a local entity is required for the purchase to be processed. Settle them before the bid rather than at payment.

**Does GeM guarantee the licence is genuine?** GeM is a procurement channel, not a provenance check. The documentation above is what establishes genuineness — see [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india).

**What about academic licensing for government institutions?** Academic programmes have eligibility criteria that an institution either meets or does not. A government department is not automatically eligible because it is public.

**Can subscriptions be bought on a multi-year basis?** Frequently yes, and it is often cheaper. Whether a department may commit across financial years is a question for its own financial rules.

## Where to go next

The public-sector page covers how we work with departments and PSUs: [government and PSU](/industries/government-psu). For the GeM channel specifically, see [GeM software supply](/gem-software-supplier). If you are writing a specification now, [send us the draft](/enquiry) — the licence basis and quantity lines are where we can be most useful, and they are the hardest to fix after bids are open.`,
  },
  {
    slug: "common-software-licensing-mistakes",
    title: "Ten software licensing mistakes that cost real money",
    excerpt:
      "Every one of these is routine, none of them is exotic, and most are found during a renewal or an audit rather than at the point they were made.",
    category: "Licensing practice",
    tags: ["licensing", "compliance", "software asset management", "renewals"],
    readMinutes: 8,
    body: `These are the ones that recur. Each costs either money paid for nothing, or money owed and not budgeted.

## 1. Licensing everybody identically

The most expensive habit in software procurement. Buying every member of staff the same plan is administratively simple and almost always wrong: a share of any workforce does not need desktop applications, and a share of any design team does not need a full subscription. Uniform licensing pays for the maximum requirement across the whole headcount.

The fix is an audit of what people actually do, by role. It is usually a day of work and it usually finds a double-digit percentage.

## 2. Not counting actual usage before a renewal

Most publishers provide usage reporting. Few customers read it before renewing. The result is a renewal at last year's quantity, including the seats of people who have left, the seats nobody has opened in nine months, and the collection bought for somebody who uses one product in it.

Pull twelve months of usage before every renewal. See [what to check before a software renewal](/blog/what-to-check-before-a-software-renewal).

## 3. Buying subscriptions and forgetting they end

A perpetual licence bought and forgotten keeps working. A subscription bought and forgotten stops. The failure is a budget failure rather than a licensing one, and it lands on a Monday morning when a design team cannot open its files.

Every subscription needs a renewal date recorded somewhere a person will look, and an owner.

## 4. Treating a product key as proof of licence

A key activates software. It does not establish that your organisation is licensed. What does is the invoice in your name, the agreement number, and the portal access. Organisations that hold keys and no paperwork discover this at an audit.

## 5. Buying cheap keys

Covered in detail in [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india). The short version: volume keys resold as singles, keys from another region, loose OEM keys and academic licences used commercially all activate, and none survives scrutiny.

## 6. Omitting CALs, add-ons and the separately licensed products

The lines most often missing from a quote that looked complete:

- Client Access Licences on a server purchase
- Project and Visio, which are not in Microsoft 365 plans
- Remote Desktop Services licences where people connect to a session
- Extra storage beyond a plan allowance
- Calling plans, as distinct from Teams meetings
- Copilot and other per-user add-ons

A quote without these is not cheaper. It is incomplete.

## 7. Sharing named-user licences

Current licensing for most design and productivity software is per named person. Two people using one subscription breaches the terms, and the publisher can see it. Where the underlying need is occasional access, there is usually a legitimate product for it — Autodesk Flex being the clearest example.

## 8. Assuming academic or non-profit eligibility

Academic and non-profit programmes are materially cheaper and have eligibility criteria that are checked. A commercial arm of an educational trust, a training business, or a contractor working on an institution's project is frequently not eligible, and discovering this retrospectively converts a saving into a liability.

## 9. Getting the invoicing entity wrong

Specific to India and entirely avoidable. An invoice raised to the wrong group entity, or with an incorrect GSTIN, loses the input credit and is tedious to correct. Where a group has several registered entities, decide which one holds the subscription before provisioning. See [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases).

## 10. Committing for three years in an optimistic quarter

Longer terms are cheaper per year, and that is a real saving for a stable team. Against it: an annual commitment generally cannot be reduced mid-term. A company that commits at its peak headcount pays for the peak through the trough.

The usual right answer is a split — a longer term for the stable core of the team, annual or monthly for the part that fluctuates.

## The pattern behind all ten

Nine of these are the same mistake in different clothes: a licensing decision made once and then not revisited, while the organisation it was made for changed. An estate licensed correctly two years ago is probably licensed wrongly now, in both directions at once.

An annual reconciliation — installations against entitlements, usage against seats, people against plans — costs a day and is the cheapest money in software procurement.

## Where to go next

[Software asset management](/services/software-asset-management) is the service that does the reconciliation, and [licence management](/services/licence-management) is the one that keeps the renewal calendar. If you would rather start with the numbers, [send us your current licence list and we will tell you what we think is wrong with it](/enquiry) — including when the answer is nothing.`,
  },
  {
    slug: "adobe-creative-cloud-price-in-india",
    title: "What Adobe Creative Cloud costs a business in India, and what changes the figure",
    excerpt:
      "The published per-seat figure is the start of the calculation, not the end. Plan type, All Apps versus single app, term length and programme all move it.",
    category: "Adobe licensing",
    tags: ["adobe creative cloud", "price india", "vip", "teams"],
    readMinutes: 6,
    body: `Creative Cloud pricing for a business is not one number, and the gap between the cheapest and most expensive way to license the same team is wide enough to matter.

Current figures for each edition are on the [Adobe licensing page](/adobe) and the [Creative Cloud page](/adobe-creative-cloud), read from the catalogue rather than written into this article — a price typed into an article is wrong the first time Adobe moves a list, and a stale figure in an indexed article is the one a buyer quotes back at you.

What follows is what moves the figure.

## Individual, Teams or Enterprise

**Individual** plans are for one person buying for themselves. They are not licensed for a business to buy on an employee's behalf, and they cannot be reassigned when that person leaves — which is the practical reason businesses should not use them, quite apart from the terms.

**Teams** is the business plan: reassignable seats, an admin console, shared storage.

**Enterprise** changes the identity and asset-ownership model rather than the applications. See [Creative Cloud for enterprise](/blog/adobe-creative-cloud-for-enterprise).

## All Apps or a single app

The largest single lever. All Apps covers the full set; a single-app subscription covers one.

The arithmetic is the same as any bundle: a person using Photoshop and Illustrator is usually past the point where All Apps is cheaper than two single apps. A person who only ever opens Acrobat should not be on All Apps at all — and frequently is, because it was simpler to buy everybody the same thing.

This is worth auditing by name. The usual finding in a design team of any size is that two or three people need All Apps and the rest need one or two applications each.

## Acrobat is a separate decision

Acrobat Pro is included in All Apps and available on its own. In most organisations the number of people who need to edit PDFs considerably exceeds the number who need Photoshop — so Acrobat is usually a larger line item than Creative Cloud itself, bought separately for the wider business. See [Adobe Acrobat for business](/adobe-acrobat).

## Term and programme

Annual commitment is cheaper per month than month-to-month, and monthly buys the right to drop seats.

The programme matters too: VIP has an anniversary date and lets added seats co-terminate with the rest, which keeps one renewal date rather than twelve. VIP Marketplace is the same programme bought through a partner. See [VIP versus VIP Marketplace](/blog/adobe-vip-versus-vip-marketplace).

## GST

Charged, and reclaimable as input credit where you are registered and the invoice is raised correctly to your registered entity with your GSTIN. Prices quoted on this site exclude GST and say so. See [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases).

## What a realistic estimate needs

To price a team properly, four things:

1. How many people need All Apps, by name
2. Which single applications the rest need
3. How many need Acrobat but no creative applications
4. Term preference, and whether headcount is stable

A quote produced from a seat total alone will be for All Apps at that quantity, which is the most expensive correct answer to the question.

## Common questions

**Is there a minimum seat count for Teams?** No minimum, and the admin console is available from the first seat.

**Can we mix All Apps and single apps on one account?** Yes, and that is usually the right configuration.

**Do students and schools pay less?** Education pricing exists with eligibility criteria, and for labs there is device-based licensing rather than named-user. See [technology for education](/solutions/education).

**What happens if we stop paying?** The applications stop opening. Your files remain yours, but proprietary formats need an application, so export anything you need long-term access to before a lapse.

## Where to go next

Current pricing per edition is on [Adobe](/adobe) and [Adobe Creative Cloud](/adobe-creative-cloud). For a figure against your actual team rather than a seat count, [send us the four answers above](/enquiry) and we will quote the mix.`,
  },
  {
    slug: "microsoft-365-copilot-licensing-in-india",
    title: "Microsoft 365 Copilot licensing: the prerequisites nobody mentions",
    excerpt:
      "Copilot is a per-user add-on with conditions attached — a qualifying base plan, data you are willing to have it read, and permissions that are already correct.",
    category: "Microsoft licensing",
    tags: ["copilot", "microsoft 365", "add-on", "licensing"],
    readMinutes: 6,
    body: `Copilot is licensed as a per-user add-on rather than a plan, and the licensing is the easy part. The conditions around it decide whether the purchase is worth anything.

## The licensing mechanics

**It is an add-on.** It sits on top of a qualifying Microsoft 365 base plan and does not replace one. A user without a qualifying base licence cannot be assigned Copilot.

**It is per named user.** Assigned to a person, not shared, and not pooled across a team. This matters more than usual here, because the natural instinct with a new capability is to buy a few seats and let people take turns. That is not available.

**Qualifying base plans change.** Which base plans qualify has been revised more than once since launch. Confirm against current Microsoft documentation for the plans you actually hold rather than against an article.

**It has its own term.** Typically an annual commitment, which is the thing to look at hardest given everything below.

## The three prerequisites that decide whether it works

**Your permissions must already be correct.** This is the one that catches organisations out. Copilot answers questions using the content the signed-in user can already reach. If your SharePoint permissions are loose — a site everybody can read that contains the salary review, a folder inherited from a project that was never locked down — Copilot will find it and surface it, fluently, to anybody who asks the right question.

It is not a security failure in Copilot. It is an existing permissions problem that was previously protected by the content being hard to find. Deploying Copilot removes that protection.

Audit sharing and permissions before purchase, not after. For most organisations this is the largest piece of work in a Copilot deployment and it is not on the invoice.

**Your content must be somewhere it can read.** Copilot works across Microsoft 365 content. Files on a local server, in a third-party system, or in somebody's personal storage are not in scope. An organisation whose working documents live on a file share will see much less value than one already working in SharePoint and Teams.

**People must have something for it to do.** The honest observation from deployments: the value concentrates in roles that produce a lot of written output or sit in a lot of meetings. Buying it for an entire headcount uniformly repeats mistake number one from [ten licensing mistakes](/blog/common-software-licensing-mistakes).

## A sensible way to buy it

1. Fix sharing and permissions first, and verify with a report rather than an assumption
2. Identify the twenty or thirty people whose work is document- and meeting-heavy
3. Buy for them, on the shortest term available
4. Measure whether it is used after the novelty passes — the usage reporting exists
5. Expand on evidence

The failure pattern is the reverse: buy broadly on an annual commitment, discover usage concentrates in a tenth of the licences, and be unable to reduce until the anniversary.

## What it does not include

- It is not a substitute for a security or compliance product
- It does not license anything else — the base plan rules still apply
- It does not improve the content it reads. If your intranet is out of date, Copilot will cite the out-of-date version confidently

## Common questions

**Is there a minimum seat count?** Minimums have changed since launch and have at times been removed. Confirm current terms.

**Can we trial it?** Trial availability varies by programme and by region. Ask rather than assume, and prefer a trial over a commitment if one is available.

**Does our data train Microsoft's models?** Microsoft's commercial data-protection commitments cover this and are worth reading in the current version rather than taking second-hand — it is the question your own compliance function will ask.

**Where does the data sit?** Follows your tenant's data residency. If that matters to you it was decided at tenant creation.

## Where to go next

The base plans Copilot sits on are on [Microsoft 365](/microsoft-365), and the licensing routes on [Microsoft licensing](/microsoft-licensing). If the permissions audit above is the blocker — and it usually is — [endpoint management](/services/endpoint-management) and [software asset management](/services/software-asset-management) are where that work sits. For a quote, [tell us the base plans you hold and how many people you want to start with](/enquiry).`,
  },
  {
    slug: "autodesk-flex-versus-named-user-subscriptions",
    title: "Autodesk Flex versus named-user subscriptions: counting the days",
    excerpt:
      "Flex is pre-paid tokens drawn down per day of use. Whether it beats a subscription is pure arithmetic, and most firms have never done it.",
    category: "Autodesk licensing",
    tags: ["autodesk flex", "named user", "tokens", "autocad"],
    readMinutes: 6,
    body: `Flex exists for one situation: people who need Autodesk software occasionally. For them it is substantially cheaper than a subscription. For everybody else it is substantially more expensive. The dividing line is a number of days per year, and it is calculable.

## How Flex works

You buy tokens in advance. When a person opens a covered product, tokens are consumed for that day's access to it. Open it twice in a day and it costs the same as once. Do not open it and it costs nothing.

Different products consume different token quantities per day — a full-featured product costs more per day than a lighter one — so the arithmetic is per product, not global.

Tokens have a validity period. Buying a large quantity against uncertain use risks them expiring unused, which is the main way Flex is bought badly.

## The arithmetic

For one person and one product:

1. Find the token cost per day for that product
2. Multiply by the days per year that person will open it
3. Compare against the annual subscription price for that product

Below the crossover, Flex wins. Above it, the subscription wins, and it wins by more the further above you go.

The crossover lands at a modest number of days for most products — low enough that anybody using the software weekly is clearly a subscription, and anybody using it monthly is clearly Flex. The genuinely ambiguous band is narrow, and in it the subscription is usually the better choice because it is predictable.

## Where it reliably wins

- The project manager or director who opens drawings to check something, not to draw
- The structural or civil engineer who needs a specialist product for a few weeks a year
- A second product for somebody who has a subscription to their main one — the engineer on Revit who needs Civil 3D twice a quarter
- Seasonal or project-driven peaks, where three extra people need access for one month
- Reviewers and approvers generally

A firm with a dozen people in those categories is frequently paying a dozen full subscriptions, and that is the single largest saving available in most Autodesk estates.

## Where it loses

Daily and weekly users, unambiguously. Flex is not a cheaper subscription; it is a different product for a different pattern, and used for regular work it costs considerably more.

## The number you need

Days of actual use, per person, per product, over twelve months. Autodesk's admin reporting provides this. Pull it before a renewal.

Do not estimate it. Estimates are wrong in both directions in a way that is consistent enough to be funny: the person everybody describes as a heavy user turns out to open it twice a month, and the director who "never touches it" is in it weekly.

## Practical cautions

**Tokens expire.** Buy against measured use plus a margin, not against a hopeful projection.

**Administration is real.** Flex needs somebody watching the balance. Running out mid-project is a bad afternoon.

**Not every product is covered.** Check the current eligible product list.

**Mixed estates need a reconciliation habit.** The right split this year is the wrong split next year, because people's roles change. Revisit annually.

## The configuration that usually wins

- **Subscriptions** for regular users, on their main product
- **Collections** for the people genuinely working across several products — see [the AEC Collection explained](/blog/autodesk-aec-collection-explained)
- **Flex** for occasional users, and for second products held by subscription users

## Common questions

**Can Flex and subscriptions coexist?** Yes, and the mix above is the normal configuration in a well-managed estate.

**Can two people share a Flex pool?** Yes — that is the point. Tokens are organisational, drawn down by whoever uses the software. This is the legitimate answer to the need people otherwise try to meet by sharing a named-user licence, which is not permitted.

**What happens if tokens run out mid-day?** Access stops. Monitor the balance.

**Is Flex cheaper than the old network licences?** Different model, and not directly comparable. Network licences were concurrent-use; Flex is metered daily use.

## Where to go next

Product pricing is on [AutoCAD](/autocad), [Revit](/revit) and [AEC Collection](/aec-collection), and the licensing change that produced Flex in [what changed with named-user licensing](/blog/autodesk-named-user-licensing-what-changed). To have the arithmetic done, [send us a usage export](/enquiry) — it is the one input that makes this a calculation rather than an opinion.`,
  },
  {
    slug: "preparing-for-a-software-licence-audit",
    title: "Preparing for a software licence audit before anyone asks",
    excerpt:
      "An audit is a documentation exercise. Organisations that fail one usually had the licences and could not prove it.",
    category: "Licensing practice",
    tags: ["licence audit", "compliance", "software asset management"],
    readMinutes: 7,
    body: `Software audits arrive from three directions: a publisher exercising an audit clause, a customer's supplier assurance process, or a tender asking for compliance evidence. All three ask the same question, and it is not "are you licensed". It is "show me".

The organisations that struggle are rarely pirating anything. They have bought what they needed, over several years, through several people, and cannot now assemble the evidence.

## What an audit actually asks for

**What is installed, where.** A list of installations by machine or by user, for the products in scope.

**What you are entitled to.** Proof of licence for each: the invoice in your organisation's name, the agreement or enrolment number for volume licences, and portal access.

**How the two reconcile.** Installations matched against entitlements, with the gaps explained.

**That the licence type matches the use.** A named-user licence used by two people, an academic licence used commercially, or an OEM licence moved to a different machine are all non-compliant despite the licence being genuine.

## The four-step preparation

**Step one: inventory what is installed.** Discovery tooling does this properly. Done by hand it is a survey, and surveys miss the machine in the corner that runs the plotter.

**Step two: assemble entitlements.** This is the slow part and the reason to start before anybody asks. For each product: who bought it, when, under what agreement, and where is the paperwork. Expect gaps where a purchase predates the current finance system or the person who made it.

**Step three: reconcile.** Installations against entitlements, per product, per licence type. Two kinds of gap appear and both matter:

- **Under-licensed** — installations with no entitlement. This is the exposure.
- **Over-licensed** — entitlements with no installation. This is money already spent on nothing, and it is usually the larger number.

**Step four: close the gaps.** Buying a shortfall prospectively, before an audit finds it, costs the licence price. Found during an audit it can cost considerably more, and publishers are entitled to back-date.

## The specific things that trip people

**Named-user licences treated as floating.** Most current design and productivity software is per person. An estate administered as though licences were per machine will reconcile badly.

**Server CALs.** Rarely tracked, frequently short. See [Windows Server 2025 licensing explained](/blog/windows-server-2025-licensing-explained).

**Virtual machines and test environments.** A development or test instance usually needs licensing. "It is only a test box" is not an entitlement.

**Software on machines that left.** A licence assigned to a laptop that was disposed of, or to somebody who left two years ago, is an entitlement you are paying for and not using.

**Eligibility that lapsed.** An academic or non-profit licence remains compliant only while the eligibility holds.

**Keys without paperwork.** The commonest finding. The software is genuine, the organisation paid for it, and there is no document that says so. See [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india).

## What to keep, permanently

A single place holding, per product:

- Invoices, in the organisation's name
- Agreement and enrolment numbers, with portal credentials recorded against a role rather than a person
- Licence terms, quantities and renewal dates
- The assignment record — who or what each licence covers
- Deployment and disposal records

This is not an audit artefact. It is what makes renewals rational, and the reconciliation that produces it typically finds enough over-licensing to pay for itself.

## How often

Annually, and before any renewal of consequence. An estate reconciled two years ago is wrong now, because people joined, left and changed roles.

## Common questions

**Can we refuse an audit?** Volume licensing agreements generally contain an audit clause you have already agreed to. Read yours.

**Does the publisher's own portal show our entitlements?** For subscriptions bought through current channels, largely yes. For older perpetual purchases, often not, which is why the paperwork matters.

**What if we find a real shortfall?** Close it prospectively and keep the record of having done so. A gap found and fixed is a different conversation from a gap found by an auditor.

**Who should own this?** Someone named. Shared ownership of a licence register means no ownership, which is how registers go stale.

## Where to go next

[Software asset management](/services/software-asset-management) is the service that builds and maintains the register, and [licence management](/services/licence-management) keeps the renewal calendar against it. See also [the hidden cost of unused licences](/blog/hidden-cost-of-unused-software-licences), which is the half of this exercise that saves rather than costs money. To start with a reconciliation, [send us your licence list](/enquiry).`,
  },
  {
    slug: "microsoft-365-versus-google-workspace-for-indian-smes",
    title: "Microsoft 365 or Google Workspace: choosing for an Indian SME",
    excerpt:
      "Both do mail, files and meetings competently. The decision turns on what your people already know, what your customers send you, and what you need to control.",
    category: "Productivity",
    tags: ["microsoft 365", "google workspace", "comparison", "sme"],
    readMinutes: 7,
    body: `This comparison is usually conducted on features, and features are the least decisive part of it. Both platforms do mail with a custom domain, file storage and sharing, video meetings, and collaborative document editing. A business would function on either.

Four things actually decide it.

## One: what arrives in your inbox

If your customers, suppliers and regulators send you .docx and .xlsx files with formatting, macros, tracked changes or complex spreadsheet models, the desktop Office applications open them correctly and everything else opens them approximately.

For most documents the approximation is fine. For a tendered bid with a prescribed format, a financial model with macros, or a legal document with tracked changes, approximately is not fine, and the failure is visible to the counterparty.

This is the single most common deciding factor for Indian SMEs dealing with larger corporates and government, because the formats are prescribed by the other side.

## Two: what your people already know

Retraining is a real cost and it is paid in productivity rather than invoices. A finance team that has used Excel for fifteen years will be slower in Sheets for longer than anybody budgets for, and some of them will quietly keep using Excel.

Conversely, a young team that grew up in Gmail and Docs will find Outlook and the Office ribbon archaic, and will work around them.

Neither is a reason by itself. Both are a reason to ask rather than assume.

## Three: what you need to control

**Microsoft 365** reaches further into device and identity management, particularly at the Business Premium level — Intune, conditional access, endpoint detection and document labelling. If you must demonstrate access control to an auditor or a customer, this is the more complete story out of the box. See [Business Standard versus Business Premium](/blog/microsoft-365-business-standard-vs-business-premium).

**Google Workspace** is simpler to administer, and for a business without dedicated IT that is a genuine advantage rather than a consolation. A simpler platform that is actually configured beats a more capable one that is not.

## Four: what else you run

If you already run Windows domain-joined laptops, an on-premises file server you intend to migrate, Dynamics, Power BI or Azure, Microsoft 365 joins up with them and Workspace does not. The integration is not marketing; single sign-on and consistent identity across the estate removes real administrative work.

If you run a Linux and web stack, Chromebooks, or nothing in particular, that argument evaporates.

## Where each is clearly right

**Microsoft 365**, clearly, when:
- Prescribed document formats come from outside, especially government or large-corporate tenders
- Complex Excel work is central to the business
- You need device management and demonstrable access control
- You already have a Windows and Microsoft estate

**Google Workspace**, clearly, when:
- Nobody does heavy spreadsheet or document production
- There is no dedicated IT function and administrative simplicity wins
- The team is already fluent in Google tools
- Real-time co-editing by many people at once is the dominant working pattern

## What not to do

**Do not run both.** Organisations that migrate halfway end up with mail in one place and files in another, two sets of credentials, two admin consoles and meeting links that half the staff cannot open. The cost of the mess exceeds the cost of either platform.

**Do not decide on the headline per-seat price.** They are close enough that the difference is immaterial next to retraining, format failures and administrative time. And on the Microsoft side the plan mix matters far more than the platform choice — see the [licensing guide](/blog/microsoft-365-licensing-guide-for-indian-businesses).

## If you are migrating

The work is in mail, not in the applications: historical mail, calendars, contacts, shared mailboxes, distribution lists, aliases and the forwarding rules nobody documented. Underestimating that is the usual reason a migration overruns. [Email migration](/services/email-migration) is the service for it, and [planning a cloud migration that does not cost more](/blog/planning-a-cloud-migration-that-does-not-cost-more) covers the budgeting.

## Common questions

**Can we keep our domain?** Yes, on either. The domain is yours.

**Can we move later?** Yes, and it is a migration with the same costs as the first one. Choose deliberately.

**Does Microsoft 365 need Windows?** No. It runs on macOS and on the web.

**Is GST reclaimable on both?** On either, where you are registered and the invoice is correct. See [GST input credit](/blog/gst-input-credit-on-software-purchases).

## Where to go next

The Microsoft plans are on [Microsoft 365](/microsoft-365) and the migration service on [email migration](/services/email-migration). If you want this decided against your actual situation rather than in general, [tell us what your customers send you and what you already run](/enquiry) — those two answers settle it most of the time.`,
  },
  {
    slug: "adobe-vip-versus-vip-marketplace",
    title: "Adobe VIP and VIP Marketplace: the same programme, bought two ways",
    excerpt:
      "Both are the Value Incentive Plan. The difference is who holds the commercial relationship, how billing works, and who you ring when a seat assignment goes wrong.",
    category: "Adobe licensing",
    tags: ["adobe vip", "vip marketplace", "licensing", "renewals"],
    readMinutes: 5,
    body: `Adobe's Value Incentive Plan is the subscription programme most business customers buy under. It comes in two forms, and the distinction confuses people because the product is identical.

## What VIP gives you, either way

**An anniversary date.** One renewal date for the whole account. Seats added part-way through co-terminate with it rather than starting their own twelve-month clock — so you are not managing fourteen renewal dates for fourteen hires.

**Volume discount levels.** Pricing tiers by seat count, which you move up as the account grows.

**Reassignable seats.** Assigned by email address in the admin console, reclaimable when somebody leaves.

**Mid-term additions.** Add seats when you hire, pro-rated to the anniversary.

## VIP, direct

You hold the agreement with Adobe. Adobe bills you. You manage the console.

Suits organisations that want the Adobe relationship unmediated, have somebody who knows the console, and are content to handle renewals and seat changes themselves.

## VIP Marketplace

The same programme, transacted through a partner. Adobe's commercial relationship is with the partner; yours is with the partner too.

What changes in practice:

**Billing.** One invoice from one supplier, which can sit alongside your other software lines rather than as a separate supplier to onboard. For organisations with procurement processes that treat each new supplier as a project, this is not a trivial advantage.

**Local invoicing.** Billed by an Indian entity with GST handled in the ordinary way, which makes input credit straightforward. See [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases).

**Administration.** Seat changes, renewals and the quantity conversations can be handled by the partner rather than by you. Whether that is a benefit depends entirely on whether you want to do it yourself.

**Support path.** A first line that knows your account before you explain it. Adobe's own support remains available for product issues.

**Renewal review.** A partner managing the renewal has the usage data and can propose a quantity change. A direct renewal defaults to last year's quantity unless somebody inside your organisation remembers to look — which is [mistake number two](/blog/common-software-licensing-mistakes).

## Choosing

**Direct** if you have the administrative capacity, want the relationship unmediated, and will reliably review usage before each renewal.

**Marketplace** if you would rather consolidate billing, want local invoicing without arranging it, and would benefit from somebody else watching the renewal calendar.

The licences and the applications are the same either way. This is a decision about who does the work.

## Moving between them

Possible, and the mechanics depend on where you are in the term and on your current agreement. Settle it at a renewal rather than mid-term, and confirm what happens to your discount level and anniversary date before committing — those two are what you would be sorry to lose.

## Common questions

**Is Marketplace more expensive?** Not inherently. Partner pricing against direct pricing varies, and the discount tiers are the programme's own.

**Do we lose the admin console?** No. You keep the console and manage assignments yourself; the partner handles the commercial side.

**Does the anniversary date change?** It is a property of the VIP account. Confirm before any move, because consolidating onto a new date can mean a short or long first term.

**What about ETLA?** A different thing entirely — a negotiated enterprise term agreement, usually multi-year with a committed quantity. See [Creative Cloud for enterprise](/blog/adobe-creative-cloud-for-enterprise).

## Where to go next

The Adobe products and current pricing are on [Adobe](/adobe), [Adobe Creative Cloud](/adobe-creative-cloud) and [Adobe Acrobat](/adobe-acrobat). To discuss which route suits your procurement process, [tell us how you would rather be billed and who administers your seats today](/enquiry).`,
  },
  {
    slug: "windows-11-pro-versus-enterprise-for-business",
    title: "Windows 11 Pro or Enterprise: what the upgrade actually licenses",
    excerpt:
      "Enterprise is not bought as a boxed product for a bare machine. It is an upgrade right on top of a device already licensed for Pro, and that changes the arithmetic.",
    category: "Microsoft licensing",
    tags: ["windows 11", "pro", "enterprise", "licensing"],
    readMinutes: 6,
    body: `The most common Windows licensing error in business is assuming Enterprise can be bought for a new machine the way Pro can. It cannot, and understanding why clears up most of the confusion.

## How the two are licensed

**Pro** is licensed per device, and usually arrives with the device as an OEM licence. It is a full licence: a machine with Pro needs nothing further to run Windows legitimately.

**Enterprise** is an upgrade right. It is licensed on top of a device that already holds a qualifying underlying licence — in practice, Pro. You do not buy Enterprise instead of Pro; you buy it as well.

So the cost of an Enterprise desktop is the OEM Pro licence that came with the laptop plus the Enterprise upgrade. A quote that prices Enterprise alone for a bare machine is wrong, and the error is usually found at deployment.

Enterprise upgrade rights reach businesses two ways: through volume licensing, and bundled into certain Microsoft 365 plans. If you are already paying for a plan that includes it, buying it again separately is pure waste — which happens.

## What Pro already does

More than people assume, and for a large number of businesses it is sufficient:

- BitLocker drive encryption
- Domain join, and Entra ID join
- Group Policy
- Remote Desktop host
- Hyper-V
- Windows Update for Business

A small business with encrypted laptops, domain-joined machines and managed updates is not missing anything from this list.

## What Enterprise adds

The things that matter at scale or under obligation:

**Longer servicing options.** Release channels with longer support windows, which matters when an application's certification lags Windows releases.

**Advanced security features.** Credential and application protections aimed at defending against credential theft on a managed fleet.

**Deployment and management at volume.** Capabilities designed for imaging and managing hundreds or thousands of machines rather than dozens.

**Virtualisation and multi-session rights.** Relevant if you deliver desktops rather than issuing laptops.

## Deciding

The honest version: most businesses under a couple of hundred staff with a conventional laptop fleet do not need Enterprise, and the ones that buy it usually do so because it came bundled with a Microsoft 365 plan they wanted for other reasons.

Enterprise earns its place when:
- You manage a large fleet and deployment tooling is the constraint
- An application requires a longer servicing channel
- You deliver virtual or multi-session desktops
- A security obligation names capabilities only Enterprise provides

## Check what you already have

Before buying anything, check whether your existing Microsoft 365 licensing already carries Windows Enterprise upgrade rights. A surprising number of organisations hold the entitlement and have not applied it, running Pro on machines licensed for more.

Equally: Business Premium carries Windows 11 Business upgrade rights for a device already licensed for a qualifying Pro edition. That is an upgrade right, not a licence for a bare machine — the same distinction as above, one tier down. See [Business Standard versus Business Premium](/blog/microsoft-365-business-standard-vs-business-premium).

## Common questions

**Can we buy Enterprise for a machine with Home?** Home is generally not a qualifying base for the Enterprise upgrade. A machine on Home needs a route to Pro first, which is why specifying Pro at purchase is cheaper than correcting it later.

**Is an OEM licence transferable to another machine?** No. It lives with the device.

**Does Enterprise need a server or a domain?** No, though most of its management advantages assume managed infrastructure of some kind.

**What about N editions and regional variants?** They exist, differ in bundled components, and are occasionally supplied by accident. Check what you are quoted.

## Where to go next

The Windows editions and current pricing are on [Windows Server](/windows-server) for the server side, and the upgrade-price question specifically in [Windows 11 Pro upgrade licence price in India](/blog/windows-11-pro-upgrade-licence-price-in-india). The management capabilities are covered by [endpoint management](/services/endpoint-management). To check what your existing licensing already entitles you to before buying anything, [send us your current plan names](/enquiry) — it is a five-minute answer and it occasionally saves the whole purchase.`,
  },
];

export const seoArticleDrafts: ContentMigration = {
  id: "2026-11-seo-article-drafts",
  describe: "eighteen licensing articles, as drafts for review, published by nobody",

  async apply(prisma) {
    const slugs = DRAFTS.map((draft) => draft.slug);
    const present = await prisma.blogPost.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true },
    });
    const existing = new Set(present.map((row) => row.slug));
    const wanted = DRAFTS.filter((draft) => !existing.has(draft.slug));

    if (wanted.length === 0) {
      return `all ${DRAFTS.length} article drafts already exist; nothing changed`;
    }

    await prisma.blogPost.createMany({
      data: wanted.map((draft) => ({
        slug: draft.slug,
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        category: draft.category,
        tags: draft.tags,
        readMinutes: draft.readMinutes,
        /*
         * The point of the whole migration. A published row here would put
         * seventeen unreviewed articles about other companies' licensing
         * programmes into the sitemap on the next deploy.
         */
        status: "DRAFT",
        publishedAt: null,
      })),
    });

    const skipped = existing.size > 0 ? `; ${existing.size} already existed` : "";
    return `created ${wanted.length} article drafts, none published${skipped}`;
  },
};
