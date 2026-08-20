import { microsoftPages } from "./microsoft";
import { adobePages } from "./adobe";
import { autodeskPages } from "./autodesk";
import { zohoPages } from "./zoho";
import { solutionPages } from "./solutions";
import type { LandingPage } from "./types";

export const landingPages: LandingPage[] = [
  ...microsoftPages,
  ...adobePages,
  ...autodeskPages,
  ...zohoPages,
  ...solutionPages,
];

/** Slug lookup, built once at module load. */
const bySlug = new Map(landingPages.map((page) => [page.slug, page]));

export function getLandingPage(segments: string[]): LandingPage | undefined {
  return bySlug.get(segments.join("/"));
}

export function allLandingSlugs(): string[][] {
  return landingPages.map((page) => page.slug.split("/"));
}

export type { LandingPage } from "./types";
