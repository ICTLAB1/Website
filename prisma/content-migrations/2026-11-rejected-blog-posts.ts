import type { ContentMigration } from "./types";

/**
 * Five articles Google crawled and declined to index.
 *
 * "Crawled, currently not indexed" usually means a page looks thin, looks like
 * another page, or looks unimportant. These five had a real structure but ran to
 * 750 to 860 words, kept their questions as plain body text (so no FAQ markup),
 * and two of them overlapped the pages they were written to support. What this
 * does, per article:
 *
 * - opens with a two-to-three sentence answer to the question in the title, an
 *   "Updated November 2026" line and a table;
 * - adds the India-specific detail a buyer can act on (GST, paperwork, the route
 *   and the order of steps), in sections that do not repeat the original;
 * - moves the inline "Common questions" into real FAQ rows (so the page carries
 *   FAQPage markup) and adds to them;
 * - ends with a "Get a quote" call to action and links to the matching pages.
 *
 * ## What it will not do
 *
 * Replace a body someone has edited. Everything is additive and keyed on a marker
 * string, so a body that already carries the new material, or that has been
 * rewritten, is left alone, and running it twice changes nothing. The two removals
 * (the inline questions and one overlapping list) happen only where the text
 * matches exactly.
 *
 * Prices are `{{price:slug}}` tokens, resolved from the catalogue when the page
 * renders. Rules and thresholds that change (GFR limits, Microsoft's programmes)
 * are described in general terms and point the reader to the current source.
 */

type Spec = {
  slug: string;
  /** Prepended: the answer, the updated line and the table. */
  top: string;
  /** Inserted before "## Where to go next" (or appended). Its first heading is the marker. */
  middle: string;
  /** Appended at the end. */
  cta: string;
  /** Heading the middle block goes before; defaults to "## Where to go next". */
  anchor?: string;
  /** Exact text removed if present. */
  remove?: RegExp[];
  faqs: Array<{ question: string; answer: string }>;
};

const UPDATED = "*Updated November 2026.*";
const CTA_MARK = "## Get a quote";

