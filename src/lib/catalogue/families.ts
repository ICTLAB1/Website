import type { HardwareFamily } from "@/lib/catalogue/hardware";

/**
 * The three hardware families as landing pages, not as filter permutations.
 *
 * `/hardware?family=servers` is the URL the navigation points at — it is the
 * only way to reach the servers in this catalogue, because they are found by
 * form factor rather than by category. It was also `noindex`, under a rule that
 * marked every filtered view of the catalogue a near-duplicate.
 *
 * For `?sort=`, `?page=`, `?min=`, `?licence=` and the rest that rule is
 * right: those views differ from the base listing in which rows they show and
 * in nothing a reader would search for. The three families are different. Each
 * one is a distinct buying question with distinct inventory behind it, each is
 * linked from the main menu, and "servers" is not a narrowing of "commercial
 * computers for business" — it is a different purchase, made by a different
 * person, on a different budget line.
 *
 * So a family on its own becomes an indexable page with its own title,
 * description and heading. A family with any other filter beside it stays
 * `noindex`: `?family=servers&sort=price-asc` is a near-duplicate of
 * `?family=servers`, which is exactly what the original rule was for.
 *
 * Nothing here claims a price, a stock position or a specification. The
 * catalogue carries no hardware prices at all, and the copy says so.
 */
export type FamilyLanding = {
  title: string;
  description: string;
  heading: string;
  /** The sentence under the heading. Replaces the generic one. */
  intro: string;
};

export const FAMILY_LANDINGS: Record<HardwareFamily, FamilyLanding> = {
  laptops: {
    title: "Business Laptops — Commercial Models, Quoted",
    description:
      "Commercial laptops and mobile workstations for enterprise, government, PSU and education procurement — quoted to your configuration, quantity and delivery schedule.",
    heading: "Business laptops and mobile workstations",
    intro:
      "Business-class laptops rather than consumer lines: on-site warranty options, a stable image, docking that is the same next year, and the mobile workstations for the people who need a certified graphics driver.",
  },
  desktops: {
    title: "Business Desktops & All-in-Ones — Quoted",
    description:
      "Commercial desktops, small-form-factor and mini PCs, all-in-ones and desktop workstations for business procurement — quoted to your configuration and quantity.",
    heading: "Business desktops, all-in-ones and workstations",
    intro:
      "Towers, small-form-factor and mini PCs, all-in-ones and desktop workstations. Which shape suits the desk usually decides this one before the specification does, so they are listed by form factor.",
  },
  servers: {
    title: "Rack & Tower Servers — Enterprise, Quoted",
    description:
      "Rack and tower servers for enterprise and government infrastructure: processor, memory, storage and warranty configured to the workload and quoted, never listed at a price.",
    heading: "Rack and tower servers",
    intro:
      "Rack and tower servers, configured to the workload rather than bought off a shelf. Processor count, memory, drive bays, RAID, power redundancy and the warranty term all move the figure, so every one of these is quoted.",
  },
};

/**
 * Whether this request is a family landing page rather than a filtered view.
 *
 * True only when `family` is the single parameter present. `page` is tolerated
 * — pagination of a landing page is still that page, and the base view is the
 * one that gets the canonical either way.
 */
export function familyLandingKey(
  params: Record<string, string | string[] | undefined>,
): HardwareFamily | null {
  const others = Object.keys(params).filter(
    (key) => key !== "family" && key !== "page" && params[key],
  );
  if (others.length > 0) return null;

  const raw = Array.isArray(params.family) ? params.family[0] : params.family;
  if (!raw) return null;

  return raw in FAMILY_LANDINGS ? (raw as HardwareFamily) : null;
}
