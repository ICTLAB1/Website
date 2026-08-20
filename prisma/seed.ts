/**
 * Database seed.
 *
 * Populates the catalogue, services and editorial content, and optionally
 * bootstraps an administrator from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD.
 *
 * There is no hardcoded default administrator password: if the environment
 * variables are absent the seed skips the admin and says so, rather than
 * creating an account with a guessable credential.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { brands } from "./seed-data/brands";
import { categories } from "./seed-data/categories";
import { products } from "./seed-data/products";
import { services } from "./seed-data/services";
import { blogPosts } from "./seed-data/blog";

const prisma = new PrismaClient();

function buildSearchText(input: {
  name: string;
  brandName: string;
  categoryName: string;
  keywords: string[];
  skus: string[];
  shortDescription: string;
}): string {
  return [
    input.name,
    input.brandName,
    input.categoryName,
    input.shortDescription,
    ...input.keywords,
    ...input.skus,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_ALLOW_PRODUCTION !== "true") {
    throw new Error(
      "Refusing to seed with NODE_ENV=production. Set SEED_ALLOW_PRODUCTION=true to override.",
    );
  }

  console.log("Seeding brands…");
  const brandIds = new Map<string, string>();
  for (const brand of brands) {
    const record = await prisma.brand.upsert({
      where: { slug: brand.slug },
      create: { ...brand },
      update: { ...brand },
    });
    brandIds.set(brand.slug, record.id);
  }

  console.log("Seeding categories…");
  const categoryIds = new Map<string, string>();
  for (const category of categories) {
    const { children, ...parent } = category;
    const parentRecord = await prisma.category.upsert({
      where: { slug: parent.slug },
      create: { ...parent },
      update: { ...parent },
    });
    categoryIds.set(parent.slug, parentRecord.id);

    for (const child of children ?? []) {
      const childRecord = await prisma.category.upsert({
        where: { slug: child.slug },
        create: { ...child, parentId: parentRecord.id },
        update: { ...child, parentId: parentRecord.id },
      });
      categoryIds.set(child.slug, childRecord.id);
    }
  }

  console.log(`Seeding ${products.length} products…`);
  for (const product of products) {
    const brandId = brandIds.get(product.brand);
    const categoryId = categoryIds.get(product.category);
    if (!brandId) throw new Error(`Unknown brand "${product.brand}" on ${product.slug}`);
    if (!categoryId) throw new Error(`Unknown category "${product.category}" on ${product.slug}`);

    const brandName = brands.find((entry) => entry.slug === product.brand)?.name ?? product.brand;
    const categoryName =
      categories.flatMap((entry) => [entry, ...(entry.children ?? [])]).find(
        (entry) => entry.slug === product.category,
      )?.name ?? product.category;

    const data = {
      slug: product.slug,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      brandId,
      categoryId,
      status: "ACTIVE" as const,
      availability: product.availability ?? "ON_REQUEST",
      purchaseMode: product.purchaseMode ?? "BOTH",
      featured: product.featured ?? false,
      popularity: product.popularity ?? 0,
      features: product.features,
      compatibility: product.compatibility,
      keywords: product.keywords,
      licensingNotes: product.licensingNotes ?? null,
      deliveryNotes: product.deliveryNotes ?? null,
      supportNotes: product.supportNotes ?? null,
      searchText: buildSearchText({
        name: product.name,
        brandName,
        categoryName,
        keywords: product.keywords,
        skus: product.variants.map((variant) => variant.sku),
        shortDescription: product.shortDescription,
      }),
    } satisfies Prisma.ProductUncheckedCreateInput;

    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      create: data,
      update: data,
    });

    for (const variant of product.variants) {
      const variantData = {
        productId: record.id,
        sku: variant.sku,
        name: variant.name,
        licenceType: variant.licenceType,
        termMonths: variant.termMonths,
        seats: variant.seats ?? 1,
        isDefault: variant.isDefault ?? false,
        currency: "INR",
        listPriceMinor: variant.listPriceMinor,
        salePriceMinor: variant.salePriceMinor ?? null,
        gstRatePercent: variant.gstRatePercent ?? 18,
      };
      const variantRecord = await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        create: variantData,
        update: variantData,
      });

      // Seed an initial price-history row so the audit trail starts populated.
      const priceCount = await prisma.price.count({ where: { variantId: variantRecord.id } });
      if (priceCount === 0) {
        await prisma.price.create({
          data: {
            variantId: variantRecord.id,
            currency: "INR",
            listPriceMinor: variantData.listPriceMinor,
            salePriceMinor: variantData.salePriceMinor,
            gstRatePercent: variantData.gstRatePercent,
            note: "Initial catalogue price (indicative seed data).",
          },
        });
      }
    }

    if (product.faqs?.length) {
      await prisma.faq.deleteMany({ where: { productId: record.id } });
      await prisma.faq.createMany({
        data: product.faqs.map((faq, index) => ({
          productId: record.id,
          question: faq.question,
          answer: faq.answer,
          displayOrder: (index + 1) * 10,
        })),
      });
    }
  }

  console.log(`Seeding ${services.length} services…`);
  for (const service of services) {
    const { faqs, ...serviceData } = service;
    const record = await prisma.service.upsert({
      where: { slug: service.slug },
      create: { ...serviceData, featured: service.featured ?? false, published: true },
      update: { ...serviceData, featured: service.featured ?? false, published: true },
    });
    await prisma.faq.deleteMany({ where: { serviceId: record.id } });
    await prisma.faq.createMany({
      data: faqs.map((faq, index) => ({
        serviceId: record.id,
        question: faq.question,
        answer: faq.answer,
        displayOrder: (index + 1) * 10,
      })),
    });
  }

  console.log("Seeding brand FAQs…");
  const brandFaqs: Record<string, Array<{ question: string; answer: string }>> = {
    microsoft: [
      { question: "Can you transfer our existing Microsoft tenant to your billing?", answer: "Yes. Moving the billing relationship to a Cloud Solution Provider is an administrative change. Your tenant, data, configuration and users are unaffected, and there is no downtime." },
      { question: "Do you supply both subscription and perpetual Microsoft licensing?", answer: "Yes. Subscriptions through CSP, and perpetual licences such as Windows Server, SQL Server and Office LTSC through volume licensing. We will price both where both are viable for your scenario." },
      { question: "Can seat counts be reduced mid-term?", answer: "Additions can be made at any time. Reductions take effect at the subscription anniversary, which is why the renewal date is the point at which a genuine review is worth doing." },
    ],
    adobe: [
      { question: "What is the difference between Teams and Enterprise licensing?", answer: "Teams uses Adobe-managed identities with a straightforward admin console and suits most organisations. Enterprise adds federated single sign-on against your directory, enterprise-owned storage and managed deployment, and generally becomes worthwhile above roughly fifty seats." },
      { question: "Can we mix All Apps and Single App seats?", answer: "Yes, within one team agreement, on one renewal date. It is usually the most economical arrangement: All Apps for people who use several applications, Single App for specialists." },
    ],
    autodesk: [
      { question: "How does named-user licensing affect occasional users?", answer: "Each person who opens the software needs their own subscription; seats cannot be shared or pooled. For genuinely occasional users this changed the economics considerably, and it is worth reviewing whether a viewer or a web workflow serves them instead." },
      { question: "Is a collection better value than individual products?", answer: "Once a user needs two or more Autodesk products it usually is, and the collection also covers occasional use of tools nobody would buy outright. We will price both against your actual product mix." },
    ],
    zoho: [
      { question: "Can you migrate our data from an existing system?", answer: "Yes. Migration into Zoho CRM, Books, Desk and Mail from most mainstream platforms is a standard engagement. The work that determines success is field mapping and deciding what not to bring across." },
      { question: "Is Zoho One better value than individual applications?", answer: "It depends on how many applications will genuinely be adopted. Zoho One is priced per employee across the whole organisation, so it is excellent value for broad adoption and poor value for two or three applications. We will model both." },
    ],
    sketchup: [
      { question: "What is the difference between Pro and Studio?", answer: "Studio adds V-Ray rendering and Scan Essentials for point cloud data. If rendering is outsourced and you do not work from survey scans, Pro is sufficient and considerably cheaper." },
    ],
    corel: [
      { question: "Is CorelDRAW still available as a perpetual licence?", answer: "Yes. It is one of the few remaining mainstream creative products offered perpetually. Perpetual licences receive maintenance fixes but not new features; the subscription always runs the current release." },
    ],
    hpe: [
      { question: "Why is hardware quoted rather than priced online?", answer: "The configuration determines the price, and the spread between a minimal and a well-specified build of the same chassis is large. A headline figure against an unstated configuration would be misleading." },
    ],
    dell: [
      { question: "How do you size a workstation for CAD?", answer: "Against the specific software. Revit rewards single-thread performance and memory; video editing rewards GPU and storage throughput; simulation rewards core count. The same budget spent differently produces very different results, so we ask what it will run before quoting." },
    ],
  };

  for (const [slug, faqs] of Object.entries(brandFaqs)) {
    const brandId = brandIds.get(slug);
    if (!brandId) continue;
    await prisma.faq.deleteMany({ where: { brandId } });
    await prisma.faq.createMany({
      data: faqs.map((faq, index) => ({
        brandId,
        question: faq.question,
        answer: faq.answer,
        displayOrder: (index + 1) * 10,
      })),
    });
  }

  console.log("Seeding topic FAQs…");
  const topicFaqs: Array<{ topic: string; question: string; answer: string }> = [
    { topic: "enterprise", question: "Can you supply multiple vendors on one purchase order?", answer: "Yes. That is the core of what we do: one itemised quotation covering several publishers and hardware vendors, one purchase order, and one GST invoice." },
    { topic: "enterprise", question: "Do you provide GST invoices?", answer: "Yes. Every invoice is a compliant GST tax invoice with your GSTIN and registered legal name recorded, so input credit can be claimed without a reconciliation problem." },
    { topic: "enterprise", question: "How long does a quotation take?", answer: "Standard software licensing quotations are typically returned within one business day. Configured hardware and multi-vendor solutions depend on vendor response and are given a stated turnaround when the enquiry is acknowledged." },
    { topic: "enterprise", question: "Can renewals be consolidated onto one date?", answer: "Often, yes. Co-terminating subscriptions onto a common anniversary is possible with most publishers and reduces administrative overhead considerably. It usually involves a prorated adjustment in the first term, which we show before proceeding." },
    { topic: "microsoft-licensing", question: "What is the Cloud Solution Provider programme?", answer: "CSP is Microsoft's partner-led purchasing route. Licences are bought through a partner who handles billing, provisioning and support, typically on annual terms with the ability to add seats at any point." },
    { topic: "microsoft-licensing", question: "When is an Enterprise Agreement worth considering?", answer: "Generally above 500 seats with a stable headcount, where the three-year price protection and Software Assurance benefits outweigh the commitment. Between 250 and 500 seats both should be modelled across the full term before deciding." },
    { topic: "microsoft-licensing", question: "What is Software Assurance and do we need it?", answer: "Software Assurance adds upgrade rights, licence mobility and deployment benefits to volume licences. Licence mobility in particular matters if you intend to run those licences on cloud infrastructure - without it, the licence cannot move." },
  ];
  for (const faq of topicFaqs) {
    const exists = await prisma.faq.findFirst({
      where: { topic: faq.topic, question: faq.question },
    });
    if (!exists) await prisma.faq.create({ data: faq });
  }

  console.log(`Seeding ${blogPosts.length} blog posts…`);
  for (const post of blogPosts) {
    const publishedAt = new Date(Date.now() - post.daysAgo * 24 * 60 * 60 * 1000);
    const data = {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      tags: post.tags,
      readMinutes: post.readMinutes,
      status: "PUBLISHED" as const,
      publishedAt,
    };
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      create: data,
      update: data,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 10) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: {
        email: adminEmail,
        name: "Administrator",
        passwordHash,
        role: "ADMIN",
        emailVerified: new Date(),
      },
      update: { role: "ADMIN" },
    });
    console.log(`Administrator ready: ${adminEmail}`);
  } else {
    console.log(
      "No administrator seeded. Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 10 characters to bootstrap one.",
    );
  }

  const counts = {
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    services: await prisma.service.count(),
    posts: await prisma.blogPost.count(),
    faqs: await prisma.faq.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
