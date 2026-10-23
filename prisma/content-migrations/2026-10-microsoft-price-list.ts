import { MARGIN_PERCENT, sellingPriceMinor } from "./margin";
import type { ContentMigration } from "./types";

/**
 * The Microsoft 365 and Office 365 plans, priced from the supplied list.
 *
 * Third of the three publisher lists, on the same instruction: publish the
 * plans, annual prices only, undiscounted, plus the margin in `margin.ts`.
 *
 * ## Monthly figures, annual prices
 *
 * Microsoft quotes these as "₹X user/month, paid yearly (Annual commitment)",
 * which is a monthly instalment of an annual contract rather than a monthly
 * subscription. The catalogue stores an annual figure, so each one is
 * multiplied by twelve before the margin.
 *
 * Doing it the other way — publishing ₹170 against Business Basic because that
 * is the number on Microsoft's card — would put a monthly instalment beside
 * Adobe and Autodesk annual totals and make Business Basic look eighty times
 * cheaper than it is. That is the Acrobat Standard-against-Pro problem from
 * the quote pages, one brand over.
 *
 * ## With Copilot is a different plan, not a different price
 *
 * Microsoft sells Business Standard at ₹860 and Business Standard with Copilot
 * at ₹1,955, as two products. They are published as two products here. Putting
 * the Copilot price on the plain plan would overstate it by 127%, and putting
 * the plain price on a page that lists Copilot features would understate what
 * the customer has to buy.
 *
 * ## Audio Conferencing
 *
 * The E5 and E7 figures are the "without Audio Conferencing" editions, because
 * that is what the supplied list priced. The names say so rather than leaving
 * a buyer to discover it on the quotation: Audio Conferencing is a separate
 * line, and a plan name that omits the qualifier is a plan name that promises
 * it.
 *
 * ## GST
 *
 * The list says "GST extra as applicable", so these are tax-exclusive as
 * supplied — unlike the Autodesk list, which was tax-inclusive and had to be
 * converted. Nothing is divided here.
 */

type Plan = {
  slug: string;
  name: string;
  /** Microsoft's own figure, in rupees per user per month on an annual commitment. */
  perUserPerMonth: number;
  sku: string;
  shortDescription: string;
  features: string[];
};

