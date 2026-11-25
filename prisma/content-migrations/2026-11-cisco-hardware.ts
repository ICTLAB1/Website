import type { ContentMigration } from "./types";

/**
 * Cisco network hardware, as quote-only family pages.
 *
 * Eleven product families, created once. Each is one product with a single
 * "Configured to requirement" variant at price zero, the catalogue's way of saying
 * "price on request" — the same shape as the HPE Aruba switch. There are no part
 * numbers, specifications or prices here: Cisco hardware is bought by exact part
 * number, licence term and support level, and those are settled on a written
 * quotation. A family that already exists under its slug is left exactly as the
 * admin panel has it.
 *
 * The descriptions say what each family is for, in words written for this site.
 * Which families TechZoid actually quotes is the owner's to confirm.
 */

const DELIVERY =
  "Hardware is configured to the agreed bill of materials and shipped from the manufacturer or distributor. Lead times are confirmed in writing on the quotation before order placement.";
const SUPPORT = "Quoted with the support contract and its term stated on the quotation.";

type Family = {
  slug: string;
  name: string;
  category: "networking";
  shortDescription: string;
  description: string;
  features: string[];
  compatibility: string[];
  keywords: string[];
  popularity: number;
};

const FAMILIES: Family[] = [
  {
    slug: "cisco-catalyst-1000-series-switches",
    name: "Cisco Catalyst 1000 Series Switches",
    category: "networking",
    shortDescription: "Fixed-configuration managed switches for small offices and branch access networks.",
    description:
      "The Catalyst 1000 Series is Cisco's entry range of managed access switches, aimed at small sites, branch offices and schools that want Cisco switching without a campus-scale design.\n\nPort count, Power over Ethernet budget and uplink type are the decisions that matter, and we settle them against the device count you have and the growth you expect over the switch's life. Models, part numbers and support terms are confirmed on a written quotation.",
    features: ["Managed Layer 2 access switching", "Power over Ethernet models for phones, access points and cameras", "Fixed configuration, so no modules to plan", "Sized by port count, PoE budget and uplinks"],
    compatibility: ["Standard Ethernet and PoE devices"],
    keywords: ["Cisco Catalyst 1000", "Cisco switch India", "Cisco access switch", "Cisco Catalyst 1000 price India"],
    popularity: 46,
  },
  {
    slug: "cisco-catalyst-9200-series-switches",
    name: "Cisco Catalyst 9200 Series Switches",
    category: "networking",
    shortDescription: "Campus access switches in the Catalyst 9000 family, with Power over Ethernet options.",
    description:
      "The Catalyst 9200 Series sits in Cisco's Catalyst 9000 family as a campus access switch, used where staff, phones, cameras and access points connect to the network.\n\nThe right model depends on port count, Power over Ethernet budget, uplink speed and whether you want stacking or a fixed unit. Catalyst 9000 switches are sold with a network licence and a support contract whose term affects the price, so we quote the hardware, the licence and the support together.",
    features: ["Campus access switching", "Power over Ethernet models", "Catalyst 9000 family management and security features", "Quoted with network licence and support term"],
    compatibility: ["Standard Ethernet and PoE devices", "Works alongside Catalyst 9000 access and aggregation switches"],
    keywords: ["Cisco Catalyst 9200", "Catalyst 9200 price India", "Cisco campus switch", "Cisco access switch India"],
    popularity: 52,
  },
  {
    slug: "cisco-catalyst-9300-series-switches",
    name: "Cisco Catalyst 9300 Series Switches",
    category: "networking",
    shortDescription: "Stackable campus access switches in the Catalyst 9000 family, for larger sites and closets.",
    description:
      "The Catalyst 9300 Series is a stackable access switch in Cisco's Catalyst 9000 family, used in larger campus wiring closets where several switches are managed as one unit.\n\nSelection turns on port density, Power over Ethernet budget, uplink modules, stacking needs and the licence tier. The network licence and support contract are part of the price, so we quote the switch, the licence and the support term on one written quotation.",
    features: ["Stackable campus access switching", "Modular uplinks on supported models", "Power over Ethernet models", "Quoted with network licence and support term"],
    compatibility: ["Standard Ethernet and PoE devices", "Stacks with other Catalyst 9300 switches"],
    keywords: ["Cisco Catalyst 9300", "Catalyst 9300 price India", "Cisco stackable switch", "Cisco campus switch India"],
    popularity: 58,
  },
  {
    slug: "cisco-catalyst-9500-series-switches",
    name: "Cisco Catalyst 9500 Series Switches",
    category: "networking",
    shortDescription: "High-speed aggregation and core switches in the Catalyst 9000 family.",
    description:
      "The Catalyst 9500 Series is a fixed-configuration core and aggregation switch in Cisco's Catalyst 9000 family, used to join access switches to each other and to the data centre or internet edge.\n\nBuyers choose by uplink speed, port mix, redundancy and the licence tier. Because Cisco sells these with a network licence and a support contract, the hardware price alone is not the price, and we quote all three together.",
    features: ["Core and aggregation switching", "High-speed uplinks and redundant power options", "Catalyst 9000 family management and security features", "Quoted with network licence and support term"],
    compatibility: ["Catalyst 9000 access switches", "Fibre and copper uplinks, by model"],
    keywords: ["Cisco Catalyst 9500", "Catalyst 9500 price India", "Cisco core switch", "Cisco aggregation switch"],
    popularity: 44,
  },
  {
    slug: "cisco-catalyst-9100-series-access-points",
    name: "Cisco Catalyst 9100 Series Access Points",
    category: "networking",
    shortDescription: "Enterprise Wi-Fi access points in the Catalyst 9000 family.",
    description:
      "The Catalyst 9100 Series is Cisco's family of enterprise Wi-Fi access points for offices, campuses and public venues, designed to be managed alongside Catalyst switching.\n\nThe number and placement of access points follows from a site survey and the number of devices, not from floor area alone. Models differ in Wi-Fi generation and radio design, and the controller or cloud management you use affects the licence. We quote the access points, licensing and support together.",
    features: ["Enterprise Wi-Fi access points", "Managed alongside Catalyst switching", "Power over Ethernet powered", "Sized from a site survey"],
    compatibility: ["Power over Ethernet switches", "Cisco wireless management platforms"],
    keywords: ["Cisco Catalyst 9100", "Cisco access point India", "Cisco Wi-Fi", "Cisco wireless access point price"],
    popularity: 42,
  },
  {
    slug: "cisco-meraki-mx-security-appliances",
    name: "Cisco Meraki MX Security Appliances",
    category: "networking",
    shortDescription: "Cloud-managed security and SD-WAN appliances for branch offices and small to mid-sized sites.",
    description:
      "Meraki MX appliances combine a firewall, VPN and SD-WAN in one cloud-managed unit, administered from the Meraki dashboard rather than a local console. They suit organisations with many small sites and few network engineers.\n\nMeraki hardware runs under a per-device Meraki licence, so the licence term is part of the cost alongside the appliance. Model choice follows the number of users and the throughput you need with security features switched on; we confirm both on a written quotation.",
    features: ["Firewall, VPN and SD-WAN in one appliance", "Managed from the Meraki cloud dashboard", "Suited to many-site organisations", "Quoted with the Meraki licence term"],
    compatibility: ["Meraki MS switches and MR access points", "Managed from one Meraki dashboard"],
    keywords: ["Cisco Meraki MX", "Meraki firewall India", "Meraki SD-WAN", "Meraki MX price India"],
    popularity: 56,
  },
  {
    slug: "cisco-meraki-ms-switches",
    name: "Cisco Meraki MS Switches",
    category: "networking",
    shortDescription: "Cloud-managed access and aggregation switches administered from the Meraki dashboard.",
    description:
      "Meraki MS switches are cloud-managed access and aggregation switches, configured and monitored from the same dashboard as Meraki firewalls and access points.\n\nThe decision points are port count, Power over Ethernet budget, uplink speed and stacking. Meraki hardware runs under a per-device Meraki licence, so we quote the switch and the licence term together.",
    features: ["Cloud-managed switching", "Power over Ethernet models", "One dashboard with Meraki firewalls and access points", "Quoted with the Meraki licence term"],
    compatibility: ["Meraki MX appliances and MR access points", "Standard Ethernet and PoE devices"],
    keywords: ["Cisco Meraki MS", "Meraki switch India", "Meraki cloud switch", "Meraki MS price India"],
    popularity: 48,
  },
  {
    slug: "cisco-meraki-mr-access-points",
    name: "Cisco Meraki MR Access Points",
    category: "networking",
    shortDescription: "Cloud-managed Wi-Fi access points administered from the Meraki dashboard.",
    description:
      "Meraki MR access points are cloud-managed Wi-Fi access points, set up and monitored from the Meraki dashboard alongside Meraki security appliances and switches.\n\nHow many you need and where they go comes from a site survey and the number of devices. Meraki hardware runs under a per-device Meraki licence, so we quote the access points and the licence term together.",
    features: ["Cloud-managed Wi-Fi", "Power over Ethernet powered", "One dashboard with Meraki switches and security appliances", "Quoted with the Meraki licence term"],
    compatibility: ["Meraki MX appliances and MS switches", "Power over Ethernet switches"],
    keywords: ["Cisco Meraki MR", "Meraki access point India", "Meraki Wi-Fi", "Meraki MR price India"],
    popularity: 50,
  },
  {
    slug: "cisco-secure-firewall-appliances",
    name: "Cisco Secure Firewall Appliances",
    category: "networking",
    shortDescription: "Cisco's next-generation firewall appliances for traditional, locally managed firewall deployments.",
    description:
      "Cisco Secure Firewall appliances are Cisco's next-generation firewalls, for organisations that want deep traffic inspection and traditional firewall management rather than the cloud-managed Meraki route.\n\nModel selection turns on throughput with inspection switched on, the number of sites and VPN users, and which security subscriptions you want. The subscriptions and support contract are priced separately from the appliance, so we quote all three together on a written quotation.",
    features: ["Next-generation firewall appliances", "Traffic inspection and intrusion prevention, by subscription", "Site-to-site and remote-access VPN", "Quoted with security subscriptions and support"],
    compatibility: ["Cisco Catalyst switching and wireless", "Standard IP networks"],
    keywords: ["Cisco Secure Firewall", "Cisco firewall India", "Cisco Firepower", "Cisco firewall price India"],
    popularity: 54,
  },
  {
    slug: "cisco-nexus-9000-series-switches",
    name: "Cisco Nexus 9000 Series Switches",
    category: "networking",
    shortDescription: "Data-centre switches for server, storage and spine-and-leaf networks.",
    description:
      "The Nexus 9000 Series is Cisco's family of data-centre switches, used to connect servers and storage within a data centre and to join its racks in spine-and-leaf designs.\n\nChoice depends on port speeds, port density, the operating mode you intend to run and the support contract. These are specified against the server and storage estate, so we ask for the rack layout and speeds before quoting.",
    features: ["Data-centre switching", "High-speed server and uplink ports", "Spine-and-leaf designs", "Quoted against the server and storage estate"],
    compatibility: ["Rack servers with high-speed network cards", "Fibre and copper, by model"],
    keywords: ["Cisco Nexus 9000", "Cisco data centre switch", "Nexus 9000 price India", "Cisco Nexus India"],
    popularity: 40,
  },
  {
    slug: "cisco-catalyst-8000-series-edge-platforms",
    name: "Cisco Catalyst 8000 Series Edge Platforms",
    category: "networking",
    shortDescription: "Branch, WAN and internet-edge routers in the Catalyst 8000 family.",
    description:
      "The Catalyst 8000 Series is Cisco's family of edge routers for branch offices, WAN connectivity and the internet edge, including SD-WAN deployments.\n\nChoice follows the WAN bandwidth, the number of sites and whether the routers run traditional routing or SD-WAN. Cisco sells these with a software licence and support contract, so we quote the platform, licence and support together.",
    features: ["Branch and WAN edge routing", "SD-WAN capable", "Quoted with software licence and support", "Sized by WAN bandwidth and site count"],
    compatibility: ["Cisco Catalyst switching", "Standard WAN and internet circuits"],
    keywords: ["Cisco Catalyst 8000", "Cisco router India", "Cisco edge router", "Cisco SD-WAN router"],
    popularity: 38,
  },
];

export const ciscoHardware: ContentMigration = {
  id: "2026-11-cisco-hardware",
  describe: "eleven Cisco network hardware families as quote-only products",

  async apply(prisma) {
    const cisco = await prisma.brand.findUnique({ where: { slug: "cisco" }, select: { id: true } });
    if (!cisco) return "no Cisco brand record";
    let created = 0;
    for (const family of FAMILIES) {
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
          popularity: family.popularity,
          features: family.features,
          compatibility: family.compatibility,
          keywords: family.keywords,
          deliveryNotes: DELIVERY,
          supportNotes: SUPPORT,
          variants: {
            create: [
              {
                sku: `CSC-${family.slug.replace(/^cisco-/, "").toUpperCase().replace(/-(SERIES|SWITCHES|ACCESS|POINTS|SECURITY|APPLIANCES|EDGE|PLATFORMS)/g, "")}-CFG`,
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
    return created > 0 ? `${created} Cisco hardware families created (price on request)` : "nothing to do";
  },
};
