import { safeLocalImage, UPLOAD_DIR } from "@/lib/local-image";

/**
 * Where a customer's logo may be loaded from, and when it may be shown.
 *
 * The path checking is `lib/local-image`, shared with brand logos and product
 * photographs because it is the same class of input. What is specific here is
 * the second question, which brand logos do not have to answer: whether this
 * business is entitled to display the mark at all.
 */

/** Artwork committed to the repository, served from `public/clients/`. */
export const CLIENT_LOGO_DIR = "/clients/";

/** Artwork uploaded from the admin panel. */
export const CLIENT_UPLOAD_DIR = UPLOAD_DIR;

/** Returns the path if it is a safe local client logo, and null otherwise. */
export function safeClientLogo(value: string | null | undefined): string | null {
  return safeLocalImage(value, CLIENT_LOGO_DIR);
}

export type ClientPermission = {
  logoUrl: string | null;
  permissionConfirmedAt: Date | null;
  published: boolean;
};

/**
 * Whether a customer's mark may appear on the public site.
 *
 * Three conditions, and all three are required.
 *
 *  - **Artwork on file.** There is no wordmark fallback here as there is for a
 *    brand. A publisher's name set in type is a reasonable stand-in for its
 *    logo; a customer's name set in type, in a strip captioned as customers, is
 *    a claim about who this business works for with nothing behind it.
 *  - **A confirmed permission date.** Not a note, not an intention — a date
 *    somebody put in the record having checked.
 *  - **Published, deliberately.** Off by default even once permission is
 *    recorded, because obtaining permission and choosing to use it are two
 *    decisions and only the second one is about the website.
 *
 * This is the only function that decides. Every query that reaches a visitor
 * goes through `publishedClientLogos`, which is built on it, so there is one
 * place to read and one place to change — and no page can display a mark by
 * forgetting to check.
 *
 * ## What this cannot check, and somebody has to
 *
 * Permission from the organisation is necessary and is not always sufficient.
 * In India the Emblems and Names (Prevention of Improper Use) Act, 1950 bars
 * the use of a schedule of names and emblems — the national emblem, the flag,
 * the names and emblems of the armed forces among them — "for the purpose of
 * any trade, business, calling or profession". That is a statutory bar, so it
 * is not something the department concerned can waive by letter, and a
 * marketing strip on a supplier's website is exactly the use it names.
 *
 * A field cannot enforce that; it is a question for whoever signs off the
 * page. It is written here because this is where somebody will be looking when
 * they add a row, and a comment in the code is the last place the question can
 * be raised before the mark is on the internet.
 */
export function mayShowClientLogo(client: ClientPermission): boolean {
  if (!safeClientLogo(client.logoUrl)) return false;
  if (client.permissionConfirmedAt === null) return false;
  return client.published;
}
