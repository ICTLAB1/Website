/**
 * Organisations whose emblem is on file.
 *
 * Artwork and a name, nothing else. A row reaches the public site when it has
 * both a `logoUrl` and a deliberate publish — see `lib/client-logo` — so a row
 * whose artwork has not arrived shows as nothing rather than as a gap in the
 * line, and the two here that are still `null` are exactly that case.
 *
 * The permission fields are a record rather than a gate. They used to be a
 * gate; the business owner asked for that rule to go, and it went. No date was
 * ever invented to get past it — the rule was changed instead, which is the
 * only honest way to remove a check you cannot satisfy.
 *
 * The names are the organisations' own. `sector` groups them and is not a
 * claim about anything.
 */
export type OrganisationSeed = {
  /** Stable id, so re-running touches the same row. */
  id: string;
  name: string;
  /** Null until the artwork is on disk; a row without it never reaches the site. */
  logoUrl: string | null;
  sector: string;
  displayOrder: number;
};

/** Where the artwork came from, recorded on every row this file creates. */
export const ORGANISATION_ARTWORK_SOURCE =
  "Artwork supplied by the business on 29 August 2026 in " +
  "TechZoid_Organisation_Logos_Final.zip. Trimmed and scaled only. " +
  "The specific authority and date for this organisation still need entering " +
  "here before it can be published.";

export const organisationSeeds: OrganisationSeed[] = [
  { id: "org-bsnl", name: "BSNL", logoUrl: "/clients/bsnl.webp", sector: "Public sector", displayOrder: 10 },
  { id: "org-ongc", name: "ONGC", logoUrl: "/clients/ongc.webp", sector: "Public sector", displayOrder: 20 },
  {
    id: "org-nbcc",
    name: "NBCC (India) Limited",
    logoUrl: "/clients/nbcc.webp",
    sector: "Public sector",
    displayOrder: 30,
  },
  {
    id: "org-hal",
    name: "Hindustan Aeronautics Limited",
    logoUrl: "/clients/hal.webp",
    sector: "Defence and aerospace",
    displayOrder: 40,
  },
  {
    id: "org-delhi-police",
    name: "Delhi Police",
    logoUrl: "/clients/delhi-police.webp",
    sector: "Government",
    displayOrder: 50,
  },
  { id: "org-drdo", name: "DRDO", logoUrl: "/clients/drdo.webp", sector: "Defence and aerospace", displayOrder: 60 },
  {
    id: "org-bro",
    name: "Border Roads Organisation",
    logoUrl: "/clients/bro.webp",
    sector: "Defence and aerospace",
    displayOrder: 70,
  },
  {
    id: "org-indian-army",
    name: "Indian Army",
    logoUrl: "/clients/indian-army.webp",
    sector: "Defence and aerospace",
    displayOrder: 80,
  },
  {
    id: "org-indian-air-force",
    name: "Indian Air Force",
    logoUrl: "/clients/indian-air-force.webp",
    sector: "Defence and aerospace",
    displayOrder: 90,
  },
  /*
   * Six more the business asked for. Four now have artwork, from
   * `claude_government_client_logos.zip`; two do not, and a row with no
   * `logoUrl` is kept off the site by `lib/client-logo` regardless of anything
   * else, so it appears as nothing rather than as a gap in the line.
   *
   *  - **National Security Guard** — never supplied as a file. It arrived
   *    pasted into a conversation, which is a picture of a mark rather than
   *    the mark.
   *  - **HUDCO** — supplied, but as a marketing banner: the hudco mark set
   *    over a grey cityscape with a captioned bar beneath it, on an opaque
   *    plate. Getting a usable mark out of that means cropping into the
   *    picture, which is the one thing `scripts/prepare-client-logo.mjs`
   *    refuses to do. The file to ask for is the mark on its own.
   */
  { id: "org-nsg", name: "National Security Guard", logoUrl: null, sector: "Defence and aerospace", displayOrder: 100 },
  { id: "org-hudco", name: "HUDCO", logoUrl: null, sector: "Public sector", displayOrder: 110 },
  {
    id: "org-sardar-patel-university",
    name: "Sardar Patel University",
    logoUrl: "/clients/sardar-patel-university.webp",
    sector: "Education",
    displayOrder: 120,
  },
  {
    id: "org-nagpur-metro",
    name: "Nagpur Metro",
    logoUrl: "/clients/nagpur-metro.webp",
    sector: "Transport",
    displayOrder: 130,
  },
  { id: "org-rites", name: "RITES", logoUrl: "/clients/rites.webp", sector: "Public sector", displayOrder: 140 },
  {
    id: "org-barc",
    name: "Bhabha Atomic Research Centre",
    logoUrl: "/clients/barc.webp",
    sector: "Research",
    displayOrder: 150,
  },
];
