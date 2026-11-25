import { createHash } from "node:crypto";

import type { ContentMigration } from "./types";

/**
 * Sophos and SonicWall hardware, as quote-only family pages.
 *
 * Ten families, created once, written from general knowledge of each manufacturer's
 * hardware range because neither manufacturer's site could be read from this
 * environment. They are family pages, not model pages: no model numbers, throughput
 * figures, specifications or prices. Each has a single "Configured to requirement"
 * variant at price zero, the catalogue's way of saying "price on request". A family
 * that already exists under its slug is left exactly as the admin panel has it.
 *
 * Which families TechZoid quotes is the owner's to confirm. Hardware only: endpoint,
 * email, cloud and subscription products are left out.
 */

const DELIVERY =
  "Hardware is configured to the agreed bill of materials and shipped from the manufacturer or distributor. Lead times are confirmed in writing on the quotation before order placement.";
const SUPPORT = "Quoted with the support contract and its term stated on the quotation.";

type Family = {
  brand: "sophos" | "sonicwall";
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  features: string[];
  compatibility: string[];
  keywords: string[];
};

const quoteTail = (brand: string, factors: string) =>
  `\n\nModels, part numbers and configurations within the family differ, and ${brand} hardware is bought by exact model, security subscription bundle and support level. We settle ${factors} with you and quote the hardware, the subscriptions and the support contract together on a written quotation with a GST invoice.`;

