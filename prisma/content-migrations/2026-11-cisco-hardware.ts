import { createHash } from "node:crypto";

import type { ContentMigration } from "./types";
import { CISCO_SERIES } from "./cisco-series.generated";

/**
 * Cisco hardware, one quote-only product per series on Cisco's own A-Z series index.
 *
 * The series names come from https://www.cisco.com/c/en/us/products/a-to-z-series-index.html
 * (saved in `scripts/data/cisco-a-to-z-series.json`); `scripts/build-cisco-series.py` turns
 * them into `cisco-series.generated.ts`. Hardware only: management software, voice
 * software, carrier optical transport and mobile-core platforms are left out.
 *
 * Each series is one product with a single "Configured to requirement" variant at price
 * zero, the catalogue's way of saying "price on request". There are no part numbers,
 * specifications or prices: Cisco hardware is bought by exact part number, licence term and
 * support level, settled on a written quotation. A series that already exists under its
 * slug is left exactly as the admin panel has it.
 */

const DELIVERY =
  "Hardware is configured to the agreed bill of materials and shipped from the manufacturer or distributor. Lead times are confirmed in writing on the quotation before order placement.";
const SUPPORT = "Quoted with the support contract and its term stated on the quotation.";

export const ciscoHardware: ContentMigration = {
  id: "2026-11-cisco-hardware",
  describe: "Cisco hardware series from Cisco's A-Z index as quote-only products",

  async apply(prisma) {
    const cisco = await prisma.brand.findUnique({ where: { slug: "cisco" }, select: { id: true } });
    if (!cisco) return "no Cisco brand record";
    let created = 0;
    for (const family of CISCO_SERIES) {
      if (await prisma.product.findUnique({ where: { slug: family.slug }, select: { id: true } })) continue;
      const category = await prisma.category.findUnique({ where: { slug: family.category }, select: { id: true } });
      if (!category) continue;
      await prisma.product.create({
        data: {
          slug: family.slug,
          name: family.name,
          shortDescription: family.shortDescription,
          description: family.description,
          brandId: cisco.id,
          categoryId: category.id,
          status: "ACTIVE",
          availability: "MADE_TO_ORDER",
          purchaseMode: "ENQUIRY",
          popularity: 40,
          features: family.features,
          compatibility: family.compatibility,
          keywords: family.keywords,
          deliveryNotes: DELIVERY,
          supportNotes: SUPPORT,
          variants: {
            create: [
              {
                sku: `CSC-${createHash("sha1").update(family.slug).digest("hex").slice(0, 8).toUpperCase()}`,
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
    return created > 0 ? `${created} Cisco hardware series created (price on request)` : "nothing to do";
  },
};
