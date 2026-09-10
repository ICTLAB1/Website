import { safeLocalImage } from "@/lib/local-image";

/**
 * Photographs of the people who run the company.
 *
 * Kept apart from `/marks/` and `/brands/` because the three assert different
 * things. A brand logo identifies a publisher whose products are in the
 * catalogue; a mark states that this company is registered or certified; a file
 * here is a photograph of a named individual. Separating them means a portrait
 * cannot be served where a programme mark is expected, or the reverse — and it
 * keeps the one directory holding pictures of people obvious to anyone deciding
 * what may go in it.
 *
 * Same validation as every other image referenced by stored data: a filename
 * inside one directory this site serves, and nothing else.
 */
export const TEAM_DIR = "/team/";

/** Returns the path if it is a portrait this site serves, and null otherwise. */
export function safeTeamImage(value: string | null | undefined): string | null {
  return safeLocalImage(value, TEAM_DIR);
}