const FAMILIES: Family[] = [
  {
    brand: "sophos",
    slug: "sophos-xgs-series-firewalls",
    name: "Sophos XGS Series Firewalls",
    shortDescription: "Sophos next-generation firewall appliances, from desktop units to rack-mounted models.",
    description:
      "The XGS Series is Sophos's range of next-generation firewall appliances, running Sophos Firewall software and managed locally or from Sophos Central. Models range from small desktop units for branch offices to rack-mounted appliances for larger networks." +
      quoteTail("Sophos", "the number of users and sites, the throughput you need with inspection switched on and the subscriptions you want"),
    features: ["Next-generation firewall appliances", "Managed locally or from Sophos Central", "Desktop and rack-mounted models", "Quoted with security subscriptions and support"],
    compatibility: ["Sophos Central management", "Sophos access points, switches and remote Ethernet devices"],
    keywords: ["Sophos XGS", "Sophos firewall India", "Sophos XGS price India", "Sophos next-generation firewall"],
  },
  {
    brand: "sophos",
    slug: "sophos-apx-series-access-points",
    name: "Sophos APX Series Access Points",
    shortDescription: "Sophos Wi-Fi access points managed alongside Sophos firewalls and from Sophos Central.",
    description:
      "The APX Series is Sophos's range of Wi-Fi access points, designed to be managed together with a Sophos firewall or from Sophos Central. The number and placement of access points comes from a site survey and the device count, not floor area alone." +
      quoteTail("Sophos", "coverage and capacity, the Wi-Fi generation and the management route"),
    features: ["Enterprise Wi-Fi access points", "Managed with Sophos firewalls or Sophos Central", "Power over Ethernet powered", "Sized from a site survey"],
    compatibility: ["Power over Ethernet switches", "Sophos firewalls and Sophos Central"],
    keywords: ["Sophos APX", "Sophos access point India", "Sophos Wi-Fi", "Sophos APX price India"],
  },
  {
    brand: "sophos",
    slug: "sophos-switch-series",
    name: "Sophos Switch Series",
    shortDescription: "Sophos managed Ethernet switches, administered from Sophos Central.",
    description:
      "The Sophos Switch range is a set of managed Ethernet switches, administered from Sophos Central alongside Sophos firewalls and access points. They suit small and mid-sized sites that want one console for the network and its security." +
      quoteTail("Sophos", "the port count, the Power over Ethernet budget and the uplinks"),
    features: ["Managed Ethernet switching", "Administered from Sophos Central", "Power over Ethernet models", "Quoted with support"],
    compatibility: ["Sophos Central management", "Standard Ethernet and PoE devices"],
    keywords: ["Sophos switch", "Sophos switch India", "Sophos managed switch", "Sophos Central switch"],
  },
  {
    brand: "sophos",
    slug: "sophos-sd-red-remote-ethernet-devices",
    name: "Sophos SD-RED Remote Ethernet Devices",
    shortDescription: "Small Sophos devices that connect a remote site's network back to a Sophos firewall.",
    description:
      "SD-RED, the Sophos Remote Ethernet Device, is a small appliance that connects a remote office or site back to a Sophos firewall over a secure tunnel, so the site is protected by the central firewall without a full firewall on site." +
      quoteTail("Sophos", "the number of remote sites and the Sophos firewall at the centre"),
    features: ["Connects remote sites to a Sophos firewall", "Secure tunnel back to the central firewall", "Small, simple to deploy", "Quoted with support"],
    compatibility: ["Sophos firewalls"],
    keywords: ["Sophos SD-RED", "Sophos RED", "Sophos remote office", "Sophos SD-RED price India"],
  },
  {
    brand: "sonicwall",
    slug: "sonicwall-tz-series-firewalls",
    name: "SonicWall TZ Series Firewalls",
    shortDescription: "SonicWall next-generation firewalls for small businesses, branch offices and retail sites.",
    description:
      "The TZ Series is SonicWall's range of desktop next-generation firewalls for small businesses, branch offices and retail and distributed sites, with VPN and security services delivered through SonicWall's subscriptions." +
      quoteTail("SonicWall", "the number of users and sites, the throughput you need with inspection switched on and the subscriptions you want"),
    features: ["Desktop next-generation firewalls", "VPN and security services by subscription", "Suited to small and branch sites", "Quoted with subscriptions and support"],
    compatibility: ["SonicWall access points and switches", "Standard IP networks"],
    keywords: ["SonicWall TZ", "SonicWall firewall India", "SonicWall TZ price India", "SonicWall next-generation firewall"],
  },
  {
    brand: "sonicwall",
    slug: "sonicwall-nsa-series-firewalls",
    name: "SonicWall NSa Series Firewalls",
    shortDescription: "SonicWall next-generation firewalls for mid-sized organisations and campus networks.",
    description:
      "The NSa Series is SonicWall's range of next-generation firewalls for mid-sized organisations and campus and branch-aggregation deployments, with higher capacity than the TZ Series." +
      quoteTail("SonicWall", "throughput with inspection switched on, the number of VPN users and the interfaces required"),
    features: ["Next-generation firewalls for mid-sized networks", "Higher capacity than the TZ Series", "VPN and security services by subscription", "Quoted with subscriptions and support"],
    compatibility: ["SonicWall access points and switches", "Standard IP networks"],
    keywords: ["SonicWall NSa", "SonicWall NSa price India", "SonicWall mid-range firewall", "SonicWall firewall India"],
  },
  {
    brand: "sonicwall",
    slug: "sonicwall-nssp-series-firewalls",
    name: "SonicWall NSsp Series Firewalls",
    shortDescription: "SonicWall high-end firewalls for large enterprises, data centres and service providers.",
    description:
      "The NSsp Series is SonicWall's range of high-end firewalls for large enterprises, data centres and service providers, built for high throughput and connection counts." +
      quoteTail("SonicWall", "throughput, port speeds, redundancy and the interfaces required"),
    features: ["High-end firewalls for large networks", "High throughput and connection capacity", "Redundancy options", "Quoted with subscriptions and support"],
    compatibility: ["SonicWall management platforms", "Standard IP networks"],
    keywords: ["SonicWall NSsp", "SonicWall NSsp price India", "SonicWall data centre firewall", "SonicWall high-end firewall"],
  },
  {
    brand: "sonicwall",
    slug: "sonicwall-sonicwave-access-points",
    name: "SonicWall SonicWave Access Points",
    shortDescription: "SonicWall Wi-Fi access points managed alongside SonicWall firewalls or from the cloud.",
    description:
      "SonicWave is SonicWall's range of Wi-Fi access points, managed from a SonicWall firewall or from SonicWall's cloud management. The number and placement of access points follows from a site survey and the device count." +
      quoteTail("SonicWall", "coverage and capacity, the Wi-Fi generation and the management route"),
    features: ["Enterprise Wi-Fi access points", "Managed with SonicWall firewalls or from the cloud", "Power over Ethernet powered", "Sized from a site survey"],
    compatibility: ["Power over Ethernet switches", "SonicWall firewalls"],
    keywords: ["SonicWall SonicWave", "SonicWall access point India", "SonicWall Wi-Fi", "SonicWave price India"],
  },
  {
    brand: "sonicwall",
    slug: "sonicwall-switch-series",
    name: "SonicWall Switch Series",
    shortDescription: "SonicWall managed Ethernet switches, administered alongside SonicWall firewalls.",
    description:
      "The SonicWall Switch range is a set of managed Ethernet switches, administered alongside SonicWall firewalls and access points so the network and its security share one management view." +
      quoteTail("SonicWall", "the port count, the Power over Ethernet budget and the uplinks"),
    features: ["Managed Ethernet switching", "Administered alongside SonicWall firewalls", "Power over Ethernet models", "Quoted with support"],
    compatibility: ["SonicWall firewalls and access points", "Standard Ethernet and PoE devices"],
    keywords: ["SonicWall switch", "SonicWall switch India", "SonicWall managed switch", "SonicWall SWS"],
  },
  {
    brand: "sonicwall",
    slug: "sonicwall-sma-series-secure-mobile-access",
    name: "SonicWall SMA Series Secure Mobile Access",
    shortDescription: "SonicWall appliances that give remote and mobile users secure access to company resources.",
    description:
      "The SMA Series is SonicWall's range of secure remote-access appliances, giving remote and mobile users controlled access to company applications and data, and available as hardware and as virtual appliances." +
      quoteTail("SonicWall", "the number of concurrent remote users, the applications to publish and the authentication methods"),
    features: ["Secure remote access for users", "Hardware and virtual appliances", "Controlled access to applications", "Quoted with licences and support"],
    compatibility: ["Company directories and authentication services", "SonicWall firewalls"],
    keywords: ["SonicWall SMA", "SonicWall secure mobile access", "SonicWall remote access India", "SonicWall SMA price India"],
  },
];

export const sophosSonicwallHardware: ContentMigration = {
  id: "2026-11-sophos-sonicwall-hardware",
  describe: "ten Sophos and SonicWall hardware families as quote-only products",

  async apply(prisma) {
    const category = await prisma.category.findUnique({ where: { slug: "networking" }, select: { id: true } });
    if (!category) return "no networking category";
    const brands = new Map<string, string>();
    for (const slug of ["sophos", "sonicwall"]) {
      const row = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
      if (row) brands.set(slug, row.id);
    }
    let created = 0;
    for (const family of FAMILIES) {
      const brandId = brands.get(family.brand);
      if (!brandId) continue;
      if (await prisma.product.findUnique({ where: { slug: family.slug }, select: { id: true } })) continue;
      await prisma.product.create({
        data: {
          slug: family.slug,
          name: family.name,
          shortDescription: family.shortDescription,
          description: family.description,
          brandId,
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
                sku: `${family.brand === "sophos" ? "SPH" : "SNW"}-${createHash("sha1").update(family.slug).digest("hex").slice(0, 8).toUpperCase()}`,
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
    return created > 0 ? `${created} Sophos and SonicWall hardware families created (price on request)` : "nothing to do";
  },
};
