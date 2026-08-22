import { safeLocalImage } from "@/lib/local-image";

/**
 * Accreditation and programme marks — GeM, and anything of that kind later.
 *
 * Kept apart from `/brands/` because the two mean different things. A brand
 * logo identifies a publisher or manufacturer whose products are in the
 * catalogue; a mark here is a statement about *this* company — that it is
 * registered, certified, or admitted to a programme. Mixing them would make it
 * possible to put a government mark on a product card by typing a path.
 *
 * Same validation as every other image referenced by stored data: a filename
 * inside one directory this site serves, and nothing else.
 */
export const MARK_DIR = "/marks/";

/** Returns the path if it is a mark this site serves, and null otherwise. */
export function safeMarkImage(value: string | null | undefined): string | null {
  return safeLocalImage(value, MARK_DIR);
}
