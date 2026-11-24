import { createHash } from "node:crypto";

import type { ContentMigration } from "./types";
import { SEO_POSTS } from "./seo-posts.generated";

/**
 * The second SEO pass of November: missing product pages, two new articles, two
 * upgraded ones, and menu links to the new category pages.
 *
 * ## The products
 *
 * Seven Microsoft products had no page: 365 Personal and Family, Office Home 2024,
 * Office LTSC Standard 2024, Power BI Pro, Power BI Premium Per User and OneDrive
 * for Business (Plan 1). Each is created once, as an enquiry-only product with a
 * single variant at price zero — the catalogue's own way of saying "price on
 * request". No figure is invented: the page shows "Get today's price" and the
 * structured data leaves the Offer out. The price is entered in the admin panel when
 * there is one, and nothing here ever overwrites it.
 *
 * Windows 11 Pro gets a second variant, "Full licence", beside the existing Upgrade,
 * so one page carries both. The Upgrade keeps its price.
 *
 * ## The two upgraded articles
 *
 * "Secure business email providers" and "Best CAD software" already exist. Their new
 * text replaces the stored text only while the stored text is still exactly what the
 * earlier migration wrote (compared by digest), so an article edited in the admin
 * panel is left alone. Their FAQs are replaced on the same condition.
 *
 * ## The links
 *
 * The four new category pages are linked once from the Products menu and from the
 * Software footer column.
 */

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

type NewProduct = {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  features: string[];
  keywords: string[];
  licensingNotes: string;
  variant: { sku: string; name: string; licenceType: "SUBSCRIPTION_ANNUAL" | "PERPETUAL" | "VOLUME"; termMonths: number | null };
};