const PLANS: Plan[] = [
  // ── Microsoft 365 Business, up to 300 seats ─────────────────────────────
  {
    slug: "microsoft-365-business-basic",
    name: "Microsoft 365 Business Basic",
    perUserPerMonth: 170,
    sku: "MS-M365-BB-A1",
    shortDescription:
      "Lightweight web and mobile apps to kickstart your business, with business email and Teams for up to 300 users.",
    features: [
      "Core identity and access management for up to 300 users",
      "Web and mobile versions of Word, Excel, PowerPoint and Outlook",
      "Custom business email on your own domain",
      "Chat, call and meet with Microsoft Teams",
      "1 TB of cloud storage per user",
      "Automatic spam and malware filtering",
    ],
  },
  {
    slug: "microsoft-365-business-standard",
    name: "Microsoft 365 Business Standard",
    perUserPerMonth: 860,
    sku: "MS-M365-BS-A1",
    shortDescription:
      "Desktop, web and mobile Office applications with business email, Teams and 1 TB of storage per user.",
    features: [
      "Desktop, web and mobile versions of Word, Excel, PowerPoint, Outlook and other apps",
      "Custom business email on your own domain",
      "Chat, call, meet and host webinars with Microsoft Teams",
      "1 TB of cloud storage per user",
      "10+ additional apps including Microsoft Loop, Clipchamp, Bookings, Planner and Forms",
      "Automatic spam and malware filtering",
    ],
  },
  {
    slug: "microsoft-365-business-premium",
    name: "Microsoft 365 Business Premium",
    perUserPerMonth: 1_830,
    sku: "MS-M365-BP-A1",
    shortDescription:
      "Everything in Business Standard, plus device management, advanced threat protection and data classification.",
    features: [
      "Policy-based identity and access management for up to 300 users",
      "Desktop, web and mobile versions of Word, Excel, PowerPoint, Outlook and other apps",
      "Device security and management to protect company devices",
      "Advanced threat protection against phishing, malware and cyber attacks",
      "Discovery, classification and protection of sensitive data",
      "Anytime phone and web support",
    ],
  },
  {
    slug: "microsoft-365-business-standard-with-copilot",
    name: "Microsoft 365 Business Standard with Copilot",
    perUserPerMonth: 1_955,
    sku: "MS-M365-BS-COPILOT-A1",
    shortDescription:
      "Business Standard with Microsoft Copilot built into Word, Excel, PowerPoint, Outlook and Teams.",
    features: [
      "Microsoft Copilot in apps such as Word, Excel, PowerPoint, Outlook and Microsoft Teams",
      "AI chat grounded in your work data with large language model choice",
      "Pre-built agents for research and data analysis",
      "Core identity and access management for up to 300 users",
      "Desktop, web and mobile versions of Word, Excel, PowerPoint, Outlook and other apps",
    ],
  },
  {
    slug: "microsoft-365-business-premium-with-copilot",
    name: "Microsoft 365 Business Premium with Copilot",
    perUserPerMonth: 2_660,
    sku: "MS-M365-BP-COPILOT-A1",
    shortDescription:
      "Business Premium with Microsoft Copilot built in, for productivity and security together.",
    features: [
      "Microsoft Copilot in apps such as Word, Excel, PowerPoint, Outlook and Microsoft Teams",
      "AI chat grounded in your work data with large language model choice",
      "Pre-built agents for research and data analysis",
      "Device security and management to protect company devices",
      "Email and threat protection against phishing, malware and cyber attacks",
      "Discovery, classification and protection of sensitive data",
    ],
  },

  // ── Microsoft 365 Enterprise, no seat ceiling ───────────────────────────
  {
    slug: "microsoft-365-e3",
    name: "Microsoft 365 E3",
    perUserPerMonth: 3_245,
    sku: "MS-M365-E3-A1",
    shortDescription:
      "Productivity apps with enhanced security and compliance capabilities, for organisations of any size.",
    features: [
      "Supports organisations of any size",
      "Enhanced identity and access management",
      "Desktop, web and mobile versions of Word, Excel, PowerPoint, Outlook and other apps",
      "1 to 5+ TB of cloud storage per user",
      "Deploy, manage and update devices at scale with Windows Enterprise",
      "Shadow IT discovery, antivirus, antimalware, phishing and ransomware protection",
    ],
  },
  {
    slug: "microsoft-365-e5",
    name: "Microsoft 365 E5 without Audio Conferencing",
    perUserPerMonth: 4_990,
    sku: "MS-M365-E5-A1",
    shortDescription:
      "Best-in-class AI-powered productivity apps with advanced security, compliance, analytics and AI readiness.",
    features: [
      "Advanced identity and access management",
      "Cloud-based phone system to make calls outside your organisation with Microsoft Teams Phone",
      "Scalable business analytics with Power BI",
      "Extended detection and response (XDR) and SIEM capabilities",
      "Data security and compliance for higher data risk and regulations",
      "Agentic AI for daily operations in security and IT with Security Copilot",
    ],
  },
  {
    slug: "microsoft-365-e7",
    name: "Microsoft 365 E7 without Audio Conferencing",
    perUserPerMonth: 8_235,
    sku: "MS-M365-E7-A1",
    shortDescription:
      "The Frontier Suite: observability, security and governance for agents, unified identity and compliance, and AI built for work.",
    features: [
      "Agent 365 — a control plane for agents",
      "Unified identity, security and network access management",
      "Extended detection and response (XDR), hybrid identity protection and malicious OAuth app protection",
      "Secure AI built for work, powered by Work IQ, with access to agents and grounded Copilot in apps and AI chat",
      "Includes Microsoft 365 E5, Copilot, Agent 365 and Microsoft Entra Suite",
    ],
  },

  // ── Office 365 Enterprise ───────────────────────────────────────────────
  {
    slug: "office-365-e1",
    name: "Office 365 E1",
    perUserPerMonth: 830,
    sku: "MS-O365-E1-A1",
    shortDescription:
      "Lightweight web and mobile apps with basic security, for organisations of any size.",
    features: [
      "Supports organisations of any size",
      "Web and mobile versions of Word, Excel, PowerPoint and Outlook",
      "1 TB of cloud storage per user",
      "Chat, call, meet and video conference with Microsoft Teams",
      "10+ additional apps including Microsoft Planner, Forms, To Do and Lists",
      "Email phishing and ransomware protection",
    ],
  },
  {
    slug: "office-365-e3",
    name: "Office 365 E3",
    perUserPerMonth: 2_165,
    sku: "MS-O365-E3-A1",
    shortDescription:
      "Productivity apps with basic security and identity management capabilities, for organisations of any size.",
    features: [
      "Desktop, web and mobile versions of Word, Excel, PowerPoint, Outlook and other apps",
      "1 to 5+ TB of cloud storage per user",
      "Chat, call, meet and video conference with Microsoft Teams",
      "10+ additional apps for enterprise needs",
      "Intelligent detection and control of sensitive information",
    ],
  },
  {
    slug: "office-365-e5",
    name: "Office 365 E5 without Audio Conferencing",
    perUserPerMonth: 3_410,
    sku: "MS-O365-E5-A1",
    shortDescription:
      "Best-in-class AI-powered productivity apps with core security, compliance and analytics capabilities.",
    features: [
      "Core identity and access management",
      "Cloud-based phone system to make calls outside your organisation with Microsoft Teams Phone",
      "Scalable business analytics with Power BI",
      "Intelligent detection and control of sensitive information",
      "Data security and compliance for higher data risk and regulations",
    ],
  },
];

