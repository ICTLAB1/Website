/**
 * Organisations whose emblem is on file.
 *
 * Artwork only. Every row is created unpublished and with no confirmed
 * permission date, which is precisely what keeps it off the public site: see
 * `lib/client-logo`, which wants artwork, a date and a deliberate publish
 * before a mark reaches a visitor.
 *
 * The date is left empty because nobody here knows it. The business has said
 * the permissions are held; who granted each one and when is a fact that has to
 * be entered by somebody who can produce it, and a migration inventing a date
 * would defeat the only mechanism standing between a supplier's marketing page
 * and somebody else's trademark.
 *
 * The names are the organisations' own. `sector` groups them and is not a
 * claim about anything.
 */
export type OrganisationSeed = {
  /** Stable id, so re-running touches the same row. */
  id: string;
  name: string;
  logoUrl: string;
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
];
