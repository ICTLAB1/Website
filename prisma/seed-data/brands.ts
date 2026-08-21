/**
 * Brand catalogue.
 *
 * Copy here is written for this application. Brand names and product names are
 * used descriptively to identify the software being resold; no publisher marketing
 * text, imagery or logo asset is reproduced.
 */
export type BrandSeed = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  description: string;
  logoText: string;
  accentColor: string;
  displayOrder: number;
  featured: boolean;
};

export const brands: BrandSeed[] = [
  {
    slug: "microsoft",
    name: "Microsoft",
    tagline: "Productivity, cloud and data platform licensing",
    summary:
      "Microsoft 365, Office, Windows, Windows Server, SQL Server, Dynamics 365 and Azure, supplied under the licensing programme that fits how your organisation buys.",
    description:
      "Microsoft licensing spans several purchasing programmes, and the right one depends on your organisation's size, contract appetite and how quickly your seat count changes. We supply Microsoft 365 and Office subscriptions, Windows and Windows Server, SQL Server, Dynamics 365 and Azure consumption, and we advise on whether a Cloud Solution Provider subscription, a volume licensing agreement or a perpetual purchase gives you the better commercial position over a three-year horizon.\n\nOur team handles tenant provisioning, licence assignment, mid-term seat changes and renewal planning, so the licensing you buy stays aligned with the people who actually need it.",
    logoText: "Microsoft",
    accentColor: "#0f6cbd",
    displayOrder: 10,
    featured: true,
  },
  {
    slug: "adobe",
    name: "Adobe",
    tagline: "Creative Cloud and document workflows for teams",
    summary:
      "Creative Cloud for teams and enterprise, Acrobat, and the individual creative applications, with centralised administration and deployment support.",
    description:
      "Adobe's business licensing separates named-user entitlements from the admin console that manages them, which is what makes it workable at scale: seats can be reassigned when people change roles, and deployment can be packaged rather than installed by hand.\n\nWe supply Creative Cloud for teams and enterprise, Acrobat for document workflows, and single applications where a full suite is not warranted. We help you decide which of those is genuinely cheaper for your mix of full-time designers, occasional users and reviewers who only need to comment on a PDF.",
    logoText: "Adobe",
    accentColor: "#e0342c",
    displayOrder: 20,
    featured: true,
  },
  {
    slug: "autodesk",
    name: "Autodesk",
    tagline: "Design, engineering and construction software",
    summary:
      "AutoCAD, Revit, the AEC and Product Design collections, Maya, Fusion and Autodesk Construction Cloud for design-led organisations.",
    description:
      "Autodesk software underpins the drawing, modelling and coordination work in architecture, engineering, construction and manufacturing. Its licensing has moved decisively to named-user subscriptions, which changes how teams should think about seat allocation: entitlements now follow people rather than machines.\n\nWe supply single-product subscriptions and the industry collections, and we help teams work out whether a collection is better value than three individual products once you count the people who dip into a second tool a few weeks a year.",
    logoText: "Autodesk",
    accentColor: "#0696d7",
    displayOrder: 30,
    featured: true,
  },
  {
    slug: "zoho",
    name: "Zoho",
    tagline: "Business applications for sales, finance and support",
    summary:
      "Zoho CRM, Books, Desk, Workplace, Mail and the Zoho One bundle, with implementation and data migration support.",
    description:
      "Zoho's appeal for mid-sized organisations is breadth at a predictable per-user cost: a single publisher covering CRM, accounting, service desk and collaboration, with the applications sharing a customer record rather than being stitched together after the fact.\n\nWe supply Zoho licensing and, just as importantly, the implementation work around it — data migration from an incumbent system, field mapping, workflow configuration and user onboarding — because a business application that is bought but not adopted returns nothing.",
    logoText: "Zoho",
    accentColor: "#e42527",
    displayOrder: 40,
    featured: true,
  },
  {
    slug: "sketchup",
    name: "SketchUp",
    tagline: "3D modelling for architecture and interiors",
    summary:
      "SketchUp Pro and Studio subscriptions for architectural visualisation, interior design and fabrication workflows.",
    description:
      "SketchUp occupies a useful position between sketching and full BIM: fast enough for early-stage massing and client-facing visuals, precise enough to hand off to a documentation tool later.\n\nWe supply Pro and Studio subscriptions for practices that model in SketchUp and coordinate elsewhere, along with guidance on extension licensing and shared file workflows across a studio.",
    logoText: "SketchUp",
    accentColor: "#c8102e",
    displayOrder: 50,
    featured: true,
  },
  {
    slug: "corel",
    name: "Corel",
    tagline: "Graphics and office productivity software",
    summary:
      "CorelDRAW Graphics Suite and WordPerfect Office, available as perpetual licences and subscriptions for print, signage and public-sector use.",
    description:
      "Corel remains the practical choice in workflows built around vector output for print, signage and apparel, where existing artwork libraries and operator familiarity carry real switching cost.\n\nIt is also one of the few remaining mainstream publishers offering genuine perpetual licensing, which matters to organisations with capital rather than operating budgets. We supply both models and can price them side by side across a realistic replacement cycle.",
    logoText: "Corel",
    accentColor: "#0a7c3f",
    displayOrder: 60,
    featured: true,
  },
  {
    slug: "hpe",
    name: "HPE",
    tagline: "Servers, storage and networking infrastructure",
    summary:
      "Hewlett Packard Enterprise compute, storage and networking, configured to workload with support contracts sized to your recovery objectives.",
    description:
      "Infrastructure decisions are harder to reverse than software ones, so the configuration matters more than the headline price. We quote HPE compute, storage and networking against the workload you are actually running — not a generic bill of materials.\n\nQuotes include the support tier and term, because a server without a matching response-time contract is a risk that only becomes visible at the worst moment.",
    logoText: "HPE",
    accentColor: "#01a982",
    displayOrder: 70,
    featured: true,
  },
  {
    slug: "dell",
    name: "Dell Technologies",
    tagline: "Enterprise compute, storage and workstations",
    summary:
      "Dell PowerEdge servers, storage arrays, networking and Precision workstations for design and engineering teams.",
    description:
      "Dell's enterprise range covers the ground from rack compute to the workstations that sit under a CAD or video editing workload, which makes it straightforward to standardise a mixed estate on one manufacturer and one support relationship.\n\nWe size workstations against the software they will run — a Revit model and a Premiere Pro timeline stress very different parts of a machine — and quote server and storage configurations with the support terms attached.",
    logoText: "Dell",
    accentColor: "#0076ce",
    displayOrder: 80,
    featured: true,
  },
];