const SPECS: Spec[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: "how-to-buy-genuine-microsoft-licences-in-india",
    top: `**The short answer:** buy Microsoft licences through a channel you can name, and keep the paperwork that proves it. For Microsoft 365 and Azure that is a Cloud Solution Provider (CSP) partner who provisions the subscription into your own tenant; for perpetual products such as Office LTSC or Windows Server it is a volume-licensing reseller. A key sold far below the usual price is almost always a volume, OEM, regional or academic key that is not licensed to you. ${UPDATED}

| Route | Best for | What you receive | Proof you hold | Who you call at renewal |
| --- | --- | --- | --- | --- |
| CSP partner | Microsoft 365, Azure, other subscriptions | A subscription inside your own tenant | GST invoice in your name; the partner relationship shown in your admin centre | Your partner |
| Volume licensing reseller | Perpetual products, larger estates | Licences under an agreement in your organisation's name | Invoice, agreement or enrolment number, licensing portal access | Your reseller |
| Direct from Microsoft | Organisations with their own licensing team | A subscription or agreement held with Microsoft | Microsoft's own billing records | Microsoft |
| OEM, with new hardware | Windows on a new PC or server | A licence tied to that machine | Invoice naming the machine; the licence label | The hardware supplier |
| A loose key from a marketplace | Nobody | A key with no named channel | Nothing that survives a review | Nobody |
`,
    middle: `## Reference prices on this site

Before you judge a price as too good, compare it with the catalogue. These are the prices on this site, excluding GST, for products people most often buy on a loose key:

| Product | Price excluding GST |
| --- | --- |
| [Microsoft 365 Business Standard](/products/microsoft-365-business-standard), per user per year | {{price:microsoft-365-business-standard}} |
| [Microsoft 365 Business Premium](/products/microsoft-365-business-premium), per user per year | {{price:microsoft-365-business-premium}} |
| [Office LTSC Professional Plus 2024](/products/microsoft-office-ltsc-professional-plus-2024), one time, per device | {{price:microsoft-office-ltsc-professional-plus-2024}} |
| [Windows 11 Pro upgrade](/products/windows-11-pro-upgrade), per device | {{price:windows-11-pro-upgrade}} |

Prices are tentative and a written quotation fixes the final figure. A key offered at a small fraction of these figures is not the same product at a discount.

## What a buyer in India should receive

Four documents, every time, whichever route you use:

1. **A GST tax invoice in your organisation's name and GSTIN.** Software is supplied on a GST invoice at 18%. The invoice is what lets a registered business claim input tax credit; see [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases). An invoice raised to an individual, or to a trading name you do not use, causes problems at the next audit.
2. **A purchase order and an order confirmation** naming the product, quantity, term and the supplier.
3. **Proof of the licence itself.** For a subscription, the subscription appears in your Microsoft 365 admin centre under billing. For a volume licence, the agreement or enrolment number and access to the licensing portal. For OEM, the invoice that names the machine.
4. **A named renewal date,** recorded where a person will look before it passes.

A product key alone is none of these. If the only thing you hold is a key, you hold an activation, not a licence.

## Seven checks before you pay

- Ask which channel the licence is supplied through and have the answer in writing.
- Ask whether it will be provisioned into your tenant with you as the owner.
- Check the invoice will carry your GSTIN and your registered name.
- Ask what happens if you want to move to another partner at renewal. Moving a CSP subscription is an administrative change and your data stays where it is.
- Be suspicious of a price far below the catalogue, a key that arrives by message with no invoice, and a seller who will not name a channel.
- Check the licence type matches the use: an academic or non-profit licence is not valid for a commercial company.
- Keep every document together, with the date you bought.

## If you have already bought a loose key

Do not panic and do not delete anything. Record what you have, find which products and how many seats are affected, and replace them with licences from a named channel over the next renewal cycle or sooner for anything business-critical. Buying a shortfall on your own initiative is a different conversation from being found with one. If you need the estate reconciled, [software asset management](/services/software-asset-management) does that, and our guide to [preparing for a software licence audit](/blog/preparing-for-a-software-licence-audit) sets out the evidence an auditor asks for.

## Government and public-sector buyers

The same four documents apply, with extra steps for the route and the specification. That is a different question, and it is covered in [how government departments and PSUs procure genuine software](/blog/how-government-departments-procure-genuine-software).
`,
    cta: `

## Get a quote

If you want Microsoft licences supplied through a named channel, on a GST invoice in your company's name, [send us the products and quantities](/enquiry) and we will return a written quotation. See also [Microsoft 365](/microsoft-365) and the [price list](/price-list).`,
    remove: [/\n## Common questions[\s\S]*?(?=\n## )/],
    faqs: [
      {
        question: "Is a Microsoft licence bought on a marketplace genuine?",
        answer:
          "Sometimes. The channel is the issue, not the storefront. Ask which channel the licence is supplied through, whether it will be provisioned into your own tenant, and what invoice and proof of licence you will receive. A seller who cannot answer is not selling you what you think.",
      },
      {
        question: "Does a GST invoice prove a Microsoft licence is genuine?",
        answer:
          "No. A GST invoice proves a transaction took place and lets a registered business claim input tax credit. It says nothing about where the licence came from, so you also need the proof of licence: the subscription in your admin centre, or the agreement or enrolment number for a volume licence.",
      },
      {
        question: "What is a Cloud Solution Provider (CSP)?",
        answer:
          "A CSP is a Microsoft partner who sells and supports subscriptions such as Microsoft 365 and Azure. The subscription sits in your own tenant, you own the tenant and its data, and the partner relationship is visible in your admin centre where you can review or end it.",
      },
      {
        question: "Why are some Microsoft keys so cheap?",
        answer:
          "Most cheap keys are volume keys issued under someone else's agreement, keys from another region, OEM keys detached from their machine, academic keys used commercially, or keys that were never issued. They may activate for months and still fail a licence review or be deactivated.",
      },
      {
        question: "We inherited an estate with no records. Where do we start?",
        answer:
          "Count installations first, then reconcile them against whatever purchase records exist. Where there is a genuine gap, buying the shortfall on your own initiative costs the licence price, which is far less than being found with it.",
      },
      {
        question: "Can we move our Microsoft 365 subscription to another partner?",
        answer:
          "Yes. Moving the billing relationship to a CSP is an administrative change. Your tenant, data, configuration and users are unaffected and there is no downtime.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "how-government-departments-procure-genuine-software",
    top: `**The short answer:** most central and state departments buy standard software through the Government e-Marketplace (GeM), and use a competitive route when the value passes the thresholds in the General Financial Rules (GFR) and their own delegation of powers. The specification matters more than the route: state the requirement, the licence basis and the term rather than a brand name, so that bids can be compared. Afterwards the department should hold the invoice, purchase order, acceptance record and proof of licence. ${UPDATED}

| Route | Typically used for | What the department must specify | What it holds afterwards |
| --- | --- | --- | --- |
| GeM catalogue purchase | Standard licences with a listed item | The item, quantity, term and licence basis | GeM order, invoice, acceptance record |
| GeM bid or reverse auction | Higher-value or less standard requirements | A full specification and evaluation basis | Bid documents, order, invoice, acceptance |
| Departmental tender | Licences bundled with services such as migration or support | Scope, licence basis, support, compliance evidence | Tender file, agreement, invoice, acceptance |
| Rate contract or framework | Items an agreement already covers | Confirmation the item is covered | Order under the agreement, invoice |
| Direct from a publisher | Rare, for specific needs | Settle invoicing and GST before payment | Publisher agreement, invoice, receipts |

Thresholds between these routes are set by rule and have changed. Confirm the current figures against the GFR and your own delegation of financial powers.
`,
    middle: `## A procurement in nine steps

The order matters, because most avoidable failures come from choosing the route before the requirement is written.

1. **Write the requirement,** in terms of what the software must do, not whose it is.
2. **Decide the licence basis:** per named user, per device or per core, and whether the term is perpetual, one year or three.
3. **Count by licence type, not by headcount.** Named-user software needs a count of people; server software needs a count of cores and of people or devices that connect.
4. **Decide what is included:** support, deployment, renewal.
5. **Check the value against your thresholds** to see which route applies.
6. **Check whether the item is already on GeM or on an existing framework.** If it is, using it is usually quicker and easier to defend.
7. **Issue the order or bid,** with the specification as written in step one.
8. **Record acceptance,** against the delivered licences and the licence proof, before payment.
9. **Record the renewal date** in the department's calendar and in next year's budget.

## Wording that survives a challenge

| Weak wording | Why it fails | Better wording |
| --- | --- | --- |
| "Supply Microsoft Office" | Names a brand, invites a challenge | "Supply an office productivity suite able to open and save .docx, .xlsx and .pptx files, with the following features" |
| "100 licences of design software" | Mixes perpetual, one-year and three-year quotes | "100 named-user subscriptions, three-year term, with support included" |
| "Windows Server with 50 users" | Omits cores and client access licences | "Server operating system licences for N physical cores, with client access licences for M users" |
| "Latest version" | Open to interpretation | "A version in mainstream support at the date of the order" |
| "Genuine software" | Says nothing testable | "Licences supplied through a channel named in the bid, with licence proof and an invoice in the department's name" |

Where a specific product genuinely is required, because of file-format compatibility with an archive or certification of an existing process, record the justification in the file at the time. Reconstructing it later is difficult.

## What suppliers are usually asked for

Expect a bid or a GeM order to ask for a GST registration, evidence of the supplier's standing on the channel, and for publisher software, sometimes a letter from the publisher or its distributor confirming the supplier may sell it. Ask for the requirement early, because a letter can take time. If you are the department, state in the bid which documents you want delivered with the licences.

## Specific points for software

- **Budget the renewal.** A perpetual purchase has no renewal. A subscription renews every year, and if it is not budgeted the software stops.
- **Do not forget client access licences** on server purchases. See [Windows Server 2025 licensing explained](/blog/windows-server-2025-licensing-explained).
- **Check eligibility for academic pricing.** A public body is not automatically an academic institution.
- **Multi-year terms** are often cheaper, but whether a department may commit across financial years is a question for its own rules.

## How this differs from the question of genuineness

This guide is about the route and the specification. How to be sure the licence itself is genuine, whichever route you used, is a separate question: see [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india). An audit, a CAG query or a successor officer may ask for the evidence; see [preparing for a software licence audit](/blog/preparing-for-a-software-licence-audit).
`,
    cta: `

## Get a quote

If you are drafting a specification or a bid for licences, [send us the draft](/enquiry): the licence basis, term and quantity lines are where we can help most, and they are the hardest to fix once bids are open. For the GeM channel see [GeM software supply](/gem-software-supplier), and for how we work with departments see [government and PSU](/industries/government-psu).`,
    remove: [/\n## Common questions[\s\S]*?(?=\n## )/],
    faqs: [
      {
        question: "Can a government department buy software through GeM?",
        answer:
          "Yes. GeM is the default channel for central and state government purchases. For standard software licences, where the item is defined, a catalogue purchase or a bid on GeM is usually the straightforward route. Confirm the rules for your department's value and delegation of powers.",
      },
      {
        question: "Does GeM guarantee the licence is genuine?",
        answer:
          "No. GeM is a procurement channel, not a check on where a licence came from. Genuineness is established by the documents: an invoice in the department's name, the purchase order, acceptance record and proof of licence, such as the agreement or enrolment number.",
      },
      {
        question: "What should a software specification say?",
        answer:
          "The requirement, the licence basis (named user, device or core), the term, the quantity by licence type, what is included such as support and deployment, and the compliance evidence required. Avoid naming a product unless it is genuinely required, and record the reason in the file if so.",
      },
      {
        question: "Can a department buy software directly from a publisher abroad?",
        answer:
          "It can, but questions arise about invoicing, GST and whether a local entity is needed for payment to be processed. Settle them before the bid rather than at payment.",
      },
      {
        question: "Can subscriptions be bought for several years at a time?",
        answer:
          "Frequently yes, and it is often cheaper. Whether a department may commit across financial years is a question for its own financial rules.",
      },
      {
        question: "What documents should the department keep?",
        answer:
          "The invoice in the department's name, the purchase order and acceptance record, the agreement or enrolment number for volume licences, the licence term and renewal date, and an assignment record of which licences are deployed where.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "windows-server-2025-licensing-explained",
    top: `**The short answer:** Windows Server 2025 is licensed by the physical cores in the server, with a minimum of eight cores per processor and sixteen per server, plus a Client Access Licence (CAL) for each user or device that connects. Standard edition covers two virtual machines on a fully licensed server and Datacenter covers an unlimited number, so the choice between them is a count of virtual machines. ${UPDATED}

| Servers | Cores you must license | Standard: virtual machines covered | Datacenter |
| --- | --- | --- | --- |
| 1 processor, 8 cores | 16 (server minimum) | 2 | Unlimited |
| 1 processor, 16 cores | 16 | 2 | Unlimited |
| 2 processors, 8 cores each | 16 | 2 | Unlimited |
| 2 processors, 12 cores each | 24 | 2 | Unlimited |
| 2 processors, 16 cores each | 32 | 2 | Unlimited |

To run more virtual machines under Standard you license the same cores again: each full set adds two. The arithmetic is the whole decision.
`,
    middle: `## Worked example: the cores and the CALs together

A company buys one server with two processors of twelve cores each, to run a file server, a domain controller and an accounts application as virtual machines, for forty staff who each use a laptop and a phone.

1. **Cores:** two processors of twelve cores is 24 cores. That is above the minimums, so 24 cores are licensed.
2. **Edition:** three virtual machines is more than the two a single Standard set covers, so Standard needs the 24 cores licensed twice. Datacenter would cover them with one set. Compare the two totals before choosing.
3. **CALs:** forty people each use more than one device, so forty **user** CALs cover them all. Forty device CALs would not.
4. **Remote access:** if staff connect to remote desktop sessions on the server, each also needs a Remote Desktop Services CAL, on top of the ordinary one.

A quote that shows only the first step is not a quote for a working server.

## Prices on this site

Windows Server is sold in packs. The lowest listed prices on this site, excluding GST, are:

| Item | Price excluding GST |
| --- | --- |
| [Windows Server 2025 Standard](/products/windows-server-2025-standard), 2-core pack | {{price:windows-server-2025-standard}} |
| [Windows Server 2025 Datacenter](/products/windows-server-2025-datacenter), 2-core pack | {{price:windows-server-2025-datacenter}} |
| [Windows Server user CAL](/products/windows-server-cal-user), per user | {{price:windows-server-cal-user}} |

Prices are tentative and a written quotation fixes the final figure. Our article on the [Windows Server 2025 core licence price in India](/blog/windows-server-2025-core-licence-price-in-india) goes through the pack arithmetic.

## Buying notes for India

- **GST.** Server licences are supplied on a GST invoice at 18%, in your registered name, which lets a registered business claim input tax credit. See [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases).
- **Volume licence or OEM.** Perpetual server licences are bought through a volume-licensing reseller, or with the hardware as an OEM licence tied to that server. An OEM licence cannot be moved to another machine. Decide which you are buying before you compare quotes, and see [data centre solutions](/data-centre-solutions) for what to specify with the hardware.
- **Proof.** Keep the invoice, the agreement or enrolment number and the licensing portal access. See [preparing for a software licence audit](/blog/preparing-for-a-software-licence-audit).
- **Public-sector buyers.** State the core count and the CAL count on the order, not only "Windows Server". See [how government departments procure software](/blog/how-government-departments-procure-genuine-software).
- **Other licences on the same server.** SQL Server has its own rules; see [SQL Server licensing](/sql-server).

## A checklist before you order

- How many physical processors, and how many cores in each?
- How many virtual machines will run on this host now, and in three years?
- Who and what connects: people, devices, or both? Do any connect from outside the organisation?
- Does anything need Remote Desktop Services?
- Are existing CALs the same version as the new server?
- Will the workload move to a hosted environment?
- Is the licence volume or OEM?
`,
    cta: `

## Get a quote

[Send us the processor and core count, the virtual machine plan and who will connect](/enquiry) and we will quote cores, CALs and the edition together, on a GST invoice. See the [Windows Server page](/windows-server) for the editions.`,
    remove: [/\n## Common questions[\s\S]*?(?=\n## )/],
    faqs: [
      {
        question: "Does a passive failover server need a Windows Server licence?",
        answer:
          "There are rights covering a cold standby under certain conditions, and they depend on how the standby is set up and on Software Assurance. Settle it explicitly: 'it is only a failover' is not by itself an answer.",
      },
      {
        question: "Can we use an older version of Windows Server under a 2025 licence?",
        answer:
          "Downgrade rights generally exist under volume licensing, which matters when an application is not yet certified for 2025. Check the terms of your agreement.",
      },
      {
        question: "Is the number of CALs the same as our headcount?",
        answer:
          "Only if everyone connects. Count the people or devices that actually access the server. Choose user CALs where people have several devices and device CALs for shared machines used in shifts.",
      },
      {
        question: "What is the minimum number of cores I have to license?",
        answer:
          "Eight cores per physical processor and sixteen per server, whichever is higher. A small server is licensed at the minimum rather than at the cores it contains.",
      },
      {
        question: "When is Datacenter cheaper than Standard?",
        answer:
          "When you run enough virtual machines on one host that licensing Standard repeatedly costs more than Datacenter once. Count the virtual machines, work out how many times you would license the cores under Standard, and compare the totals. A single-purpose file server never reaches that point.",
      },
      {
        question: "Do old CALs work with Windows Server 2025?",
        answer:
          "Generally not. CALs must match or exceed the server version, so a 2025 server needs 2025 CALs. This is the line most often missed in a server refresh.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "preparing-for-a-software-licence-audit",
    top: `**The short answer:** prepare by reconciling what is installed against what you can prove you own, product by product and licence type by licence type, before anyone asks. Close any shortfall on your own initiative, and keep one register holding invoices, agreement numbers, terms and who each licence is assigned to. An audit asks "show me", not "are you licensed". ${UPDATED}

| Evidence an auditor asks for | What it proves | Where it usually lives | The common gap |
| --- | --- | --- | --- |
| Installation list | What is actually running | Discovery tooling or a manual survey | The machine nobody remembered |
| Invoices in your organisation's name | That you bought it | Finance, email, a former employee's mailbox | Bought by a person, billed to an individual |
| Agreement or enrolment number | That a volume licence is yours | The publisher's licensing portal | Portal access held by someone who left |
| Licence terms and quantities | What you are entitled to | The register, if there is one | No register |
| Assignment record | Who or what each licence covers | The register | Licences assigned to leavers |
| Disposal record | Where retired devices went | IT asset records | Software left on a disposed laptop |
`,
    middle: `## A ninety-day plan

| Weeks | What to do | Output |
| --- | --- | --- |
| 1 to 2 | Name an owner. List the products in scope: start with the ones that cost most and the ones with the strictest terms | A scope list and an owner |
| 3 to 6 | Inventory installations. Gather invoices, agreements and portal access for each product | Two lists: installed and entitled |
| 7 to 8 | Reconcile per product and per licence type. Mark under-licensed and over-licensed | A gap table |
| 9 to 12 | Buy shortfalls, reclaim unused licences, write the register and calendar | A register and a renewal calendar |

## India-specific points

- **Your GST invoice is your first piece of evidence.** It must be in the organisation's registered name and carry its GSTIN. Licences bought on an individual's card or in a trading name you no longer use are the commonest reason evidence cannot be produced.
- **Keep the records for as long as the law requires.** GST law requires business records to be kept for a set period, and company law has its own period for books of account. Ask your accountant for the current periods and apply the longer one to your licence records.
- **Unlicensed use is not only a commercial matter.** The Copyright Act, 1957 treats the knowing use of an infringing copy of a computer programme as an offence. The detail is for your counsel; the practical point is that evidence of having tried to comply matters.
- **Where the audit comes from.** A publisher exercising a clause in your agreement, a customer's supplier-assurance review, a tender asking for compliance evidence, or an internal or statutory audit. Read your agreements to see which audit rights you have already granted.
- **Public bodies** should also be ready for audit queries from their own oversight; see [how government departments procure software](/blog/how-government-departments-procure-genuine-software).

## Under-licensed or over-licensed: two different problems

An **under-licensed** product has installations with no entitlement. That is the exposure, and buying the shortfall before an audit finds it costs the licence price. An **over-licensed** product has entitlements nobody uses, which is money already spent. Most first reconciliations find both, and the second is usually the larger number. Our note on [the hidden cost of unused licences](/blog/hidden-cost-of-unused-software-licences) covers it.

## Start where the risk is

1. **Server and database products.** [Windows Server 2025](/blog/windows-server-2025-licensing-explained) and SQL Server are counted by cores and by users or devices, and are the products most often short. See [SQL Server](/sql-server).
2. **Design and engineering software.** Named-user licences used by more than one person, and the difference between subscription types. See [AutoCAD](/autocad) and [Autodesk licensing](/autodesk-licensing).
3. **Microsoft 365.** Check assigned seats against active users, and check who the subscription was bought from; see [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india).
4. **Adobe.** Named-user assignments for leavers. See [Adobe licensing](/adobe-licensing).

## Who owns it

One named person, with a deputy. Portal credentials recorded against a role, not an individual, so that a resignation does not lock you out of the evidence.
`,
    cta: `

## Get a quote

To start with a reconciliation, [send us your licence list](/enquiry) and we will tell you where the gaps and the savings are before recommending anything new. See [software asset management](/services/software-asset-management) and [licence management](/services/licence-management).`,
    remove: [/\n## Common questions[\s\S]*?(?=\n## )/],
    faqs: [
      {
        question: "Can we refuse a software licence audit?",
        answer:
          "Volume licensing agreements generally contain an audit clause you have already agreed to. Read your own agreements to see which audit rights apply and what notice they require.",
      },
      {
        question: "What should we do if we find a licence shortfall?",
        answer:
          "Close it on your own initiative and keep a record that you did. A gap found and fixed is a very different conversation from a gap found by an auditor.",
      },
      {
        question: "Does the publisher's portal show everything we own?",
        answer:
          "For subscriptions bought through current channels, largely yes. For older perpetual purchases, often not, which is why your own invoices and agreement numbers matter.",
      },
      {
        question: "How often should we reconcile our software licences?",
        answer:
          "At least once a year and before any renewal of consequence. An estate reconciled two years ago is wrong now, because people have joined, left and changed roles.",
      },
      {
        question: "Who should own the licence register?",
        answer:
          "One named person with a deputy. Shared ownership of a register means no ownership, which is how registers go stale.",
      },
      {
        question: "What records do we need for a software audit in India?",
        answer:
          "GST invoices in the organisation's name and GSTIN, purchase orders, agreement or enrolment numbers, licence terms and quantities, an assignment record, and disposal records. Ask your accountant how long business records must be kept and apply the longer period.",
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "microsoft-office-ltsc-2024-vs-microsoft-365",
    top: `**The short answer:** for a normal office where people use email, Teams and shared files, Microsoft 365 Business Standard is the better choice. Office LTSC Professional Plus 2024 costs less per device but includes none of the cloud services, and it exists for fixed, offline or validated machines. This article compares the cost and the buying decision; for the situations where LTSC is the right product, see the [Office LTSC page](/microsoft-office-ltsc). ${UPDATED}

| | Office LTSC Professional Plus 2024 | Microsoft 365 Business Standard |
| --- | --- | --- |
| Price excluding GST | {{price:microsoft-office-ltsc-professional-plus-2024}} one time, per device | {{price:microsoft-365-business-standard}} per user per year |
| Licensed to | A device | A named user |
| Email, Teams, 1 TB OneDrive | Not included | Included |
| Feature updates | None | Continuous |
| Replacement event | A project at the end of the supported life | None |
| Accounting | Capital purchase | Operating expense |
| Best for | Fixed-function or isolated machines | People who work with mail, files and colleagues |
`,
    middle: `## Buying notes for India

- **GST.** Both are supplied on a GST invoice at 18%. A registered business can claim input tax credit on either; see [GST input credit on software purchases](/blog/gst-input-credit-on-software-purchases).
- **Route.** Microsoft 365 is a subscription bought through a CSP partner and provisioned into your tenant. Office LTSC is a perpetual volume licence bought through a volume-licensing reseller. See [how to buy genuine Microsoft licences in India](/blog/how-to-buy-genuine-microsoft-licences-in-india) for what to hold afterwards.
- **Proof.** For the subscription, the billing record in your admin centre. For LTSC, the invoice, the agreement or enrolment number and the portal access. An auditor will ask; see [preparing for a software licence audit](/blog/preparing-for-a-software-licence-audit).
- **Public-sector buyers.** State the licence basis (per device or per user) and the term on the order. See [how government departments procure software](/blog/how-government-departments-procure-genuine-software).
`,
    cta: `

## Get a quote

Tell us how many devices and how many people, and [we will quote the estate as one](/enquiry), on a GST invoice. Products: [Office LTSC Professional Plus 2024](/products/microsoft-office-ltsc-professional-plus-2024) and [Microsoft 365 Business Standard](/products/microsoft-365-business-standard).`,
    anchor: "\n## A decision rule you can write on one page",
    faqs: [],
  },
];

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Replaces the long "When LTSC is right" list, which the product page already carries. */
const LTSC_OVERLAP = /\n## When LTSC is right\n[\s\S]*?(?=\n## When it is the expensive option)/;
const LTSC_POINTER =
  "\n## When LTSC is right\n\nThe situations where LTSC is the correct product are set out on the [Office LTSC page](/microsoft-office-ltsc). The short version: a device that must stay frozen, offline or validated. Everything else in this article is about cost, which is the question that page does not answer.\n";

export const rejectedBlogPosts: ContentMigration = {
  id: "2026-11-rejected-blog-posts",
  describe: "five unindexed articles open with an answer and a table, gain India-specific detail and FAQ markup, and end with a quote call to action",

  async apply(prisma) {
    const notes: string[] = [];
    for (const spec of SPECS) {
      const post = await prisma.blogPost.findUnique({ where: { slug: spec.slug }, select: { id: true, body: true } });
      if (!post) {
        notes.push(`/blog/${spec.slug} not found`);
        continue;
      }

      let body = post.body;
      const before = body;

      if (!body.includes(UPDATED)) body = `${spec.top}\n${body}`;

      const marker = spec.middle.trim().split("\n")[0]!;
      if (!body.includes(marker)) {
        const at = body.indexOf(spec.anchor ?? "\n## Where to go next");
        body = at >= 0 ? `${body.slice(0, at)}\n${spec.middle.trimEnd()}\n${body.slice(at)}` : `${body.trimEnd()}\n\n${spec.middle.trimEnd()}\n`;
      }

      if (spec.slug === "microsoft-office-ltsc-2024-vs-microsoft-365") {
        const match = body.match(LTSC_OVERLAP);
        if (match && match[0].includes("isolated or air-gapped network")) body = body.replace(LTSC_OVERLAP, LTSC_POINTER);
      }

      if (spec.faqs.length > 0) {
        for (const pattern of spec.remove ?? []) body = body.replace(pattern, "");
      }

      if (!body.includes(CTA_MARK)) body = `${body.trimEnd()}${spec.cta}\n`;

      if (body !== before) {
        await prisma.blogPost.update({ where: { id: post.id }, data: { body, updatedAt: new Date() } });
        notes.push(`/blog/${spec.slug} updated`);
      }

      if (spec.faqs.length > 0) {
        const topic = `blog:${spec.slug}`;
        const existing = await prisma.faq.findMany({ where: { topic }, select: { question: true, displayOrder: true } });
        const have = new Set(existing.map((row) => norm(row.question)));
        let order = existing.reduce((max, row) => Math.max(max, row.displayOrder), 0);
        const fresh = spec.faqs.filter((faq) => !have.has(norm(faq.question)));
        if (fresh.length > 0) {
          await prisma.faq.createMany({ data: fresh.map((faq) => ({ ...faq, topic, displayOrder: (order += 10) })) });
          notes.push(`/blog/${spec.slug}: ${fresh.length} questions added`);
        }
      }
    }
    return notes.join("; ") || "nothing to do";
  },
};
