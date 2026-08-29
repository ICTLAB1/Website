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
  published: boolean;
};

/**
 * Whether a customer's mark may appear on the public site.
 *
 * Two conditions: artwork on file, and `published` turned on deliberately.
 *
 *  - **Artwork on file.** There is no wordmark fallback here as there is for a
 *    brand. A publisher's name set in type is a reasonable stand-in for its
 *    logo; a customer's name set in type, in a strip captioned as customers, is
 *    a claim about who this business works for with nothing behind it.
 *  - **Published, deliberately.** Off by default, so a row created while
 *    somebody is still gathering the artwork cannot appear halfway through.
 *
 * ## Why the permission date is no longer one of them
 *
 * It used to be. The rule wanted a confirmed date as well, on the reasoning
 * that a supplier displaying somebody else's trademark should hold evidence it
 * can produce. The business owner has since decided that recording a date per
 * organisation is not how they want to work, and that is their call to make:
 * they hold the relationships, and whether the authorisation is filed here or
 * in an inbox is a business decision rather than an engineering one.
 *
 * So the date is now a record rather than a gate. `permissionHolder`,
 * `permissionReference` and `permissionConfirmedAt` are still on the model and
 * still worth filling in — they are the answer to "who said we could?" when
 * somebody eventually asks — but an empty one no longer stops a mark from
 * being shown. Nothing here was ever faked to get past the old rule; the rule
 * was changed instead.
 *
 * ## What no field can check, and somebody has to
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
 * page, and it has been put to them. It stays written here because this is
 * where somebody will be looking when they add a row.
 */
export function mayShowClientLogo(client: ClientPermission): boolean {
  if (!safeClientLogo(client.logoUrl)) return false;
  return client.published;
}
