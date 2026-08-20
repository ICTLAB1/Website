/**
 * Single source of truth for site navigation.
 *
 * The header mega menu, the mobile drawer, the footer and the sitemap all read
 * from here, so a route can never appear in one place and be missing from
 * another.
 */

export type NavLink = { label: string; href: string; description?: string };
export type NavColumn = { heading: string; href: string; links: NavLink[] };

export const utilityNav: NavLink[] = [
  { label: "Enterprise Sales", href: "/enterprise" },
  { label: "Support", href: "/support" },
  { label: "Track Order", href: "/track-order" },
];

export const productsMegaMenu: NavColumn[] = [
  {
    heading: "Microsoft",
    href: "/microsoft",
    links: [
      { label: "Microsoft 365", href: "/microsoft-365" },
      { label: "Office", href: "/microsoft-office" },
      { label: "Windows", href: "/products?brand=microsoft&category=operating-systems" },
      { label: "Windows Server", href: "/windows-server" },
      { label: "SQL Server", href: "/sql-server" },
      { label: "Dynamics 365", href: "/products?brand=microsoft&category=business-applications" },
      { label: "Azure", href: "/services/azure" },
      { label: "Licensing & CSP", href: "/microsoft-licensing" },
    ],
  },
  {
    heading: "Adobe",
    href: "/adobe",
    links: [
      { label: "Creative Cloud", href: "/adobe-creative-cloud" },
      { label: "Acrobat", href: "/adobe-acrobat" },
      { label: "Photoshop", href: "/adobe-photoshop" },
      { label: "Illustrator", href: "/adobe-illustrator" },
      { label: "Premiere Pro", href: "/adobe-premiere-pro" },
    ],
  },
  {
    heading: "Autodesk",
    href: "/autodesk",
    links: [
      { label: "AutoCAD", href: "/autocad" },
      { label: "Revit", href: "/revit" },
      { label: "AEC Collection", href: "/aec-collection" },
      { label: "Maya", href: "/maya" },
      { label: "Fusion", href: "/fusion-360" },
      { label: "Construction Cloud", href: "/autodesk-construction-cloud" },
    ],
  },
  {
    heading: "Zoho",
    href: "/zoho",
    links: [
      { label: "CRM", href: "/zoho-crm" },
      { label: "Books", href: "/zoho-books" },
      { label: "Desk", href: "/zoho-desk" },
      { label: "Workplace", href: "/zoho-workplace" },
      { label: "Mail", href: "/zoho-mail" },
      { label: "Zoho One", href: "/products?brand=zoho&category=business-suites" },
    ],
  },
  {
    heading: "Infrastructure",
    href: "/products?category=infrastructure-hardware",
    links: [
      { label: "HPE", href: "/brands/hpe" },
      { label: "Dell Technologies", href: "/brands/dell" },
      { label: "Servers", href: "/products?category=servers" },
      { label: "Storage", href: "/products?category=storage" },
      { label: "Networking", href: "/products?category=networking" },
    ],
  },
  {
    heading: "Cloud",
    href: "/services/cloud",
    links: [
      { label: "Microsoft Azure", href: "/services/azure" },
      { label: "Amazon Web Services", href: "/services/aws" },
      { label: "Google Cloud", href: "/services/google-cloud" },
      { label: "Cloud migration", href: "/services/cloud" },
      { label: "Backup & DR", href: "/services/backup-disaster-recovery" },
    ],
  },
];

export const solutionsMenu: NavColumn[] = [
  {
    heading: "By outcome",
    href: "/solutions",
    links: [
      { label: "Modern workplace", href: "/solutions/modern-workplace" },
      { label: "Cloud transformation", href: "/solutions/cloud-transformation" },
      { label: "Design & engineering", href: "/solutions/design-engineering" },
      { label: "Security & compliance", href: "/solutions/security-compliance" },
      { label: "Software asset management", href: "/services/software-asset-management" },
    ],
  },
  {
    heading: "By industry",
    href: "/solutions",
    links: [
      { label: "Architecture & construction", href: "/solutions/architecture-construction" },
      { label: "Manufacturing", href: "/solutions/manufacturing" },
      { label: "IT & software", href: "/solutions/technology" },
      { label: "Financial services", href: "/solutions/financial-services" },
      { label: "Education", href: "/solutions/education" },
    ],
  },
];

