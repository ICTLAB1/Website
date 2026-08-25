import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * A second GA4 property, and the cookie the cookie policy has to name.
 *
 * Google Analytics writes one `_ga_<property>` cookie per configured property,
 * so measuring two means two cookies rather than one. The policy lists cookies
 * by name — that is the whole point of listing them — so a second property that
 * went in without this would leave a document that names one of the two cookies
 * the site actually sets.
 *
 * Runs after `2026-08-analytics-disclosure`, whose row it edits. On a database
 * that has never seen either, the seed already carries the finished text and
 * both migrations report that there is nothing to do.
 */
const FROM = {
  key: "_ga_P0H1WJDZ7Y",
  value: "Google Analytics. Holds the state of the current visit for this site's property",
};

const TO = [
  {
    key: "_ga_P0H1WJDZ7Y",
    value: "Google Analytics. Holds the state of the current visit for one of the two properties this site reports to",
  },
  {
    key: "_ga_2CEL7BH689",
    value: "Google Analytics. The same, for the second property",
  },
];

export const secondAnalyticsProperty: ContentMigration = {
  id: "2026-08-second-analytics-property",
  describe: "the cookie policy names the second analytics property's cookie",

  async apply(prisma) {
    const section = await prisma.pageSection.findFirst({
      where: { page: { slug: "cookie-policy" }, displayOrder: 3 },
      select: { id: true, data: true },
    });

    if (!section) return "the cookie table is not there — nothing to correct";

    const data = (section.data ?? {}) as { items?: Array<{ key: string; value: string }> };
    const items = data.items ?? [];

    if (items.some((row) => row.key === TO[1]!.key)) {
      return "the second analytics cookie is already listed";
    }

    const index = items.findIndex((row) => row.key === FROM.key && row.value === FROM.value);
    if (index === -1) {
      return "the cookie table has been edited since — left alone";
    }

    const updated = [...items.slice(0, index), ...TO, ...items.slice(index + 1)];

    await prisma.pageSection.update({
      where: { id: section.id },
      data: { data: { ...data, items: updated } as Prisma.InputJsonValue },
    });

    return "the second analytics cookie is now listed";
  },
};
