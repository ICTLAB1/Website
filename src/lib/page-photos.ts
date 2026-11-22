/**
 * The photographs on the solution, industry and service pages, by page.
 *
 * ## Where these came from
 *
 * Supplied by the business as eight image files, each holding two pictures. They
 * were split into single images and converted to WebP; no pixel was edited. The
 * people in them look AI-generated and are not TechZoid staff, so they are
 * illustrations of a sector or a technology and never claim to be anyone in
 * particular. `alt` therefore says what the picture shows, not who is in it.
 *
 * ## Their size
 *
 * About 400 pixels wide. That is why they are shown at roughly that width, in a
 * side panel, and never stretched across a page: at that size they are sharp,
 * and stretched they would not be. A larger original of any of them can replace
 * the file here with no other change.
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
  workplace: photo("workplace-professional", 411, 239, "A professional working at a laptop in a bright, modern office"),
  team: photo("team-collaboration", 404, 239, "Three colleagues smiling as they work together at a laptop"),
  cloud: photo("cloud-network", 411, 222, "A glowing cloud connected to a database and a laptop by lines of light"),
  cloudSecurity: photo("cloud-security", 404, 222, "A glowing cloud with a padlock and a group of users connected to it"),
  racks: photo("data-centre-racks", 404, 239, "Rows of server racks with indicator lights in a data centre"),
  securityMonitors: photo("security-monitors", 404, 222, "Monitors showing a world map and a security shield in a control room"),
  securityAnalyst: photo("security-analyst", 411, 222, "A security analyst in front of monitors showing a shield and system status"),
  dataCentre: photo("data-centre-engineer", 411, 239, "An engineer with a laptop standing between server racks in a data centre"),
  architect: photo("design-architect", 411, 225, "An architect at a desk with a 3D building model on the monitor"),
  cad: photo("design-cad-models", 404, 224, "Two monitors showing 3D building designs beside a scale model"),
  manufacturingTeam: photo("manufacturing-engineers", 411, 237, "Two engineers in hard hats and high-visibility vests reviewing a tablet on a factory floor"),
  robotArm: photo("manufacturing-robot-arm", 404, 237, "An orange robotic arm on an automated production line"),
  healthcare: photo("healthcare-doctor", 404, 237, "A doctor in a white coat reviewing information on a tablet in a hospital"),
  laptop: photo("hardware-laptop", 404, 224, "A business laptop on a white desk in an office"),
  desktop: photo("hardware-desktop", 411, 224, "A desktop computer, monitor and headphones on a desk"),
} as const satisfies Record<string, SitePhoto>;

/** Keyed by the page's path, with no trailing slash. */
export const PAGE_PHOTOS: Record<string, SitePhoto> = {
  "/solutions/modern-workplace": PHOTOS.workplace,
  "/solutions/cloud-transformation": PHOTOS.cloud,
  "/solutions/security-compliance": PHOTOS.securityMonitors,
  "/solutions/design-engineering": PHOTOS.cad,
  "/solutions/architecture-construction": PHOTOS.architect,
  "/solutions/manufacturing": PHOTOS.robotArm,
  "/industries/corporate-enterprise": PHOTOS.team,
  "/industries/it-technology": PHOTOS.dataCentre,
  "/industries/manufacturing": PHOTOS.manufacturingTeam,
  "/industries/healthcare": PHOTOS.healthcare,
  "/industries/aec": PHOTOS.architect,
  "/services/cloud": PHOTOS.cloud,
  "/services/azure": PHOTOS.cloudSecurity,
  "/services/cybersecurity": PHOTOS.securityAnalyst,
  "/services/backup-disaster-recovery": PHOTOS.racks,
  "/services/endpoint-management": PHOTOS.laptop,
  "/services/it-procurement": PHOTOS.desktop,
};

export function photoForPath(path: string): SitePhoto | null {
  const key = path.replace(/\/+$/, "");
  return Object.hasOwn(PAGE_PHOTOS, key) ? (PAGE_PHOTOS[key] as SitePhoto) : null;
}
