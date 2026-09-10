import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * Name the managing director on the about page.
 *
 * ## Why
 *
 * CCAvenue's second onboarding review — the first produced
 * `2026-09-ccavenue-compliance` — reported that the site does not meet the
 * net-banking requirements SBI, Axis, ICICI, HDFC and Kotak Mahindra set for a
 * merchant. Most of the checklist was already met: the site is served over
 * HTTPS, the terms, refund and privacy pages are published, the catalogue
 * prices in rupees, and the registered address carries its PIN code. One item
 * was genuinely absent. A bank matches the individual behind a merchant against
 * the account's KYC, and nothing on the site named one: the registered legal
 * name appeared in seven places, and the person who runs the company in none.
 *
 * ## Both halves, and where each lives
 *
 * The name, the designation and the portrait the business supplied go into the
 * settings row, beside the GSTIN and the grievance officer, because that is
 * where business identity lives and where it stays editable without a deploy.
 * All three in one write, so a later director cannot be recorded while the
 * previous one's photograph stays. The about page's panel gets the flag that
 * asks for them.
 *
 * The flag is set on the about page and nowhere else, on the owner's
 * instruction. The same panel appears on the terms, privacy and refund pages —
 * `fields: "all"` since the migration above — and naming an individual four
 * more times at the foot of the legal pages tells a reader nothing they came
 * for.
 *
 * Both writes decline to overwrite. A director recorded by hand is somebody's
 * own entry, and a panel edited since is an author's choice; either is reported
 * rather than replaced, because a deploy is the worst moment to find out a
 * business detail changed silently.
 */
const NAME = "Abhinav Jain";
const TITLE = "Managing Director";

/**
 * The portrait the business supplied, committed at `public/team/`.
 *
 * Written in the same statement as the name so the two cannot part company: a
 * later director recorded without replacing this would otherwise inherit the
 * previous one's face.
 */
const PHOTO = "/team/abhinav-jain.webp";

/** The about page's identity panel, as `seed-data/pages.ts` places it. */
const ABOUT_PANEL = { slug: "about", displayOrder: 4 };

export const nameTheManagingDirector: ContentMigration = {
  id: "2026-09-name-the-managing-director",
  describe: "name and picture the managing director on the about page, for payment-gateway KYC",

  async apply(prisma) {
    const outcomes: string[] = [];

    const existing = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { directorName: true, directorTitle: true, directorPhoto: true },
    });

    const current = existing?.directorName?.trim() ?? "";
    const record = { directorName: NAME, directorTitle: TITLE, directorPhoto: PHOTO };

    if (!existing) {
      await prisma.siteSettings.create({ data: { id: "singleton", ...record } });
      outcomes.push("director recorded");
    } else if (current !== "" && current !== NAME) {
      outcomes.push(`director is set to "${current}" — left alone`);
    } else if (current === NAME && existing.directorPhoto?.trim()) {
      outcomes.push("director already recorded");
    } else {
      // Either nothing recorded, or the name from an earlier run of this
      // migration with no portrait yet — the photograph is the new half.
      await prisma.siteSettings.update({ where: { id: "singleton" }, data: record });
      outcomes.push(current === NAME ? "director portrait recorded" : "director recorded");
    }

    const section = await prisma.pageSection.findFirst({
      where: {
        page: { slug: ABOUT_PANEL.slug },
        displayOrder: ABOUT_PANEL.displayOrder,
        type: "COMPANY_INFO",
      },
      select: { id: true, data: true },
    });

    if (!section) {
      outcomes.push("no company-info panel on the about page in this database");
      return outcomes.join(", ");
    }

    const data = (section.data ?? {}) as Record<string, unknown>;

    if (data.showDirector === true) {
      outcomes.push("the about panel already asks for it");
      return outcomes.join(", ");
    }

    await prisma.pageSection.update({
      where: { id: section.id },
      data: { data: { ...data, showDirector: true } as Prisma.InputJsonValue },
    });
    outcomes.push("the about panel now names the director");

    return outcomes.join(", ");
  },
};
