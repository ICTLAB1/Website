import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * The homepage's certifications block said "Independently certified" and
 * "Assessed by accredited certification bodies against international
 * standards" — true of the three ISO certificates, and no longer true of
 * every row the block renders once Udyam Registration and Startup India
 * joined them: a government registration is not a third-party audit
 * against an international standard, and calling it one misdescribes it.
 *
 * Widens the wording to cover both kinds of credential honestly, rather
 * than folding a registration into a sentence written for a certification.
 * The footer strip's matching hardcoded label is fixed in the same commit
 * as this migration; this migration only reaches the database-held copy.
 */
const FROM = {
  eyebrow: "Independently certified",
  heading: "Certifications",
  description:
    "Assessed by accredited certification bodies against international standards. Each certificate number below can be checked with the body that issued it.",
};

const TO = {
  eyebrow: "Certified and registered",
  heading: "Certifications & registrations",
  description:
    "Independently audited against international standards, and registered with the Government of India. Each reference below can be checked with the body that issued it.",
};

// The description shipped once already shortened by hand in the admin panel
// (no second sentence) before this migration existed — matched on the eyebrow
// and heading alone, which have not been touched independently of the
// description in the time this block has existed.
export const certificationsHeading: ContentMigration = {
  id: "2026-09-certifications-heading",
  describe: "widen the certifications block's heading now it covers government registrations too",

  async apply(prisma) {
    const page = await prisma.page.findUnique({ where: { slug: "" }, select: { id: true } });
    if (!page) return "no home page in this database";

    const section = await prisma.pageSection.findFirst({
      where: { pageId: page.id, type: "COLLECTION_GRID", displayOrder: 15 },
      select: { id: true, data: true },
    });
    if (!section) return "no certifications block found at its expected position";

    const data = (section.data ?? {}) as Record<string, unknown>;
    if (data.kind !== "certifications") return "block at that position is not the certifications one";

    if (data.eyebrow === TO.eyebrow && data.heading === TO.heading) {
      return "already current";
    }
    if (data.eyebrow !== FROM.eyebrow || data.heading !== FROM.heading) {
      // An administrator has edited this block's heading since — not this
      // migration's to override.
      return "edited since and left alone";
    }

    await prisma.pageSection.update({
      where: { id: section.id },
      data: { data: { ...data, ...TO } as Prisma.InputJsonValue },
    });

    return "certifications block heading widened to cover government registrations";
  },
};
