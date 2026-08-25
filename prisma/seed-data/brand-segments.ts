import type { BrandSegment } from "@prisma/client";

/**
 * Which part of the offer each brand belongs to.
 *
 * This is a classification of the *company*, not a claim about TechZoid's
 * relationship with it. Microsoft publishes software; HP manufactures business
 * computers; Kaspersky makes security products. None of that is a partner
 * designation, and none of it is data about this business — which is why it can
 * live here rather than waiting for somebody to confirm it.
 *
 * It exists because the brands page needs a heading, and one heading cannot
 * cover forty companies. "Authorised to resell licensing from" is wrong over a
 * laptop manufacturer; "Technology brands we supply" is right over all of them
 * but says nothing; grouping says something and stays true.
 *
 * ## Where a company spans two segments
 *
 * Several do. Dell makes business laptops *and* servers; HP and HPE are
 * separate companies precisely along that line. Each brand gets the segment a
 * buyer would look for it under, and the note beside it says why when the
 * choice is not obvious.
 */
export const brandSegments: Record<string, BrandSegment> = {
  // ── software and cloud ────────────────────────────────────────────────────
  microsoft: "SOFTWARE_CLOUD",
  adobe: "SOFTWARE_CLOUD",
  autodesk: "SOFTWARE_CLOUD",
  zoho: "SOFTWARE_CLOUD",
  sketchup: "SOFTWARE_CLOUD",
  corel: "SOFTWARE_CLOUD",
  atlassian: "SOFTWARE_CLOUD",
  jetbrains: "SOFTWARE_CLOUD",
  dropbox: "SOFTWARE_CLOUD",
  "google-workspace": "SOFTWARE_CLOUD",
  salesforce: "SOFTWARE_CLOUD",
  sap: "SOFTWARE_CLOUD",
  "dassault-systemes": "SOFTWARE_CLOUD",
  "bentley-systems": "SOFTWARE_CLOUD",

  // ── business hardware ─────────────────────────────────────────────────────
  //
  // HP, not HPE. They are separate companies and this is the line between
  // them: HP makes the commercial PCs, HPE makes the infrastructure. Putting
  // either in the other's group is the mistake this file exists to prevent.
  hp: "BUSINESS_HARDWARE",
  lenovo: "BUSINESS_HARDWARE",
  acer: "BUSINESS_HARDWARE",
  asus: "BUSINESS_HARDWARE",
  logitech: "BUSINESS_HARDWARE",

  // ── enterprise infrastructure ─────────────────────────────────────────────
  //
  // Dell Technologies sits here rather than under business hardware: the
  // catalogue carries its servers and storage, and a buyer looking for a
  // PowerEdge is looking in this section. Its commercial laptops are reachable
  // from the same brand page either way.
  dell: "ENTERPRISE_INFRASTRUCTURE",
  hpe: "ENTERPRISE_INFRASTRUCTURE",
  vmware: "ENTERPRISE_INFRASTRUCTURE",
  "red-hat": "ENTERPRISE_INFRASTRUCTURE",
  oracle: "ENTERPRISE_INFRASTRUCTURE",
  ibm: "ENTERPRISE_INFRASTRUCTURE",
  cisco: "ENTERPRISE_INFRASTRUCTURE",
  synology: "ENTERPRISE_INFRASTRUCTURE",
  apc: "ENTERPRISE_INFRASTRUCTURE",
  intel: "ENTERPRISE_INFRASTRUCTURE",
  amd: "ENTERPRISE_INFRASTRUCTURE",
  nvidia: "ENTERPRISE_INFRASTRUCTURE",

  // ── cybersecurity ─────────────────────────────────────────────────────────
  kaspersky: "CYBERSECURITY",
  bitdefender: "CYBERSECURITY",
  eset: "CYBERSECURITY",
  "trend-micro": "CYBERSECURITY",
  sophos: "CYBERSECURITY",
  mcafee: "CYBERSECURITY",
  fortinet: "CYBERSECURITY",
  watchguard: "CYBERSECURITY",
  crowdstrike: "CYBERSECURITY",
  "quick-heal": "CYBERSECURITY",
  sonicwall: "CYBERSECURITY",
  acronis: "CYBERSECURITY",
  "check-point": "CYBERSECURITY",
  "palo-alto-networks": "CYBERSECURITY",

  // ── added August 2026 ─────────────────────────────────────────────────────
  //
  // Acronis sits under cybersecurity rather than infrastructure and Veeam sits
  // under infrastructure, which looks inconsistent for two backup products and
  // is not: Acronis sells its business range as endpoint protection with
  // backup in it, Veeam sells data protection for a virtual estate. Each is
  // filed where a buyer would look for it.
  tally: "SOFTWARE_CLOUD",
  teamviewer: "SOFTWARE_CLOUD",
  anydesk: "SOFTWARE_CLOUD",
  zoom: "SOFTWARE_CLOUD",
  foxit: "SOFTWARE_CLOUD",
  mathworks: "SOFTWARE_CLOUD",
  ansys: "SOFTWARE_CLOUD",
  ptc: "SOFTWARE_CLOUD",

  veeam: "ENTERPRISE_INFRASTRUCTURE",
  citrix: "ENTERPRISE_INFRASTRUCTURE",
  netgear: "ENTERPRISE_INFRASTRUCTURE",
  "tp-link": "ENTERPRISE_INFRASTRUCTURE",
  seagate: "ENTERPRISE_INFRASTRUCTURE",
  "western-digital": "ENTERPRISE_INFRASTRUCTURE",

  // Printing, displays and headsets go under business hardware for the same
  // reason Logitech already does: it is the group a buyer looks in for the
  // things on and around a desk, and a fifth heading for peripherals would
  // split that search rather than serve it.
  samsung: "BUSINESS_HARDWARE",
  canon: "BUSINESS_HARDWARE",
  epson: "BUSINESS_HARDWARE",
  brother: "BUSINESS_HARDWARE",
  jabra: "BUSINESS_HARDWARE",
};
