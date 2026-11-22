/**
 * The photographs on the home, solution, industry and service pages, by page.
 *
 * ## Where these came from
 *
 * Licensed from Adobe Stock on 22 November 2026, fifteen photographs, one licence
 * each. The Adobe Stock ids are in `docs/image-licences.md`; keep that file
 * current when one is replaced. An earlier set of supplied illustrations was
 * removed because the business judged it not good enough.
 *
 * Each was cropped to one shape (3:2) and saved at 832 pixels wide, twice the
 * 416 it is shown at, so it stays sharp on a phone or any high-density screen.
 * `next/image` serves it as AVIF or WebP at the width the screen needs.
 *
 * ## What the descriptions say
 *
 * They say what the photograph shows, and never who is in it or that it is
 * TechZoid. These are stock pictures of a sector or a technology, not of the
 * company's staff, offices or customers, and the page copy around them must not
 * suggest otherwise.
 */
export type SitePhoto = { src: string; width: number; height: number; alt: string };

const photo = (name: string, alt: string): SitePhoto => ({
  src: `/images/site/${name}.webp`,
  width: 832,
  height: 555,
  alt,
});

const PHOTOS = {
  team: photo("indian-business-team-meeting", "A team of Indian business professionals gathered around a laptop in a meeting room"),
  boardroom: photo("executive-boardroom-meeting", "A manager standing to address colleagues seated at a boardroom table in a bright office"),
  workplace: photo("professional-laptop-workplace", "A professional working on a laptop at a desk in a modern, bright workplace"),
  cloud: photo("cloud-computing-circuit", "A glowing blue cloud with an upload arrow surrounded by circuit lines, representing cloud computing"),
  security: photo("cybersecurity-laptop-padlock", "A person using a laptop and smartphone with a glowing red padlock above the screen, representing cybersecurity"),
  design: photo("architecture-building-model-design", "A monitor showing a 3D building model in design software beside a scale model in an architecture studio"),
  datacentre: photo("data-centre-server-room", "A corridor of server racks in a data centre"),
  helpdesk: photo("it-helpdesk-support-team", "IT support agents wearing headsets at their workstations in a helpdesk"),
  manufacturing: photo("manufacturing-technician-factory", "Two technicians in hard hats and high-visibility jackets inspecting equipment on a factory floor"),
  construction: photo("construction-engineers-blueprint", "Two engineers in hard hats reviewing a blueprint on a table at a construction site beside a crane"),
  healthcare: photo("hospital-doctor-tablet", "A healthcare professional in blue scrubs with a stethoscope using a tablet in a hospital corridor"),
  education: photo("university-students-laptops", "Students working on laptops side by side in a classroom"),
  finance: photo("financial-market-monitors", "A desk with several monitors showing financial market charts and data in an office"),
  hardware: photo("business-laptop-desk", "A business laptop, calculator and papers on a wooden office desk"),
  government: photo("indian-parliament-building", "A government building in New Delhi with a landscaped lawn in front"),
} as const satisfies Record<string, SitePhoto>;

/** Keyed by the page's path, with no trailing slash ("/" for the home page). */
export const PAGE_PHOTOS: Record<string, SitePhoto> = {
  "/": PHOTOS.team,
  "/enterprise": PHOTOS.boardroom,
  "/microsoft-365": PHOTOS.workplace,
  "/autodesk-licensing": PHOTOS.design,
  "/enterprise-it-hardware": PHOTOS.hardware,
  "/managed-it-services": PHOTOS.helpdesk,
  "/gem-software-supplier": PHOTOS.government,

  "/solutions/modern-workplace": PHOTOS.workplace,
  "/solutions/cloud-transformation": PHOTOS.cloud,
  "/solutions/security-compliance": PHOTOS.security,
  "/solutions/design-engineering": PHOTOS.design,
  "/solutions/architecture-construction": PHOTOS.construction,
  "/solutions/manufacturing": PHOTOS.manufacturing,
  "/solutions/education": PHOTOS.education,
  "/solutions/financial-services": PHOTOS.finance,
  "/solutions/technology": PHOTOS.hardware,

  "/industries/corporate-enterprise": PHOTOS.boardroom,
  "/industries/it-technology": PHOTOS.datacentre,
  "/industries/manufacturing": PHOTOS.manufacturing,
  "/industries/infrastructure-construction": PHOTOS.construction,
  "/industries/healthcare": PHOTOS.healthcare,
  "/industries/education": PHOTOS.education,
  "/industries/banking-financial-services": PHOTOS.finance,
  "/industries/government-psu": PHOTOS.government,
  "/industries/aec": PHOTOS.design,

  "/services/microsoft-365": PHOTOS.workplace,
  "/services/cloud": PHOTOS.cloud,
  "/services/azure": PHOTOS.datacentre,
  "/services/cybersecurity": PHOTOS.security,
  "/services/backup-disaster-recovery": PHOTOS.datacentre,
  "/services/endpoint-management": PHOTOS.hardware,
  "/services/it-helpdesk": PHOTOS.helpdesk,
  "/services/it-procurement": PHOTOS.hardware,
};

export function photoForPath(path: string): SitePhoto | null {
  const key = path === "/" ? "/" : path.replace(/\/+$/, "");
  return Object.hasOwn(PAGE_PHOTOS, key) ? (PAGE_PHOTOS[key] as SitePhoto) : null;
}
