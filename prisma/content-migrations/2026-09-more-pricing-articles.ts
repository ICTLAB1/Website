import type { ContentMigration } from "./types";

/**
 * Two more long-tail pricing articles, in the same spirit as
 * `2026-09-pricing-articles`: a separate migration rather than an addition to
 * that one, because a migration is recorded as applied once it runs and
 * these two did not exist yet at that point.
 *
 * The Windows Server article is deliberately a companion to the existing
 * `/windows-server` page rather than a duplicate of it: that page explains
 * the core-counting and Standard-vs-Datacenter model in depth and
 * intentionally states no rupee figure, pushing to an enquiry instead. This
 * article is the concrete number that page leaves open, and links back to it
 * for the parts of the decision that aren't just arithmetic.
 *
 * The Windows 11 article answers a keyword this domain already ranks for
 * ("windows 11 pro for business", position 18 at the time of the competitor
 * audit that prompted this batch) with a page dedicated to the actual SKU
 * sold — an upgrade licence, not a fresh one, which the article says plainly
 * rather than let the query intent and the product mismatch silently.
 */
const ARTICLES = [
  {
    slug: "windows-server-2025-core-licence-price-in-india",
    title: "Windows Server 2025 core licence price in India",
    excerpt:
      "It is licensed by physical core, not by server — so the per-pack price only tells half the story until you know how many packs a real server needs.",
    category: "Microsoft Licensing",
    tags: ["windows server", "pricing", "licensing", "core licensing"],
    readMinutes: 4,
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
    body: `The licence most people searching for "Windows 11 Pro price" actually want is not a fresh Windows 11 Pro licence — it is an upgrade from the Home edition already on the machine, and the two are priced, and licensed, differently.

## What this licence is

Most business laptops and desktops already ship with Windows 11 Home. The upgrade licence — ₹15,600 per device, excluding GST — unlocks Pro features on that same installation: joining a domain or Azure AD, BitLocker device encryption, Remote Desktop as a host, and Group Policy management. It is a one-time, perpetual purchase rather than a subscription, and it is licensed per device rather than per user.

## What GST adds

At 18%, the upgrade comes to about ₹18,408 per device. GST is invoiced separately and is fully creditable for a registered business.

## Why "upgrade" matters here

A genuinely new Windows 11 Pro licence — for a machine with no Windows installed at all, or one currently running something else entirely — is a different product with a different price, and is not what this SKU covers. For the overwhelmingly common case, a business device bought with Home pre-installed, the upgrade licence is the correct and complete purchase: it changes the edition in place, keeps the existing activation, and needs no reinstall.

Current availability and full specification are on the [Windows 11 Pro Upgrade product page](/products/windows-11-pro-upgrade).`,
  },
];

export const morePricingArticles: ContentMigration = {
  id: "2026-09-more-pricing-articles",
  describe: "publish the Windows Server 2025 and Windows 11 Pro upgrade pricing articles",

  async apply(prisma) {
    const published: string[] = [];

    for (const article of ARTICLES) {
      const existing = await prisma.blogPost.findUnique({
        where: { slug: article.slug },
        select: { id: true },
      });
      // Written once. An edit made since is somebody's, and a re-run of this
      // must not quietly replace it.
      if (existing) continue;

      await prisma.blogPost.create({
        data: {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          body: article.body,
          category: article.category,
          tags: article.tags,
          status: "PUBLISHED",
          readMinutes: article.readMinutes,
          publishedAt: new Date(),
        },
      });
      published.push(article.slug);
    }

    if (published.length === 0) return "both pricing articles are already present";
    return `published ${published.length} pricing article(s): ${published.join(", ")}`;
  },
};