export const servicesMenu: NavColumn[] = [
  {
    heading: "Cloud & infrastructure",
    href: "/services",
    links: [
      { label: "Cloud advisory", href: "/services/cloud" },
      { label: "Microsoft Azure", href: "/services/azure" },
      { label: "Amazon Web Services", href: "/services/aws" },
      { label: "Google Cloud", href: "/services/google-cloud" },
      { label: "Backup & disaster recovery", href: "/services/backup-disaster-recovery" },
    ],
  },
  {
    heading: "Workplace & security",
    href: "/services",
    links: [
      { label: "Microsoft 365 deployment", href: "/services/microsoft-365" },
      { label: "Email migration", href: "/services/email-migration" },
      { label: "Endpoint management", href: "/services/endpoint-management" },
      { label: "Cybersecurity", href: "/services/cybersecurity" },
      { label: "IT helpdesk", href: "/services/it-helpdesk" },
    ],
  },
  {
    heading: "Licensing operations",
    href: "/services",
    links: [
      { label: "Software asset management", href: "/services/software-asset-management" },
      { label: "Licence management", href: "/services/licence-management" },
      { label: "Enterprise procurement", href: "/enterprise" },
    ],
  },
];

export const brandsMenu: NavLink[] = [
  { label: "Microsoft", href: "/brands/microsoft" },
  { label: "Adobe", href: "/brands/adobe" },
  { label: "Autodesk", href: "/brands/autodesk" },
  { label: "Zoho", href: "/brands/zoho" },
  { label: "SketchUp", href: "/brands/sketchup" },
  { label: "Corel", href: "/brands/corel" },
  { label: "HPE", href: "/brands/hpe" },
  { label: "Dell Technologies", href: "/brands/dell" },
];

export const resourcesMenu: NavLink[] = [
  { label: "Resource centre", href: "/resources", description: "Guides, comparisons and licensing explainers" },
  { label: "Blog", href: "/blog", description: "Licensing and procurement articles" },
  { label: "Microsoft licensing guide", href: "/microsoft-licensing", description: "CSP, EA and volume licensing compared" },
  { label: "Support centre", href: "/support", description: "Raise a ticket or reach the service desk" },
];

export const aboutMenu: NavLink[] = [
  { label: "About us", href: "/about" },
  { label: "Enterprise procurement", href: "/enterprise" },
  { label: "Contact", href: "/contact" },
];

export type PrimaryNavItem = {
  label: string;
  href: string;
  megaMenu?: NavColumn[];
  simpleMenu?: NavLink[];
};

export const primaryNav: PrimaryNavItem[] = [
  { label: "Products", href: "/products", megaMenu: productsMegaMenu },
  { label: "Solutions", href: "/solutions", megaMenu: solutionsMenu },
  { label: "Services", href: "/services", megaMenu: servicesMenu },
  { label: "Brands", href: "/brands", simpleMenu: brandsMenu },
  { label: "Resources", href: "/resources", simpleMenu: resourcesMenu },
  { label: "About", href: "/about", simpleMenu: aboutMenu },
];

export const footerColumns: { heading: string; links: NavLink[] }[] = [
  {
    heading: "Software",
    links: [
      { label: "Microsoft 365", href: "/microsoft-365" },
      { label: "Microsoft Office", href: "/microsoft-office" },
      { label: "Adobe Creative Cloud", href: "/adobe-creative-cloud" },
      { label: "Adobe Acrobat", href: "/adobe-acrobat" },
      { label: "AutoCAD", href: "/autocad" },
      { label: "Revit", href: "/revit" },
      { label: "Zoho CRM", href: "/zoho-crm" },
      { label: "All products", href: "/products" },
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Cloud advisory", href: "/services/cloud" },
      { label: "Microsoft 365 deployment", href: "/services/microsoft-365" },
      { label: "Cybersecurity", href: "/services/cybersecurity" },
      { label: "Email migration", href: "/services/email-migration" },
      { label: "Backup & disaster recovery", href: "/services/backup-disaster-recovery" },
      { label: "Software asset management", href: "/services/software-asset-management" },
      { label: "All services", href: "/services" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Enterprise procurement", href: "/enterprise" },
      { label: "Resources", href: "/resources" },
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Cookie policy", href: "/cookie-policy" },
      { label: "Refund policy", href: "/refund-policy" },
    ],
  },
];

/** Every statically-known public route, used to build the sitemap. */
export const staticRoutes: string[] = [
  "/",
  "/products",
  "/brands",
  "/solutions",
  "/services",
  "/enterprise",
  "/resources",
  "/blog",
  "/about",
  "/contact",
  "/support",
  "/track-order",
  "/search",
  "/enquiry",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/refund-policy",
];
