/**
 * The photographs on the solution, industry and service pages, by page.
 *
 * ## Where these came from
 *
 * Supplied by the business in three packs: one of eight files each holding two
 * pictures (split into single images), one of sixteen captioned pictures (the
 * caption bar burned into the bottom was cropped off, nothing else touched), and
 * one of eight warm-toned portraits. All converted to WebP. The
 * people in them look AI-generated and are not TechZoid staff, so they are
 * illustrations of a sector or a technology and never claim to be anyone in
 * particular. `alt` therefore says what the picture shows, not who is in it.
 *
 * ## Their size
 *
 * Between 370 and 410 pixels wide. That is why they are shown at roughly that
 * width, in a side panel, and never stretched across a page: at that size they
 * are sharp, and stretched they would not be. A larger original of any of them
 * can replace the file here with no other change. `next/image` serves each in
 * AVIF or WebP at the width the screen needs, never wider than the file.
 *
 * Supplied but deliberately not used: the careers picture (it shows people with
 * TechZoid lanyards, which would read as real staff), the GeM picture (it shows a
 * logo of the Government e-Marketplace drawn by an image generator, not the
 * real one), and the warm healthcare portrait (the captioned one covers that page).
 *
 * Two of the pictures show a Dell logo on the device (the laptop and the desktop).
 * The business lists Dell as a partner, so that is not a claim it cannot make,
 * but it is a brand shown on a page that is not about that brand, and a reason to
 * replace them with neutral photographs when there are some.
 */
export type SitePhoto = { src: string; width: number; height: number; alt: string };

const photo = (name: string, width: number, height: number, alt: string): SitePhoto => ({
  src: `/images/site/${name}.webp`,
  width,
  height,
  alt,
});

const PHOTOS = {
  m365: photo("microsoft-365-modern-workplace", 374, 204, "A professional using Word, Excel, PowerPoint, Teams and Outlook on a laptop in a modern workplace"),
  cloud: photo("cloud-transformation-data-centre", 374, 204, "A glowing cloud above rows of data centre server racks, representing cloud transformation"),
  cloudCity: photo("cloud-city-sunset", 404, 464, "A glowing cloud with upload and download arrows over a city skyline at sunset"),
  cloudSecurity: photo("cloud-security", 404, 222, "A glowing cloud with a padlock and a group of users connected to it"),
  security: photo("cybersecurity-compliance-operations", 379, 204, "A security analyst at monitors showing a padlock shield and a world map in a security operations room"),
  securityLaptop: photo("cybersecurity-laptop-shield", 404, 464, "A laptop on a desk showing a padlock inside a shield, representing cybersecurity"),
  design: photo("design-engineering-autodesk-workstation", 379, 204, "An engineer at two monitors showing 3D building models in design software"),
  architecture: photo("architecture-design-studio", 411, 464, "An architect at two monitors showing 3D building designs in a design studio"),
  datacentre: photo("it-infrastructure-data-centre", 374, 204, "A long aisle of enterprise server racks in a modern data centre"),
  datacentreEngineer: photo("data-centre-engineer", 411, 239, "An engineer with a laptop standing between server racks in a data centre"),
  hardware: photo("it-hardware-devices", 374, 204, "A business laptop, desktop computer, monitor and headphones on an office desk"),
  laptop: photo("hardware-laptop", 404, 224, "A business laptop on a white desk in an office"),
  managed: photo("managed-it-support-helpdesk", 379, 204, "Two IT support agents wearing headsets at a helpdesk"),
  manufacturing: photo("manufacturing-engineers-plant", 379, 204, "Two engineers in hard hats and high-visibility vests reviewing a tablet beside a robotic arm"),
  smartFactory: photo("smart-manufacturing-floor", 411, 465, "An engineer in a hard hat holding a tablet on a smart factory floor with an orange robotic arm"),
  construction: photo("construction-infrastructure-site", 374, 204, "Two engineers in hard hats reviewing a blueprint in front of a building under construction"),
  healthcare: photo("healthcare-hospital-technology", 374, 204, "A doctor reviewing information on a tablet in a modern hospital"),
  education: photo("education-computer-lab", 379, 204, "Students working on laptops in a university computer lab"),
  educationTeam: photo("education-collaboration", 404, 465, "Students collaborating on laptops in a university library"),
  banking: photo("banking-financial-services-analyst", 379, 204, "A financial services professional in a suit at a laptop and a monitor showing market charts"),
  government: photo("government-psu-building", 374, 204, "A grand government building in India under a blue sky"),
  governmentFlag: photo("indian-government-building", 411, 465, "A government building in India with the national flag above its dome"),
  enterprise: photo("enterprise-solutions-team", 379, 204, "A team of colleagues collaborating around a laptop in a bright office"),
  team: photo("warm-enterprise-team", 411, 464, "Four colleagues smiling as they work together at a laptop in a bright modern office"),
} as const satisfies Record<string, SitePhoto>;

/** Keyed by the page's path, with no trailing slash ("/" for the home page). */
export const PAGE_PHOTOS: Record<string, SitePhoto> = {
  "/": PHOTOS.team,
  "/enterprise": PHOTOS.enterprise,
  "/microsoft-365": PHOTOS.m365,
  "/autodesk-licensing": PHOTOS.design,
  "/enterprise-it-hardware": PHOTOS.hardware,
  "/managed-it-services": PHOTOS.managed,
  "/gem-software-supplier": PHOTOS.governmentFlag,

  "/solutions/modern-workplace": PHOTOS.m365,
  "/solutions/cloud-transformation": PHOTOS.cloud,
  "/solutions/security-compliance": PHOTOS.security,
  "/solutions/design-engineering": PHOTOS.design,
  "/solutions/architecture-construction": PHOTOS.architecture,
  "/solutions/manufacturing": PHOTOS.smartFactory,
  "/solutions/education": PHOTOS.educationTeam,
  "/solutions/financial-services": PHOTOS.banking,
  "/solutions/technology": PHOTOS.hardware,

  "/industries/corporate-enterprise": PHOTOS.enterprise,
  "/industries/it-technology": PHOTOS.datacentreEngineer,
  "/industries/manufacturing": PHOTOS.manufacturing,
  "/industries/infrastructure-construction": PHOTOS.construction,
  "/industries/healthcare": PHOTOS.healthcare,
  "/industries/education": PHOTOS.education,
  "/industries/banking-financial-services": PHOTOS.banking,
  "/industries/government-psu": PHOTOS.government,
  "/industries/aec": PHOTOS.architecture,

  "/services/microsoft-365": PHOTOS.m365,
  "/services/cloud": PHOTOS.cloudCity,
  "/services/azure": PHOTOS.cloudSecurity,
  "/services/cybersecurity": PHOTOS.securityLaptop,
  "/services/backup-disaster-recovery": PHOTOS.datacentre,
  "/services/endpoint-management": PHOTOS.laptop,
  "/services/it-helpdesk": PHOTOS.managed,
  "/services/it-procurement": PHOTOS.hardware,
};

export function photoForPath(path: string): SitePhoto | null {
  const key = path === "/" ? "/" : path.replace(/\/+$/, "");
  return Object.hasOwn(PAGE_PHOTOS, key) ? (PAGE_PHOTOS[key] as SitePhoto) : null;
}