const PROVENANCE = `Microsoft India price list supplied by the business, 23 October 2026 — quoted per user per month on an annual commitment, excluding GST; multiplied by twelve for the annual figure, plus the ${MARGIN_PERCENT}% margin.`;

export const microsoftPriceList: ContentMigration = {
  id: "2026-10-microsoft-price-list",
  describe: "publish the Microsoft 365 and Office 365 plans at the supplied annual prices",

  async apply(prisma) {
    const brand = await prisma.brand.findFirst({
      where: { slug: "microsoft", deletedAt: null },
      select: { id: true },
    });
    if (!brand) return "no Microsoft brand to price against; nothing changed";

    const category = await prisma.category.findFirst({
      where: { slug: "microsoft-365-plans" },
      select: { id: true },
    });
    if (!category) return "no microsoft-365-plans category; nothing changed";

    let created = 0;
    let repriced = 0;

    for (const plan of PLANS) {
      const existing = await prisma.product.findUnique({
        where: { slug: plan.slug },
        select: { id: true, name: true },
      });

      /*
       * The name moves with the price where the supplied list names the plan
       * differently. E5 is why: the figure priced here is the "without Audio
       * Conferencing" edition, and the record was called plain "Microsoft 365
       * E5". Taking the price and leaving the name would have the page promise
       * a component the quotation then charges separately for — the one defect
       * on this page that a customer only discovers at invoice.
       *
       * Only the name, and only when it differs. Descriptions and features on
       * an existing record may have been edited since, and nothing here knows
       * better than whoever edited them.
       */
      if (existing && existing.name !== plan.name) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { name: plan.name },
        });
      }

      const productId = existing
        ? existing.id
        : (
            await prisma.product.create({
              data: {
                slug: plan.slug,
                name: plan.name,
                shortDescription: plan.shortDescription,
                description: plan.shortDescription,
                brandId: brand.id,
                categoryId: category.id,
                status: "ACTIVE",
                availability: "ON_REQUEST",
                purchaseMode: "BOTH",
                features: plan.features,
                unitLabel: "user",
              },
              select: { id: true },
            })
          ).id;

      if (!existing) created += 1;

      // Twelve monthly instalments of an annual commitment, then the margin.
      const listPriceMinor = sellingPriceMinor(plan.perUserPerMonth * 12);

      const variant = await prisma.productVariant.findUnique({
        where: { sku: plan.sku },
        select: { id: true, listPriceMinor: true },
      });

      if (variant) {
        if (variant.listPriceMinor === listPriceMinor) continue;
        await prisma.productVariant.update({
          where: { id: variant.id },
          data: { listPriceMinor, salePriceMinor: null, deletedAt: null },
        });
        await prisma.price.create({
          data: { variantId: variant.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
        });
      } else {
        const fresh = await prisma.productVariant.create({
          data: {
            productId,
            sku: plan.sku,
            name: "Annual commitment, billed yearly",
            licenceType: "SUBSCRIPTION_ANNUAL",
            termMonths: 12,
            seats: 1,
            isDefault: true,
            currency: "INR",
            listPriceMinor,
            gstRatePercent: 18,
          },
          select: { id: true },
        });
        await prisma.price.create({
          data: { variantId: fresh.id, listPriceMinor, gstRatePercent: 18, note: PROVENANCE },
        });
      }
      repriced += 1;
    }

    /*
     * Annual only, across the Microsoft 365 and Office 365 plans. Scoped to
     * this category rather than the whole brand: Windows Server, SQL Server
     * and the perpetual Office products are licensed outright and carry no
     * term at all, and sweeping them up would archive every variant the
     * catalogue has for them.
     */
    const { count: archived } = await prisma.productVariant.updateMany({
      where: {
        deletedAt: null,
        product: { brandId: brand.id, categoryId: category.id },
        sku: { notIn: PLANS.map((plan) => plan.sku) },
      },
      data: { deletedAt: new Date() },
    });

    return `created ${created} Microsoft plan${created === 1 ? "" : "s"}, priced ${repriced}, archived ${archived} non-annual variant${archived === 1 ? "" : "s"}`;
  },
};
