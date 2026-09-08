export type BlogSeed = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  readMinutes: number;
  daysAgo: number;
};

export const blogPosts: BlogSeed[] = [
  {
    slug: "csp-vs-enterprise-agreement-which-microsoft-licensing-model",
    /*
     * Kept to 55 characters so the " | TechZoid" the layout appends still
     * lands under Google's ~70-character title truncation point. The longer
     * original — "CSP or Enterprise Agreement: choosing a Microsoft
     * licensing model" — was 76 characters with the suffix and was the one
     * title on the site a search-engine crawl flagged as too long.
     */
    title: "CSP or Enterprise Agreement: which licensing model fits",
    excerpt:
      "The two main routes to Microsoft licensing behave very differently as your seat count moves. Here is how to work out which one suits your organisation.",
    category: "Microsoft Licensing",
    tags: ["microsoft", "csp", "enterprise agreement", "licensing"],
    readMinutes: 7,
    daysAgo: 6,
    body: `Most organisations buying Microsoft licensing face a choice between the Cloud Solution Provider programme and a volume licensing agreement. The decision is usually made on headline unit price, which is the least reliable basis for it.

## What actually differs

The programmes differ in three ways that matter more than unit price.

**Commitment shape.** CSP subscriptions are typically annual, with seats addable at any point and reducible at the anniversary. An Enterprise Agreement commits you for three years at a baseline count, with a true-up for additions. If your headcount is genuinely stable, the agreement's price protection is valuable. If it is not, the commitment becomes the expensive part.

**Billing.** CSP is billed by your partner, in local currency, on a normal commercial invoice. Volume agreements often involve direct billing and foreign exchange exposure. For organisations that need GST invoicing and INR pricing without currency risk, that difference is administrative rather than trivial.

**Flexibility mid-term.** Under CSP you can move a user between plans, add a mid-year cohort, or reduce at renewal without renegotiating. Under an agreement, changes flow through the true-up process, which is slower and less forgiving.

## A rough threshold

Below roughly 250 seats, CSP is almost always the right answer: the flexibility is worth more than the price protection, and the administrative overhead of an agreement is disproportionate.

Between 250 and 500 seats it is genuinely worth modelling both. The variables that decide it are the stability of your headcount and whether you will use the Software Assurance benefits an agreement includes.

Above 500 seats, an agreement usually wins on price — but only if the baseline count is set accurately. An agreement sized against optimistic growth is a three-year commitment to licences you do not need.

## The mistake worth avoiding

The common error is comparing the two on the first year alone. An agreement's advantage accrues over three years, and its disadvantage — the commitment — also only bites over three years. Model the full term, including a realistic scenario where headcount falls, before committing.

If you would like that modelled against your actual numbers, we will do it as part of a licensing review rather than as a sales exercise.`,
  },
  {
    slug: "hidden-cost-of-unused-software-licences",
    title: "The hidden cost of unused software licences",
    excerpt:
      "Unassigned seats are the most common and most recoverable form of IT waste. Here is how to find them and stop them coming back.",
    category: "Software Asset Management",
    tags: ["sam", "cost optimisation", "licensing", "procurement"],
    readMinutes: 6,
    daysAgo: 14,
    body: `Every organisation we review has licences nobody is using. The cause is rarely negligence — it is that nothing in the normal course of business creates a moment to check.

## Where the waste accumulates

**Leavers.** Someone leaves, their account is disabled, and their licence stays assigned. Disabling an account does not release a subscription seat; that is a separate action, and it is nobody's specific job.

**Edition drift.** A user is placed on a higher plan for a project, the project ends, and the plan stays. Over a few years a meaningful proportion of an organisation's seats end up a tier above what the role needs.

**Departmental duplication.** Two teams independently buy tools that do the same thing. Neither is aware of the other, because the purchases went through different budget lines.

**Renewal by default.** A subscription renews at last year's count because nobody reviewed it. This is the largest single source, and the easiest to fix.

## Finding it

The reconciliation is straightforward in principle: list what you own, list what is assigned, list what is actually used, and compare. In practice the difficulty is that the three lists live in different places — purchase records in finance, assignments in each publisher's admin console, usage in whatever telemetry the product exposes.

Usage is the one most often skipped, and it is the one that finds edition drift. An assigned seat that has not been signed into for ninety days is a candidate for reclamation regardless of what the assignment list says.

## Stopping it recurring

A one-off cleanup recovers cost once. Keeping it recovered needs two things:

1. **Licence release in the leaver process.** Not as a documented step, but as an actual action with an owner, in the same checklist as disabling the account.
2. **A renewal calendar with a review window.** Every renewal date recorded, with a reminder far enough ahead that a reduction can still be made. Renewals that arrive as a surprise get paid.

Neither is technically difficult. Both fail for the same reason: they are small tasks that are never anyone's priority, which is precisely why they are worth assigning explicitly.`,
  },
  {
    slug: "autodesk-named-user-licensing-what-changed",
    title: "Autodesk named-user licensing: what changed and what it means for teams",
    excerpt:
      "The move from network licences to named users changed how design teams should allocate seats. Some of the old habits now cost money.",
    category: "Autodesk Licensing",
    tags: ["autodesk", "autocad", "revit", "licensing"],
    readMinutes: 5,
    daysAgo: 22,
    body: `Autodesk's transition away from network licensing to named users is complete, and it changed the economics of seat allocation in a way that many teams have not yet adjusted to.

## The old model

Network licences were pooled. A practice with twenty designers might hold twelve licences, because they were never all in the application at once. The licence followed availability, not people.

## The new model

A named-user subscription is assigned to one person. It cannot be shared, and it cannot be pooled. The same practice now needs a seat for every person who opens the software, regardless of how often.

## What this changes in practice

**Occasional users became expensive.** Someone who opened AutoCAD twice a month was nearly free under a pooled model. They now need a full seat. This is the single biggest cost change for most practices, and it makes it worth asking whether those users genuinely need the full application or whether a viewer or a web-based workflow serves them.

**Collections became better value.** Because seats now follow people, a person who occasionally needs a second product would previously have drawn from a small shared pool. Now they need a second full subscription — which is exactly the situation an industry collection is priced for.

**Reassignment is the new flexibility.** A named-user seat can be unassigned and given to someone else. That is not the same as pooling, but it does mean a seat should follow a role rather than sitting with whoever received it first. Practices with staff turnover should be reclaiming and reassigning rather than buying.

## What to do about it

Review who actually opens each application and how often. The answer usually splits into three groups: daily users who clearly need a seat, occasional users who may be better served differently, and people who have a seat because they had one three years ago.

The third group is the one worth acting on first.`,
  },
  {
    slug: "microsoft-365-business-premium-security-you-already-own",
    title: "Microsoft 365 Business Premium: the security you may already be paying for",
    excerpt:
      "Most organisations on Business Premium use a fraction of its security capability. That unused portion is often the cheapest security improvement available to them.",
    category: "Cybersecurity",
    tags: ["microsoft 365", "security", "intune", "defender"],
    readMinutes: 6,
    daysAgo: 31,
    body: `Business Premium includes a substantial security and device management stack. In most of the tenants we review, a large part of it is switched off — not deliberately, but because nobody configured it after the licences were purchased.

## What is included and commonly unused

**Conditional access.** Rules that control who can sign in, from where, and under what conditions. Requiring multi-factor authentication and a compliant device closes the most commonly exploited attack path there is. It is included, and it is frequently not enabled.

**Intune device compliance.** Policies that define what a compliant device looks like — encryption on, patch level current, no jailbreak — and the ability to block non-compliant devices from company data. Included, often unconfigured.

**Defender for Office 365.** Safe attachments and safe links, which detonate attachments in a sandbox and rewrite links so they are checked at click time rather than at delivery. Included.

**Sensitivity labels.** Document classification and encryption that travels with the file. Included, and admittedly the one that needs the most thought to deploy well.

## Why it stays unconfigured

Two reasons, both understandable. The licence purchase and the configuration work are separate events, often months apart and sometimes involving different people. And the default state is permissive — nothing breaks if you do not configure it, so nothing forces the issue.

## Where to start

If you are going to do one thing, make it conditional access requiring multi-factor authentication for all users, with a break-glass account excluded. It closes more real risk than anything else on the list and it can be deployed in a controlled way in an afternoon.

After that, device compliance, then Defender policies, then labelling. That order reflects risk reduction per unit of effort rather than any framework's sequence.

The point worth holding onto is that none of this is a new purchase. If you hold Business Premium licences, you have already paid for it.`,
  },
  {
    slug: "gst-input-credit-on-software-purchases",
    title: "GST and software procurement: getting input credit right",
    excerpt:
      "Software purchases attract GST, and the input credit is straightforward — provided the invoice carries the right details. Here is what to check.",
    category: "IT Procurement",
    tags: ["gst", "procurement", "compliance", "india"],
    readMinutes: 5,
    daysAgo: 40,
    body: `Software and cloud services purchased for business use attract GST, and registered businesses can generally claim input tax credit against it. The mechanism is not complicated, but credit is regularly lost on avoidable invoice defects.

> This article is general information about procurement practice, not tax advice. Your accountant or tax adviser should confirm the treatment for your specific circumstances.

## What the invoice must carry

For input credit to be claimable, the tax invoice needs to correctly show your GSTIN, your registered legal name and address as they appear on the registration, the supplier's GSTIN, the HSN or SAC code, and the tax split — CGST and SGST for an intra-state supply, IGST for inter-state.

The two that most often go wrong are the GSTIN and the legal name. A GSTIN supplied verbally and transcribed incorrectly, or a trading name used where the registered legal name was required, will both cause a mismatch when the credit is reconciled.

## Supply the details once, correctly

The practical fix is to provide your GSTIN and registered legal name in writing at the point of enquiry rather than at the point of invoicing. It gets recorded against your account and appears correctly on every subsequent invoice, rather than being re-entered per order.

We ask for it on the enquiry form for this reason, and it is optional — nothing about the quotation depends on it.

## Direct international purchases

Buying software directly from an overseas publisher's website usually produces an invoice that does not carry your GSTIN and is not in a form that supports a domestic input credit claim. The reverse charge mechanism may apply, which is a different and more involved treatment.

Purchasing through a domestic supplier produces a standard GST invoice and avoids that complication entirely. For organisations buying at any scale, that administrative difference is often worth more than a small price difference on the licence itself.

## What to check on receipt

Read the first invoice from any new supplier properly: GSTIN correct, legal name correct, tax split correct for the supply type, HSN or SAC present. Errors caught on the first invoice are corrected once. Errors caught at the end of the quarter are corrected across every invoice in it.`,
  },
  {
    slug: "planning-a-cloud-migration-that-does-not-cost-more",
    title: "Planning a cloud migration that does not end up costing more",
    excerpt:
      "Lift-and-shift migrations frequently increase cost. The reasons are predictable and mostly avoidable at the planning stage.",
    category: "Cloud",
    tags: ["cloud", "azure", "aws", "cost optimisation"],
    readMinutes: 8,
    daysAgo: 52,
    body: `A cloud migration that increases running cost is common enough to be the default outcome when planning is skipped. The causes are consistent.

## Cause one: migrating the specification rather than the workload

On-premises servers are sized for peak load plus a hardware refresh cycle's worth of headroom, because adding capacity later means buying a machine. That sizing logic makes sense when compute is capital. It is actively wasteful when compute is metered by the hour.

A server specified at sixteen cores and 128 GB because that was the sensible purchase in 2021 may be using two cores and 24 GB. Migrating it as-is means paying continuously for the fourteen cores it never uses.

**The fix:** measure actual consumption over a representative period before sizing anything. Not peak, not the specification — measured utilisation.

## Cause two: everything running continuously

On-premises, a development environment left running costs nothing incremental. In a public cloud it bills every hour. Non-production environments frequently account for a surprising share of a migrated estate's bill, and they are typically needed during working hours only.

**The fix:** schedule non-production environments off outside working hours. It is a small piece of automation with a large and permanent effect.

## Cause three: no commitment on the stable baseline

Cloud providers discount substantially for committed capacity. Organisations often avoid commitment because they are uncertain about their consumption — which is reasonable in month one and unreasonable in month twelve.

**The fix:** run on-demand until the baseline is measured rather than estimated, then commit the genuinely steady portion and leave the variable portion on-demand.

## Cause four: storage that was never reviewed

Migrated storage arrives at the performance tier the source system used, and stays there. Data that is written once and read rarely does not need premium storage, and the price difference across tiers is large.

**The fix:** classify data by access pattern and place it accordingly. Lifecycle policies can automate the transition.

## Cause five: nobody owns the bill

Without cost allocation, no individual team sees the consequence of leaving something running. Spend becomes a general overhead that nobody is accountable for.

**The fix:** enforce tagging from day one and report cost by team or product. Visibility alone changes behaviour, before any policy is applied.

## The planning sequence that avoids this

Measure current consumption. Model the cost with the measured figures. Build the governance layer before workloads move. Migrate. Right-size against observed load. Commit once the baseline is real.

That sequence takes longer to start and considerably less to recover from.`,
  },
  {
    slug: "perpetual-versus-subscription-software-licensing",
    title: "Perpetual or subscription: how to compare them honestly",
    excerpt:
      "The comparison is not simply capital versus operating expenditure. Here is the calculation that actually decides it.",
    category: "IT Procurement",
    tags: ["licensing", "procurement", "perpetual", "subscription"],
    readMinutes: 6,
    daysAgo: 65,
    body: `Where a publisher still offers both, the perpetual-versus-subscription question comes up at every renewal. It is usually argued on capital versus operating expenditure, which is a real consideration but rarely the deciding one.

## The calculation that matters

Compare total cost over the period you will actually use the software, including the upgrade you will actually buy.

A perpetual licence at four times the annual subscription price looks like a four-year break-even. But perpetual licences do not stay current, and most organisations upgrade every three or four releases. Add that upgrade cost to the perpetual side and the break-even moves out considerably — often past the point where anyone can forecast confidently.

Conversely, organisations that genuinely run software until it stops working — and some do, entirely reasonably, particularly for stable production tooling — get real value from perpetual licensing that a subscription comparison understates.

## The factors that decide it

**How long you keep a release.** Upgrade every year: subscription. Every five years or never: perpetual, if it is offered.

**Whether you need current features.** File format compatibility with clients and suppliers is the usual forcing function. If you exchange files with people on current versions, staying several releases behind eventually stops being a choice.

**Headcount stability.** Subscriptions scale down at renewal. Perpetual licences are a sunk cost you keep paying for in the sense that you cannot recover the money if the team shrinks.

**Budget structure.** For some organisations, particularly in the public sector, capital and operating budgets are genuinely not interchangeable. That constraint can decide it regardless of the arithmetic.

## What is disappearing

Fewer publishers offer perpetual licensing each year, and where it survives it is often at a price that reflects a deliberate preference for subscription. Corel and Microsoft's LTSC releases are among the remaining mainstream options.

Where perpetual is available and genuinely suits your usage pattern, it is worth pricing properly rather than dismissing. Where it is not available, the comparison is moot and the useful question becomes which subscription term and edition fit.`,
  },
  {
    slug: "what-to-check-before-a-software-renewal",
    title: "What to check before a software renewal",
    excerpt:
      "A renewal is the one moment each year when a subscription can be changed cheaply. Most pass without anyone looking.",
    category: "Software Asset Management",
    tags: ["renewals", "licensing", "sam", "cost optimisation"],
    readMinutes: 4,
    daysAgo: 78,
    body: `A subscription renewal is the only point in the year when the seat count, edition and term can be changed without a prorated adjustment or a commercial conversation. It is a genuine decision point, and it is routinely treated as an administrative one.

## The checks worth making

**Seat count against current headcount.** Not last year's count carried forward. The count you need on the renewal date, based on who is employed now and who is joining in the next quarter.

**Assignment against usage.** Which assigned seats have not been signed into in ninety days. Those are either leavers who were never reclaimed, or people who genuinely do not use the product.

**Edition against requirement.** Which users are on a higher tier than their role uses. This is the least visible source of overspend because nothing is obviously wrong — the licences are assigned and being used, just at a tier above what is needed.

**Term against stability.** If your headcount is stable, a multi-year term is usually cheaper per year and protects against price increases. If it is not, the annual term's flexibility is worth the premium.

**Overlap with other tools.** Whether another subscription in the organisation now covers this need. Departmental purchases made independently converge more often than anyone expects.

## The timing problem

All of this requires the renewal to be visible far enough ahead to act on. A renewal notice that arrives two weeks before the date leaves no time to reclaim seats, agree a reduced count internally and get a revised quotation.

The practical fix is a renewal calendar with a review reminder set sixty to ninety days ahead of each date. That is enough time to do the checks above and act on what they find.

Without it, renewals happen at last year's count by default — which is a decision, just not one anybody made.`,
  },
  {
    slug: "microsoft-365-business-standard-price-in-india",
    title: "Microsoft 365 Business Standard price in India",
    excerpt:
      "Three ways to buy the same plan, and the commitment shape behind the headline number matters more than the number itself.",
    category: "Microsoft Licensing",
    tags: ["microsoft 365", "pricing", "licensing", "csp"],
    readMinutes: 4,
    daysAgo: 2,
    body: `Microsoft 365 Business Standard is licensed three different ways, and each one answers a different buying pattern. The wrong one is not more expensive so much as mismatched to how your organisation actually pays for software.

## The three ways to buy it

**Monthly commitment, billed monthly** — ₹1,320 per user per month, excluding GST. No commitment beyond the month you are in: add or remove seats at any billing cycle. The higher per-seat price is the cost of that flexibility.

**Annual commitment, billed monthly** — ₹1,100 per user per month, excluding GST, spread across twelve monthly invoices. You commit to the year, but the cash flow looks the same as the monthly plan above — usually the middle ground worth checking first.

**Annual commitment, billed yearly** — ₹11,800 per user per year, excluding GST. One invoice, once a year, and the lowest per-seat cost of the three: over a year it comes to less than the annual-billed-monthly plan's ₹13,200 total. Worth it only if you are confident the seat count will not need to shrink mid-term, since an annual commitment does not refund unused months.

## What GST adds

All three figures above are before GST. At the standard 18% rate: the monthly plan comes to about ₹1,558 a month, the annual-billed-monthly plan to about ₹1,298 a month, and the annual-billed-yearly plan to about ₹13,924 a year. GST is invoiced separately and is fully creditable for a registered business, so the pre-GST figure is what actually belongs in a budget comparison, not the total.

## Choosing between the three

The commitment shape is the real decision, not the headline number — see [our comparison of CSP against an Enterprise Agreement](/blog/csp-vs-enterprise-agreement-which-microsoft-licensing-model) for how that works out past a few hundred seats. Below that, it comes down to how stable your headcount is: a team that added or lost people every quarter this year should stay on the monthly plan even at the higher per-seat rate, because the flexibility is worth more than the saving.

Full plan details, a feature comparison against Business Basic and Business Premium, and current availability are on the [Microsoft 365 Business Standard product page](/products/microsoft-365-business-standard).`,
  },
  {
    slug: "autocad-subscription-price-in-india",
    title: "AutoCAD subscription price in India",
    excerpt:
      "The per-month cost falls sharply the longer you commit. Here is what each term actually works out to, and which one to pick.",
    category: "Autodesk Licensing",
    tags: ["autodesk", "autocad", "pricing", "licensing"],
    readMinutes: 4,
    daysAgo: 3,
    body: `AutoCAD is licensed by term length, and the per-month cost falls sharply the longer you commit — which makes the right answer almost entirely about how confident you are in still needing the seat next year.

## The three terms

**Monthly** — ₹19,300 per user per month, excluding GST. No commitment past the current month, and the most expensive per-month figure of the three by a wide margin. The right choice for a short, defined project rather than an ongoing seat.

**Annual (1-year)** — ₹1,46,300 per user per year, excluding GST, which works out to roughly ₹12,192 a month — well under half the pure monthly rate.

**3-year** — ₹4,38,900 per user for three years, excluding GST, or the same roughly ₹12,192 a month averaged out. It is priced level with the annual term rather than at a further discount, so a 3-year commitment buys price certainty against future increases rather than a lower running cost. Worth it if AutoCAD is a fixture in your workflow and you would simply re-buy the annual term three times regardless.

## What GST adds

Adding the standard 18%: the monthly term comes to about ₹22,774 a month, the annual term to about ₹1,72,634 a year, and the 3-year term to about ₹5,17,902 total. GST is invoiced separately and is fully creditable for a registered business.

## The actual decision

Almost nobody genuinely needs AutoCAD for exactly one month, which means the real choice is between the annual and 3-year terms — and it turns on one question: will AutoCAD's price still be what it is today in three years? Autodesk has raised subscription prices in most years since moving off perpetual licensing, so a 3-year term is, in effect, a price lock. Worth it for a seat you are certain you are keeping; an unforced bet against your own uncertainty for one you might not renew.

Full specification, the AutoCAD LT consolidation into this line, and current availability are on the [AutoCAD product page](/products/autocad).`,
  },
  {
    slug: "windows-server-2025-core-licence-price-in-india",
    title: "Windows Server 2025 core licence price in India",
    excerpt:
      "It is licensed by physical core, not by server — so the per-pack price only tells half the story until you know how many packs a real server needs.",
    category: "Microsoft Licensing",
    tags: ["windows server", "pricing", "licensing", "core licensing"],
    readMinutes: 4,
    daysAgo: 1,
    body: `Windows Server 2025 is licensed by physical core, not by seat — which means the number that matters is not "per server" but "per core," and the ₹42,500 core-pack price only tells half the story until you know how many packs a real server needs.

## The core-counting rule

Every physical processor needs at least eight core licences, and every server needs at least sixteen — regardless of how many cores it actually has. A quad-core server is billed as if it had sixteen. This is a licensing rule, not a pricing choice on our part, and it is worth confirming your actual core count before budgeting rather than after.

## What it costs

**Standard edition** — sold in 2-core packs at ₹42,500 each, excluding GST. The mandatory 16-core minimum comes to eight packs, ₹3,40,000, whether bought as eight packs or as one 16-core licence — the per-core rate is identical either way. Every 2 additional cores past that minimum add another ₹42,500.

**Datacenter edition** — sold in 2-core packs at ₹2,47,000 each, excluding GST, roughly 5.8 times Standard's per-core rate. The same 16-core minimum works out to ₹19,76,000 for the licence alone. That is not a pricing anomaly: Datacenter's licence covers unlimited virtual machines on the host, where Standard covers only two.

## What GST adds

At 18%: a Standard 2-core pack comes to about ₹50,150, the 16-core Standard minimum to about ₹4,01,200, and a Datacenter 2-core pack to about ₹2,91,460. GST is invoiced separately and is fully creditable for a registered business.

## Where the two editions actually cross over

The licence price alone makes Standard look like the obvious choice, and for a lightly virtualised host it is — the 16-core minimum covers the host operating system plus two virtual machines. The calculation changes once a host runs more guests than that: each additional pair of virtual machines on Standard needs another full stack of core licences, while Datacenter's cost is flat regardless of guest count. [Our Windows Server licensing guide](/windows-server) works through exactly where that crossover sits for a given guest count, and covers Client Access Licences, which are a separate purchase from the core licence.

Current availability and full specification are on the [Windows Server 2025 Standard](/products/windows-server-2025-standard) and [Windows Server 2025 Datacenter](/products/windows-server-2025-datacenter) product pages.`,
  },
  {
    slug: "windows-11-pro-upgrade-licence-price-in-india",
    title: "Windows 11 Pro upgrade licence price in India",
    excerpt:
      "Most searches for this price actually want an upgrade from Home, not a fresh licence — and the two are priced, and licensed, differently.",
    category: "Microsoft Licensing",
    tags: ["windows 11", "pricing", "licensing"],
    readMinutes: 3,
    daysAgo: 1,
    body: `The licence most people searching for "Windows 11 Pro price" actually want is not a fresh Windows 11 Pro licence — it is an upgrade from the Home edition already on the machine, and the two are priced, and licensed, differently.

## What this licence is

Most business laptops and desktops already ship with Windows 11 Home. The upgrade licence — ₹15,600 per device, excluding GST — unlocks Pro features on that same installation: joining a domain or Azure AD, BitLocker device encryption, Remote Desktop as a host, and Group Policy management. It is a one-time, perpetual purchase rather than a subscription, and it is licensed per device rather than per user.

## What GST adds

At 18%, the upgrade comes to about ₹18,408 per device. GST is invoiced separately and is fully creditable for a registered business.

## Why "upgrade" matters here

A genuinely new Windows 11 Pro licence — for a machine with no Windows installed at all, or one currently running something else entirely — is a different product with a different price, and is not what this SKU covers. For the overwhelmingly common case, a business device bought with Home pre-installed, the upgrade licence is the correct and complete purchase: it changes the edition in place, keeps the existing activation, and needs no reinstall.

Current availability and full specification are on the [Windows 11 Pro Upgrade product page](/products/windows-11-pro-upgrade).`,
  },
  {
    slug: "microsoft-365-business-basic-price-in-india",
    title: "Microsoft 365 Business Basic price in India",
    excerpt:
      "Only two ways to buy this one, and the gap between them is wider than on Business Standard — worth knowing before you default to the flexible option.",
    category: "Microsoft Licensing",
    tags: ["microsoft 365", "pricing", "licensing", "csp"],
    readMinutes: 3,
    daysAgo: 1,
    body: `Business Basic is priced two ways, not three — there is no annual-commitment-billed-monthly middle tier here the way Business Standard has one, so the choice is a plainer trade-off between flexibility and cost.

## The two ways to buy it

**Monthly commitment, billed monthly** — ₹540 per user per month, excluding GST. No commitment: add, remove or cancel at any billing cycle.

**Annual commitment, billed yearly** — ₹5,040 per user per year, excluding GST. One invoice, once a year, works out to ₹420 a month — about 22% cheaper than paying monthly, in exchange for a year's commitment with no mid-term exit.

## What GST adds

At 18%: the monthly plan comes to about ₹637 a month, the annual plan to about ₹5,947 a year. GST is invoiced separately and is fully creditable for a registered business.

## Which one to pick

Without a middle tier to soften the choice, this comes down more sharply than usual to how sure you are of the seat count for the next twelve months. A genuinely temporary or trial deployment belongs on the monthly plan even at the higher rate; anything you expect to keep running is worth the annual commitment's real, meaningful saving.

Full plan details and a feature comparison against Business Standard and Business Premium are on the [Microsoft 365 Business Basic product page](/products/microsoft-365-business-basic).`,
  },
  {
    slug: "microsoft-365-business-premium-price-in-india",
    title: "Microsoft 365 Business Premium price in India",
    excerpt:
      "Both ways to buy this one already commit you for a year — the choice is only about invoicing, and one option is a straightforward 10% cheaper.",
    category: "Microsoft Licensing",
    tags: ["microsoft 365", "pricing", "licensing", "csp"],
    readMinutes: 3,
    daysAgo: 1,
    body: `Business Premium does not offer a true month-to-month plan the way Basic and Standard do — both ways to buy it commit you for a year. The only real choice is how you pay across that year, and one option is a straightforward saving over the other for the identical commitment.

## The two ways to buy it

**Annual commitment, billed monthly** — ₹1,900 per user per month, excluding GST, invoiced across twelve months. Over the year that comes to ₹22,800.

**Annual commitment, billed yearly** — ₹20,400 per user per year, excluding GST, one invoice. That is ₹2,400 cheaper than the billed-monthly total for the same twelve-month commitment — a saving with no flexibility trade-off attached, since both options already commit you for the year.

## What GST adds

At 18%: the monthly-billed option comes to about ₹2,242 a month, and the annual-billed option to about ₹24,072 a year. GST is invoiced separately and is fully creditable for a registered business.

## Which one to pick

Because both options carry the same annual commitment, this is a cash-flow question rather than a flexibility one. If paying ₹20,400 per user upfront is manageable, it is strictly the cheaper choice; the monthly-billed option exists for organisations that would rather spread the same commitment across twelve smaller invoices, not for anyone hoping to cancel early.

Full plan details and a feature comparison against Business Basic and Business Standard are on the [Microsoft 365 Business Premium product page](/products/microsoft-365-business-premium).`,
  },
];
