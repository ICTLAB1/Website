import { createHash } from "node:crypto";

import type { ContentMigration } from "./types";
import { MICROSOFT_PRODUCTS } from "./microsoft-products.generated";

/**
 * More of the Microsoft range, as quote-only products.
 *
 * Fifty-two established Microsoft commercial products the catalogue lacked: Microsoft
 * 365 Apps, frontline and Copilot plans, Exchange, SharePoint and Teams plans, Project and
 * Visio, Windows 11 Enterprise and Windows 365, Windows Server and SQL Server CALs,
 * Visual Studio, the Power Platform, Dynamics 365, and the Defender, Entra and Intune
 * security and identity products.
 *
 * Written from general knowledge because Microsoft's own pages could not be read from
 * this environment, so names and descriptions are for the owner to confirm. Each is created
 * once with a single variant at price zero — "price on request" — and never touched again:
 * a product that already exists under its slug is left exactly as the admin panel has it,
 * and nothing here prices anything.
 */
export const microsoftProducts: ContentMigration = {
  id: "2026-11-microsoft-products",
  describe: "more Microsoft products as quote-only pages",

  async apply(prisma) {
    const microsoft = await prisma.brand.findUnique({ where: { slug: "microsoft" }, select: { id: true } });
    if (!microsoft) return "no Microsoft brand record";
    const categories = new Map<string, string>();
    for (const row of await prisma.category.findMany({ select: { id: true, slug: true } })) categories.set(row.slug, row.id);
    let created = 0;
    for (const item of MICROSOFT_PRODUCTS) {
      const categoryId = categories.get(item.category);
      if (!categoryId) continue;
      if (await prisma.product.findUnique({ where: { slug: item.slug }, select: { id: true } })) continue;
      await prisma.product.create({
        data: {
          slug: item.slug,
          name: item.name,
          shortDescription: item.shortDescription,
          description: item.description,
          brandId: microsoft.id,
          categoryId,
          status: "ACTIVE",
          availability: "ON_REQUEST",
          purchaseMode: "ENQUIRY",
          popularity: 30,
          features: item.features,
          compatibility: item.compatibility,
          keywords: item.keywords,
          variants: {
            create: [
              {
                sku: `MS-${createHash("sha1").update(item.slug).digest("hex").slice(0, 8).toUpperCase()}`,
                name: item.termMonths ? `${item.name}, 1 year` : item.name,
                licenceType: item.licenceType,
                audience: "COMMERCIAL",
                termMonths: item.termMonths,
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
    return created > 0 ? `${created} Microsoft products created (price on request)` : "nothing to do";
  },
};
