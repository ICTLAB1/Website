import { createHash } from "node:crypto";

import type { ContentMigration } from "./types";
import { FORTINET_SERIES } from "./fortinet-series.generated";

/**
 * Fortinet hardware, one quote-only product per model or family Fortinet lists on its
 * own product pages.
 *
 * The FortiGate models, with their entry, mid-range and high-end tiers, come from
 * Fortinet's next-generation firewall page; the rugged firewall and switch models and
 * the FortiExtender units from its rugged and 5G/LTE pages; the other families from its
 * product index (saved in `scripts/data/fortinet-hardware-sources.json`).
 * `scripts/build-fortinet-series.py` turns them into `fortinet-series.generated.ts`.
 * Hardware only: cloud, SASE, SIEM, endpoint, subscription and service products are left out.
 *
 * Each is one product with a single "Configured to requirement" variant at price zero,
 * the catalogue's way of saying "price on request". No specifications, throughput figures
 * or prices: Fortinet hardware is bought by exact model, subscription bundle and support
 * level, settled on a written quotation. A product that already exists under its slug is
 * left exactly as the admin panel has it.
 */

const DELIVERY =
  "Hardware is configured to the agreed bill of materials and shipped from the manufacturer or distributor. Lead times are confirmed in writing on the quotation before order placement.";
const SUPPORT = "Quoted with the support contract and its term stated on the quotation.";

export const fortinetHardware: ContentMigration = {
  id: "2026-11-fortinet-hardware",
  describe: "Fortinet hardware models and families from Fortinet's own pages as quote-only products",

  async apply(prisma) {
    const fortinet = await prisma.brand.findUnique({ where: { slug: "fortinet" }, select: { id: true } });
    if (!fortinet) return "no Fortinet brand record";
    const category = await prisma.category.findUnique({ where: { slug: "networking" }, select: { id: true } });
    if (!category) return "no networking category";
    let created = 0;
    for (const item of FORTINET_SERIES) {
      if (await prisma.product.findUnique({ where: { slug: item.slug }, select: { id: true } })) continue;
      await prisma.product.create({
        data: {
          slug: item.slug,
          name: item.name,
          shortDescription: item.shortDescription,
          description: item.description,
          brandId: fortinet.id,
          categoryId: category.id,
          status: "ACTIVE",
          availability: "MADE_TO_ORDER",
          purchaseMode: "ENQUIRY",
          popularity: 40,
          features: item.features,
          compatibility: item.compatibility,
          keywords: item.keywords,
          deliveryNotes: DELIVERY,
          supportNotes: SUPPORT,
          variants: {
            create: [
              {
                sku: `FTN-${createHash("sha1").update(item.slug).digest("hex").slice(0, 8).toUpperCase()}`,
                name: "Configured to requirement",
                licenceType: "HARDWARE",
                audience: "COMMERCIAL",
                termMonths: null,
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
    return created > 0 ? `${created} Fortinet hardware products created (price on request)` : "nothing to do";
  },
};
