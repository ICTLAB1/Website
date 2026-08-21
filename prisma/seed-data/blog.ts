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
    title: "CSP or Enterprise Agreement: choosing a Microsoft licensing model",
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
];
