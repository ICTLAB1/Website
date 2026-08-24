import type { ContentMigration } from "./types";

/**
 * The UAE office, from the letterhead the business supplied.
 *
 * ## What this is correcting
 *
 * The settings row already held a second entity, and it was not real. While
 * building the quotation letterhead I needed something in those two fields to
 * see the layout, typed a plausible-looking UAE address, and left it there —
 * "TechZoid Technologies F.Z.E", at an address nobody had confirmed. It has
 * been printing under the letterhead on quotations since. This replaces it
 * with the address and number from the company's own stationery.
 *
 * ## The name
 *
 * `TechZoid Technologies — UAE office`, not a legal entity name. The letterhead
 * gives an address and a telephone number and does not name a UAE company, so
 * naming one would be repeating the original mistake in better handwriting. If
 * the branch is a registered entity with a name of its own — an FZE or an LLC —
 * it belongs in Settings, where this is editable without a deploy.
 *
 * ## Why it overwrites where the profile-URL migration does not
 *
 * That one refuses to touch anything already stored, because a value there
 * would be one somebody chose. This one exists precisely because the value
 * already stored was never chosen by anybody — but it still only replaces the
 * exact text it expects. An address edited since is one somebody looked at, and
 * is left alone and reported.
 */
const INVENTED_NAME = "TechZoid Technologies F.Z.E";

const NAME = "TechZoid Technologies — UAE office";
const ADDRESS = "Office C1-1F-SF2571, Ajman Free Zone C1 Building, Ajman Free Zone, Ajman";
const PHONE = "+971 58 939 7239";

export const uaeBranch: ContentMigration = {
  id: "2026-08-uae-branch",
  describe: "the UAE office, replacing a placeholder second entity",

  async apply(prisma) {
    const existing = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { secondaryEntityName: true, secondaryEntityAddress: true },
    });

    if (!existing) {
      await prisma.siteSettings.create({
        data: {
          id: "singleton",
          secondaryEntityName: NAME,
          secondaryEntityAddress: ADDRESS,
          secondaryEntityPhone: PHONE,
        },
      });
      return "UAE office recorded";
    }

    const current = existing.secondaryEntityName?.trim() ?? "";

    // Already correct, or already replaced by hand.
    if (current === NAME) return "the UAE office is already recorded";

    /*
     * Anything other than the placeholder is somebody's own entry. Reported
     * rather than overwritten — a deploy is the worst possible moment to
     * discover a business detail was replaced silently.
     */
    if (current !== "" && current !== INVENTED_NAME) {
      return `second entity is set to "${current}" — left alone; set the UAE office by hand if that is stale`;
    }

    await prisma.siteSettings.update({
      where: { id: "singleton" },
      data: {
        secondaryEntityName: NAME,
        secondaryEntityAddress: ADDRESS,
        secondaryEntityPhone: PHONE,
      },
    });

    return current === INVENTED_NAME
      ? "placeholder second entity replaced with the real UAE office"
      : "UAE office recorded";
  },
};