const PRODUCTS: NewProduct[] = [
  {
    slug: "microsoft-365-personal",
    name: "Microsoft 365 Personal",
    category: "microsoft-365-plans",
    shortDescription: "Microsoft 365 Personal is Microsoft's one-person plan for home use, with the Office apps and cloud storage.",
    description:
      "Microsoft 365 Personal is a subscription plan for one individual, covering the desktop Office apps and Microsoft's cloud storage and services as set out in Microsoft's own plan sheet.\n\nIt is a personal plan rather than a business one. An organisation that needs managed accounts, a tenant, shared mailboxes or administrative control should look at Microsoft 365 Business Basic, Standard or Premium instead. TechZoid quotes the plan on request, with a GST invoice.",
    features: ["One subscriber", "Subscription plan, renewed each term", "Quoted on request with a GST invoice"],
    keywords: ["Microsoft 365 Personal", "Microsoft 365 Personal price India", "Office subscription one person"],
    licensingNotes: "A personal plan for one individual. Organisations should use a Microsoft 365 Business plan.",
    variant: { sku: "MS365-PERSONAL-12M", name: "Microsoft 365 Personal, 1 year", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12 },
  },
  {
    slug: "microsoft-365-family",
    name: "Microsoft 365 Family",
    category: "microsoft-365-plans",
    shortDescription: "Microsoft 365 Family is Microsoft's multi-person home plan, with the Office apps and cloud storage.",
    description:
      "Microsoft 365 Family is a subscription plan that one subscriber can share with other people in the same household, covering the desktop Office apps and Microsoft's cloud storage and services as set out in Microsoft's own plan sheet.\n\nIt is a home plan rather than a business one. A company, school or other organisation should use a Microsoft 365 Business plan, which carries managed accounts and administrative control. TechZoid quotes the plan on request, with a GST invoice.",
    features: ["Shared with the subscriber's household", "Subscription plan, renewed each term", "Quoted on request with a GST invoice"],
    keywords: ["Microsoft 365 Family", "Microsoft 365 Family price India", "Office subscription family"],
    licensingNotes: "A home plan. Organisations should use a Microsoft 365 Business plan.",
    variant: { sku: "MS365-FAMILY-12M", name: "Microsoft 365 Family, 1 year", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12 },
  },
  {
    slug: "microsoft-office-home-2024",
    name: "Microsoft Office Home 2024",
    category: "office-suites",
    shortDescription: "Office Home 2024 is a one-time purchase of the core Office apps for one PC or Mac, for personal use.",
    description:
      "Office Home 2024 is a perpetual licence: bought once, with no subscription, for a single PC or Mac. It covers the core Office desktop apps listed on Microsoft's edition sheet and does not include the cloud services that come with a Microsoft 365 plan.\n\nIt is licensed for personal, non-commercial use. A business needs Office Home & Business 2024, an Office LTSC edition or a Microsoft 365 Business plan. TechZoid quotes it on request, with a GST invoice.",
    features: ["One-time purchase, no subscription", "One PC or Mac", "For personal, non-commercial use"],
    keywords: ["Office Home 2024", "Office Home 2024 price India", "Office 2024 one time purchase"],
    licensingNotes: "Perpetual licence for one device, for non-commercial use.",
    variant: { sku: "OFFICE-HOME-2024", name: "Office Home 2024, one device", licenceType: "PERPETUAL", termMonths: null },
  },
  {
    slug: "microsoft-office-ltsc-standard-2024",
    name: "Microsoft Office LTSC Standard 2024",
    category: "office-suites",
    shortDescription: "Office LTSC Standard 2024 is the volume-licensed, one-time-purchase Office suite for organisations.",
    description:
      "Office LTSC Standard 2024 is the long-term servicing channel edition of Office, sold under volume licensing to organisations that want a one-time purchase and a fixed feature set rather than a subscription.\n\nIt sits below Office LTSC Professional Plus 2024, which carries more applications. TechZoid quotes it on request, on a written quotation with a GST invoice; the volume licensing programme and quantity are agreed with you first.",
    features: ["Volume-licensed, one-time purchase", "Fixed feature set, no subscription", "For organisations"],
    keywords: ["Office LTSC Standard 2024", "Office LTSC 2024 price India", "Office 2024 volume licence"],
    licensingNotes: "Volume licence for organisations, quoted per programme and quantity.",
    variant: { sku: "OFFICE-LTSC-STD-2024", name: "Office LTSC Standard 2024", licenceType: "VOLUME", termMonths: null },
  },
  {
    slug: "power-bi-pro",
    name: "Microsoft Power BI Pro",
    category: "analytics-bi",
    shortDescription: "Power BI Pro is Microsoft's per-user licence for building, sharing and viewing business reports and dashboards.",
    description:
      "Power BI Pro is a per-user subscription for building reports and dashboards from your data, publishing them and sharing them with colleagues who hold a licence of their own.\n\nIt is the usual starting point for a team adopting Power BI, and sits below Power BI Premium Per User, which adds larger-scale capabilities. TechZoid quotes it on request, with a GST invoice.",
    features: ["Per-user subscription", "Build, publish and share reports", "Quoted on request with a GST invoice"],
    keywords: ["Power BI Pro", "Power BI Pro price India", "Power BI licence India"],
    licensingNotes: "Per-user subscription; people who view shared content generally need a licence too.",
    variant: { sku: "POWERBI-PRO-12M", name: "Power BI Pro, 1 year", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12 },
  },
  {
    slug: "power-bi-premium-per-user",
    name: "Microsoft Power BI Premium Per User",
    category: "analytics-bi",
    shortDescription: "Power BI Premium Per User adds Premium-level capabilities to Power BI on a per-user licence.",
    description:
      "Power BI Premium Per User is a per-user licence that adds Premium-level capabilities to Power BI for the people who hold it, without buying capacity for the whole organisation.\n\nIt suits teams that have outgrown Power BI Pro. TechZoid quotes it on request, with a GST invoice, and compares it with Pro for your usage before you commit.",
    features: ["Per-user subscription", "Premium-level capabilities", "Quoted on request with a GST invoice"],
    keywords: ["Power BI Premium Per User", "Power BI PPU price India", "Power BI Premium licence India"],
    licensingNotes: "Per-user subscription, quoted on request.",
    variant: { sku: "POWERBI-PPU-12M", name: "Power BI Premium Per User, 1 year", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12 },
  },
  {
    slug: "onedrive-for-business-plan-1",
    name: "Microsoft OneDrive for Business (Plan 1)",
    category: "productivity-collaboration",
    shortDescription: "OneDrive for Business Plan 1 is Microsoft's per-user cloud file storage and sharing for organisations.",
    description:
      "OneDrive for Business (Plan 1) is a per-user subscription for storing, syncing and sharing files in Microsoft's cloud, with administrative control for the organisation.\n\nIt is the smaller of the two standalone OneDrive plans; Plan 2 is also listed. Most Microsoft 365 Business plans already include OneDrive, so check the plan you hold before buying it separately. TechZoid quotes it on request, with a GST invoice.",
    features: ["Per-user subscription", "Cloud file storage and sharing", "Quoted on request with a GST invoice"],
    keywords: ["OneDrive for Business Plan 1", "OneDrive for Business price India", "OneDrive business licence"],
    licensingNotes: "Per-user subscription, also included in most Microsoft 365 Business plans.",
    variant: { sku: "ONEDRIVE-BIZ-P1-12M", name: "OneDrive for Business Plan 1, 1 year", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12 },
  },
];

