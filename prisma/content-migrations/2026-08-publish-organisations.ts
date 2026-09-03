import type { ContentMigration } from "./types";

import { organisationSeeds } from "../seed-data/organisations";

/**
 * The nine organisation emblems go live.
 *
 * They were created unpublished a release ago because the rule then in force
 * wanted a confirmed permission date before a mark could be shown. The business
 * owner has since decided that recording a date per organisation is not how
 * they want to work — their call, and `lib/client-logo` was changed to match
 * rather than a date being invented to satisfy it. Nothing anywhere fabricates
 * an authorisation: the requirement was removed, deliberately, in one place.
 *
 * `permissionReference` is left exactly as it was, recording where the artwork
 * came from. It is a record now rather than a gate, and it is still the answer
 * to "who said we could?" whenever somebody asks.
 *
 * ## Only the rows this repository created
 *
 * Matched on the ids from `seed-data/organisations`, so a customer somebody
 * added by hand and deliberately left unpublished is not swept up by a
 * migration about nine specific emblems. A row already published is untouched.
 */
export const publishOrganisations: ContentMigration = {
  id: "2026-08-publish-organisations",
  describe: "the nine organisation emblems, published",

  async apply(prisma) {
    const ids = organisationSeeds.map((organisation) => organisation.id);

    const { count } = await prisma.clientLogo.updateMany({
      where: { id: { in: ids }, deletedAt: null, published: false },
      data: { published: true },
    });

    if (count === 0) return "the organisation emblems were already published";
    return `${count} organisation emblem(s) published`;
  },
};
