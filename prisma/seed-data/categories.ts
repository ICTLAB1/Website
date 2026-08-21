export type CategorySeed = {
  slug: string;
  name: string;
  summary: string;
  icon: string;
  displayOrder: number;
  featured: boolean;
  children?: Array<Omit<CategorySeed, "children">>;
};

/**
 * A single global category tree. Products carry both a brand and a category, so
 * the catalogue can be browsed either way without duplicating the taxonomy per
 * brand.
 */
export const categories: CategorySeed[] = [
  {
    slug: "productivity-collaboration",
    name: "Productivity & Collaboration",
    summary:
      "Email, documents, meetings and shared workspaces for the whole organisation.",
    icon: "workspace",
    displayOrder: 10,
    featured: true,
    children: [
      { slug: "microsoft-365-plans", name: "Microsoft 365 Plans", summary: "Business and enterprise subscription plans.", icon: "workspace", displayOrder: 11, featured: true },
      { slug: "office-suites", name: "Office Suites", summary: "Perpetual and LTSC office applications.", icon: "document", displayOrder: 12, featured: false },
      { slug: "email-collaboration", name: "Email & Collaboration", summary: "Hosted mail, chat and shared workspaces.", icon: "mail", displayOrder: 13, featured: false },
    ],
  },
  {
    slug: "design-creative",
    name: "Design & Creative",
    summary: "Graphics, video, photography and publishing software for creative teams.",
    icon: "creative",
    displayOrder: 20,
    featured: true,
    children: [
      { slug: "creative-suites", name: "Creative Suites", summary: "Full creative application collections.", icon: "creative", displayOrder: 21, featured: true },
      { slug: "single-creative-apps", name: "Single Applications", summary: "Individual design, video and imaging tools.", icon: "creative", displayOrder: 22, featured: false },
      { slug: "document-workflow", name: "Document Workflow", summary: "PDF creation, review, signature and archiving.", icon: "document", displayOrder: 23, featured: true },
    ],
  },
  {
    slug: "engineering-cad",
    name: "Engineering & CAD",
    summary: "2D drafting, 3D modelling, BIM and simulation for design-led organisations.",
    icon: "cad",
    displayOrder: 30,
    featured: true,
    children: [
      { slug: "cad-drafting", name: "CAD & Drafting", summary: "2D and 3D drafting applications.", icon: "cad", displayOrder: 31, featured: true },
      { slug: "bim-collections", name: "BIM & Collections", summary: "Building information modelling and industry collections.", icon: "cad", displayOrder: 32, featured: true },
      { slug: "media-entertainment", name: "Media & Entertainment", summary: "Animation, visual effects and rendering.", icon: "media", displayOrder: 33, featured: false },
      { slug: "construction-management", name: "Construction Management", summary: "Field, coordination and project delivery platforms.", icon: "construction", displayOrder: 34, featured: false },
    ],
  },
  {
    slug: "business-applications",
    name: "Business Applications",
    summary: "CRM, accounting, service desk and operations platforms.",
    icon: "business",
    displayOrder: 40,
    featured: true,
    children: [
      { slug: "crm-sales", name: "CRM & Sales", summary: "Pipeline, contact and revenue management.", icon: "business", displayOrder: 41, featured: true },
      { slug: "finance-accounting", name: "Finance & Accounting", summary: "Bookkeeping, invoicing and GST compliance.", icon: "finance", displayOrder: 42, featured: false },
      { slug: "service-desk", name: "Service Desk", summary: "Customer support and ticketing platforms.", icon: "support", displayOrder: 43, featured: false },
      { slug: "business-suites", name: "Business Suites", summary: "Bundled application suites for the whole company.", icon: "business", displayOrder: 44, featured: false },
    ],
  },
  {
    slug: "operating-systems",
    name: "Operating Systems",
    summary: "Desktop and server operating system licensing.",
    icon: "os",
    displayOrder: 50,
    featured: false,
    children: [
      { slug: "desktop-os", name: "Desktop OS", summary: "Windows desktop upgrades and licensing.", icon: "os", displayOrder: 51, featured: false },
      { slug: "server-os", name: "Server OS", summary: "Windows Server editions and CALs.", icon: "server", displayOrder: 52, featured: true },
    ],
  },
  {
    slug: "data-platform",
    name: "Data Platform",
    summary: "Database engines, analytics and business intelligence licensing.",
    icon: "database",
    displayOrder: 60,
    featured: true,
    children: [
      { slug: "database-servers", name: "Database Servers", summary: "Relational database licensing by core or server.", icon: "database", displayOrder: 61, featured: true },
      { slug: "analytics-bi", name: "Analytics & BI", summary: "Reporting and business intelligence tools.", icon: "chart", displayOrder: 62, featured: false },
    ],
  },
  {
    slug: "cloud-platforms",
    name: "Cloud Platforms",
    summary: "Public cloud subscriptions, consumption commitments and managed cloud.",
    icon: "cloud",
    displayOrder: 70,
    featured: true,
    children: [
      { slug: "cloud-subscriptions", name: "Cloud Subscriptions", summary: "Azure, AWS and Google Cloud consumption.", icon: "cloud", displayOrder: 71, featured: true },
      { slug: "backup-recovery", name: "Backup & Recovery", summary: "Cloud backup, replication and disaster recovery.", icon: "shield", displayOrder: 72, featured: false },
    ],
  },
  {
    slug: "security-endpoint",
    name: "Security & Endpoint",
    summary: "Endpoint protection, identity, email security and compliance tooling.",
    icon: "shield",
    displayOrder: 80,
    featured: true,
    children: [
      { slug: "endpoint-protection", name: "Endpoint Protection", summary: "Antivirus, EDR and device management.", icon: "shield", displayOrder: 81, featured: false },
      { slug: "identity-access", name: "Identity & Access", summary: "Single sign-on, MFA and conditional access.", icon: "key", displayOrder: 82, featured: false },
    ],
  },
  {
    slug: "infrastructure-hardware",
    name: "Infrastructure & Hardware",
    summary: "Servers, storage, networking and workstations.",
    icon: "server",
    displayOrder: 90,
    featured: true,
    children: [
      { slug: "servers", name: "Servers", summary: "Rack, tower and blade compute.", icon: "server", displayOrder: 91, featured: false },
      { slug: "storage", name: "Storage", summary: "SAN, NAS and backup appliances.", icon: "storage", displayOrder: 92, featured: false },
      { slug: "networking", name: "Networking", summary: "Switching, wireless and edge connectivity.", icon: "network", displayOrder: 93, featured: false },
      { slug: "workstations", name: "Workstations", summary: "Certified workstations for CAD and media workloads.", icon: "desktop", displayOrder: 94, featured: false },
    ],
  },
];
