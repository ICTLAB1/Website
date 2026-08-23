import type { FormFactor } from "@prisma/client";

/**
 * The vocabulary of the hardware catalogue.
 *
 * One module so that "is this a laptop?" has a single answer. The question is
 * asked by the catalogue filters, the brand pages, the navigation, the product
 * card and the sitemap, and five independent answers would drift apart on the
 * first form factor anybody added.
 *
 * ## What a hardware product is
 *
 * A product with a `formFactor`. Not a category membership, and not a brand:
 * HP sells both licences and laptops, and a category tree can be reorganised in
 * the admin panel by someone who has no idea a filter depends on its shape.
 * The form factor is a property of the thing itself.
 */

/** Every form factor, in the order they are offered as filters. */
export const FORM_FACTORS: FormFactor[] = [
  "LAPTOP",
  "MOBILE_WORKSTATION",
  "DESKTOP_TOWER",
  "DESKTOP_SFF",
  "DESKTOP_MINI",
  "ALL_IN_ONE",
  "DESKTOP_WORKSTATION",
  "TOWER_SERVER",
  "RACK_SERVER",
];

const LABELS: Record<FormFactor, string> = {
  LAPTOP: "Laptop",
  MOBILE_WORKSTATION: "Mobile workstation",
  DESKTOP_TOWER: "Tower desktop",
  DESKTOP_SFF: "Small form factor",
  DESKTOP_MINI: "Mini PC",
  ALL_IN_ONE: "All-in-one",
  DESKTOP_WORKSTATION: "Desktop workstation",
  TOWER_SERVER: "Tower server",
  RACK_SERVER: "Rack server",
};

/**
 * What the card calls the product: "Commercial laptop", "Commercial desktop".
 *
 * Every one of these says "commercial", because that is the whole point of the
 * range — this catalogue carries business lines and not consumer or gaming
 * ones, and the word on the card is what tells a buyer they are in the right
 * place.
 */
const CLASS_LABELS: Record<FormFactor, string> = {
  LAPTOP: "Commercial laptop",
  MOBILE_WORKSTATION: "Mobile workstation",
  DESKTOP_TOWER: "Commercial desktop",
  DESKTOP_SFF: "Commercial desktop",
  DESKTOP_MINI: "Commercial mini PC",
  ALL_IN_ONE: "Commercial all-in-one",
  DESKTOP_WORKSTATION: "Desktop workstation",
  TOWER_SERVER: "Tower server",
  RACK_SERVER: "Rack server",
};

/** The two families the navigation is built from. */
export type HardwareFamily = "laptops" | "desktops" | "servers";

const FAMILY: Record<FormFactor, HardwareFamily> = {
  LAPTOP: "laptops",
  MOBILE_WORKSTATION: "laptops",
  DESKTOP_TOWER: "desktops",
  DESKTOP_SFF: "desktops",
  DESKTOP_MINI: "desktops",
  ALL_IN_ONE: "desktops",
  DESKTOP_WORKSTATION: "desktops",
  TOWER_SERVER: "servers",
  RACK_SERVER: "servers",
};

export const FAMILY_LABELS: Record<HardwareFamily, string> = {
  laptops: "Business laptops",
  desktops: "Business desktops",
  servers: "Servers",
};

export function formFactorLabel(value: FormFactor): string {
  return LABELS[value];
}

/** "Commercial laptop" — the line under the product name. */
export function hardwareClassLabel(value: FormFactor): string {
  return CLASS_LABELS[value];
}

/**
 * The noun in each class label that a model name might already contain.
 *
 * "Commercial desktop" is worth appending to "HP Pro 400 G9", which does not
 * say what it is. It is not worth appending to "HP Z8 Fury G5 Tower
 * Workstation", which does.
 */
const CLASS_NOUN: Record<FormFactor, string> = {
  LAPTOP: "laptop",
  MOBILE_WORKSTATION: "workstation",
  DESKTOP_TOWER: "desktop",
  DESKTOP_SFF: "desktop",
  DESKTOP_MINI: "mini pc",
  ALL_IN_ONE: "all-in-one",
  DESKTOP_WORKSTATION: "workstation",
  TOWER_SERVER: "server",
  RACK_SERVER: "server",
};

/**
 * A page title for a hardware model: the name, qualified only if it needs it.
 *
 * A search result shows about sixty characters, and "HP ProOne 440 G9
 * All-in-One — Commercial all-in-one" spends twenty-one of them saying
 * all-in-one a second time. Where the model name already carries the noun, the
 * name is the title.
 */
export function hardwareTitle(name: string, value: FormFactor): string {
  const noun = CLASS_NOUN[value];
  // Word-boundary, so "Mini" in a model name does not swallow "mini pc" and a
  // hyphenated noun still matches the way it is written.
  const pattern = new RegExp(`\\b${noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return pattern.test(name) ? name : `${name} — ${CLASS_LABELS[value]}`;
}

export function familyOf(value: FormFactor): HardwareFamily {
  return FAMILY[value];
}

export function formFactorsIn(family: HardwareFamily): FormFactor[] {
  return FORM_FACTORS.filter((value) => FAMILY[value] === family);
}

/** The URL slug for a form factor: `DESKTOP_SFF` ⇄ `desktop-sff`. */
export function formFactorSlug(value: FormFactor): string {
  return value.toLowerCase().replace(/_/g, "-");
}

/** Parses a slug back, returning null for anything not in the enum. */
export function parseFormFactor(slug: string): FormFactor | null {
  const upper = slug.trim().toUpperCase().replace(/-/g, "_");
  return (FORM_FACTORS as string[]).includes(upper) ? (upper as FormFactor) : null;
}

/**
 * Whether a product is hardware, from whatever subset of it a caller has.
 *
 * Takes the shape rather than the whole record so that list queries, which
 * select a handful of columns, can ask without widening their select.
 */
export function isHardware(product: { formFactor?: FormFactor | null }): boolean {
  return product.formFactor != null;
}