const MENU_LINKS = [
  { label: "Firewall security", href: "/firewall-security" },
  { label: "Business laptops", href: "/business-laptops" },
  { label: "Backup software", href: "/backup-software" },
  { label: "Antivirus & endpoint security", href: "/antivirus-endpoint-security" },
] as const;

export const brandHubsProductsAndPosts: ContentMigration = {
  id: "2026-11-brand-hubs-products-and-posts",
  describe: "seven missing Microsoft product pages, a Windows 11 Pro full-licence variant, two new articles, two upgraded, and menu links to four category pages",

  async apply(prisma) {
    const notes: string[] = [];
    const now = new Date();

    // 1. Missing products ------------------------------------------------------
    const microsoft = await prisma.brand.findUnique({ where: { slug: "microsoft" }, select: { id: true } });
    if (microsoft) {
      let created = 0;
      for (const product of PRODUCTS) {
        if (await prisma.product.findUnique({ where: { slug: product.slug }, select: { id: true } })) continue;
        const category = await prisma.category.findUnique({ where: { slug: product.category }, select: { id: true } });
        if (!category) {
          notes.push(`category ${product.category} missing, ${product.slug} skipped`);
          continue;
        }
        await prisma.product.create({
          data: {
            slug: product.slug,
            name: product.name,
            shortDescription: product.shortDescription,
            description: product.description,
            brandId: microsoft.id,
            categoryId: category.id,
            status: "ACTIVE",
            availability: "ON_REQUEST",
            purchaseMode: "ENQUIRY",
            features: product.features,
            compatibility: [],
            keywords: product.keywords,
            licensingNotes: product.licensingNotes,
            variants: {
              create: [
                {
                  sku: product.variant.sku,
                  name: product.variant.name,
                  licenceType: product.variant.licenceType,
                  audience: "COMMERCIAL",
                  termMonths: product.variant.termMonths,
                  seats: 1,
                  isDefault: true,
                  currency: "INR",
                  listPriceMinor: 0,
                  gstRatePercent: 18,
                },
              ],
            },
          },
        });
        created += 1;
      }
      if (created > 0) notes.push(`${created} product pages created (price on request)`);
    }

    // 2. Windows 11 Pro: the full licence beside the upgrade ---------------------
    const windows = await prisma.product.findUnique({
      where: { slug: "windows-11-pro-upgrade" },
      select: { id: true },
    });
    if (windows && !(await prisma.productVariant.findUnique({ where: { sku: "WIN11-PRO-FULL" }, select: { id: true } }))) {
      await prisma.productVariant.create({
        data: {
          productId: windows.id,
          sku: "WIN11-PRO-FULL",
          name: "Windows 11 Pro, full licence",
          licenceType: "PERPETUAL",
          audience: "COMMERCIAL",
          termMonths: null,
          seats: 1,
          isDefault: false,
          currency: "INR",
          listPriceMinor: 0,
          gstRatePercent: 18,
        },
      });
      notes.push("Windows 11 Pro full-licence variant added");
    }

    // 3. Articles: new ones created, upgraded ones replaced only while untouched ----
    for (const post of SEO_POSTS) {
      const topic = `blog:${post.slug}`;
      const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug }, select: { id: true, body: true } });
      if (!existing) {
        await prisma.blogPost.create({
          data: {
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            body: post.body,
            category: post.category,
            tags: post.tags,
            readMinutes: post.readMinutes,
            status: "PUBLISHED",
            publishedAt: now,
          },
        });
        if ((await prisma.faq.count({ where: { topic } })) === 0) {
          await prisma.faq.createMany({ data: post.faqs.map((faq, index) => ({ ...faq, topic, displayOrder: (index + 1) * 10 })) });
        }
        notes.push(`/blog/${post.slug} published`);
        continue;
      }
      if (!post.replaces || sha(existing.body) !== post.replaces.bodySha) continue;
      await prisma.blogPost.update({
        where: { id: existing.id },
        data: {
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          tags: post.tags,
          readMinutes: post.readMinutes,
          updatedAt: now,
        },
      });
      const rows = await prisma.faq.findMany({ where: { topic }, orderBy: { displayOrder: "asc" }, select: { id: true, question: true, answer: true } });
      if (sha(rows.map((row) => `${row.question}\n${row.answer}`).join("\n--\n")) === post.replaces.faqSha) {
        await prisma.faq.deleteMany({ where: { id: { in: rows.map((row) => row.id) } } });
        await prisma.faq.createMany({ data: post.faqs.map((faq, index) => ({ ...faq, topic, displayOrder: (index + 1) * 10 })) });
        notes.push(`/blog/${post.slug} upgraded with new FAQs`);
      } else {
        notes.push(`/blog/${post.slug} upgraded; FAQs had been edited, left alone`);
      }
    }

    // 4. Menu and footer links ---------------------------------------------------
    const addLink = async (menu: "HEADER" | "FOOTER", column: string, link: { label: string; href: string }) => {
      if (await prisma.navigationItem.findFirst({ where: { menu, href: link.href }, select: { id: true } })) return false;
      const parent = await prisma.navigationItem.findFirst({ where: { menu, parentId: null, label: column }, select: { id: true } });
      if (!parent) return false;
      const all =
        menu === "FOOTER"
          ? await prisma.navigationItem.findFirst({ where: { parentId: parent.id, href: "/products" }, select: { id: true, displayOrder: true } })
          : null;
      let order: number;
      if (all) {
        order = all.displayOrder;
        await prisma.navigationItem.update({ where: { id: all.id }, data: { displayOrder: { increment: 1 } } });
      } else {
        const last = await prisma.navigationItem.findFirst({ where: { parentId: parent.id }, orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });
        order = (last?.displayOrder ?? 0) + 1;
      }
      await prisma.navigationItem.create({ data: { menu, parentId: parent.id, label: link.label, href: link.href, displayOrder: order, visible: true } });
      return true;
    };
    let linked = 0;
    for (const link of MENU_LINKS) {
      if (await addLink("HEADER", "Products", link)) linked += 1;
      if (await addLink("FOOTER", "Software", link)) linked += 1;
    }
    if (await addLink("FOOTER", "Company", { label: "Clients", href: "/clients" })) linked += 1;
    if (linked > 0) notes.push(`${linked} menu and footer links added`);

    return notes.length > 0 ? notes.join("; ") : "nothing to do";
  },
};
