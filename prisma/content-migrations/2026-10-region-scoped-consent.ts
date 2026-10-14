import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * The policies catch up with consent defaults that differ by country.
 *
 * Until now analytics and advertising measurement were denied everywhere until
 * a visitor accepted, and both documents said so plainly and repeatedly. The
 * defaults are now region-scoped: still denied in the EEA, the United Kingdom
 * and Switzerland, and granted elsewhere, with the notice and the Reject
 * button unchanged for everyone.
 *
 * So every sentence promising that nothing happens until you accept is now
 * false for most of the people reading it — including, since this business
 * sells in India, almost all of them. That is the whole reason this migration
 * exists in the same release as the code: a cookie policy is a statement about
 * what is done to somebody's data, and shipping the behaviour without the
 * wording would publish a false one.
 *
 * The new wording does not claim more privacy than the code delivers, and does
 * not hide the change behind "we may". It names the three places where consent
 * is asked for first, says what happens everywhere else, and says where to
 * refuse — on the same page, in one click, remembered.
 *
 * Every passage is matched before it is written, so anything counsel has
 * edited in the admin panel since is reported rather than overwritten. That
 * guard is also what caught the first version of this file: its section
 * positions were guessed from the previous migration rather than read, and
 * three of the four edits quietly found nothing. The positions below are the
 * ones the content actually occupies — the cookie policy's prose is `markdown`
 * at 2 and its list is `items` at 6, and the privacy policy's slug is
 * `privacy` rather than `privacy-policy`.
 */

type Edit = { slug: string; order: number; field: string; from: unknown; to: unknown };

const ASKED_FIRST = "the EEA, the United Kingdom and Switzerland";

const EDITS: Edit[] = [
  {
    slug: "cookie-policy",
    order: 0,
    field: "subheadline",
    from: "Two strictly necessary cookies, and — only if you accept — Google Analytics and Google's advertising measurement on the public pages. Nothing beyond the necessary two happens until you answer, and none of it runs while you are signed in.",
    to: `Two strictly necessary cookies, and Google Analytics with Google's advertising measurement on the public pages. In ${ASKED_FIRST} those two wait until you accept; everywhere else they run unless you turn them off, which you can do here in one click. None of it runs while you are signed in.`,
  },
  {
    slug: "cookie-policy",
    order: 2,
    field: "markdown",
    from: "Two of the cookies below are strictly necessary: without them you could not sign in, and the site could not tell a real form submission from a forged one. Those you cannot turn off and still use the site, and you are entitled to know exactly what they are — so here they are.\n\nEverything else is asked for. On your first visit to a public page a notice at the foot of the screen asks whether you accept Google Analytics and Google's advertising measurement; until you answer, both are switched off — not paused, not partially on. That is enforced in the page itself: the tag is told analytics and advertising are denied before it is allowed to measure anything, and only your acceptance changes it.\n\nWe ask because we want to know which pages and products people actually use, and because we advertise. Neither loads while you are signed in, so no quotation, order or account page of yours is ever measured. Refusing changes nothing about how this site works, we do not ask again on every visit, and you can change your answer at the bottom of this page whenever you like.",
    to: `Two of the cookies below are strictly necessary: without them you could not sign in, and the site could not tell a real form submission from a forged one. Those you cannot turn off and still use the site, and you are entitled to know exactly what they are — so here they are.\n\nEverything else depends on where you are, and we would rather set that out than blur it. In ${ASKED_FIRST}, where the law requires us to ask first, Google Analytics and Google's advertising measurement are switched off until you accept — not paused, not partially on. Everywhere else they are on from your first page view, and the notice at the foot of the screen is there so you can switch them off.\n\nThat difference is enforced in the page itself rather than promised: the tag is handed one instruction naming those countries and denying both, and a second allowing them elsewhere, before it is permitted to measure anything.\n\nWe do this because we want to know which pages and products people actually use, and because we advertise. Neither loads while you are signed in, so no quotation, order or account page of yours is ever measured. Refusing changes nothing about how this site works, we do not ask again on every visit, and you can change your answer at the bottom of this page whenever you like — a refusal is remembered and applied on every page you open afterwards.`,
  },
  {
    slug: "privacy",
    order: 11,
    field: "markdown",
    from: "This site sets two strictly necessary cookies. On its public pages it also asks whether you accept Google Analytics and Google's advertising measurement; both stay switched off until you accept, and neither is ever loaded while you are signed in — so nothing in your account, your quotations, orders or licences, is measured or sent to Google. The [cookie policy](/cookie-policy) names every cookie, says what each one does, and is where you change your answer.",
    to: `This site sets two strictly necessary cookies. Its public pages also carry Google Analytics and Google's advertising measurement: in ${ASKED_FIRST} both stay switched off until you accept, and everywhere else they run unless you switch them off. Neither is ever loaded while you are signed in — so nothing in your account, your quotations, orders or licences, is measured or sent to Google. The [cookie policy](/cookie-policy) names every cookie, says what each one does, and is where you change your answer.`,
  },
];

/**
 * The list on the cookie policy of what this site does not do. One entry made
 * a promise the region-scoped defaults break; the rest are untouched and are
 * repeated here because the field is written whole.
 */
const NEVER_LIST = {
  slug: "cookie-policy",
  order: 6,
  field: "items",
  from: [
    "Nothing at all until you accept. Analytics and advertising measurement are denied by default on every page, and stay denied if you never answer.",
    "No analytics or advertising on signed-in pages — neither the customer portal nor the admin panel is measured, whatever you answered.",
    "No session recording, no heatmaps, no keystroke or mouse-movement capture.",
    "No social media plug-ins, share widgets or embedded feeds.",
    "No tag manager. The tag is a fixed snippet in the page source, not a container anyone can add further tags to later.",
    "No selling of personal data, and no sharing of it with advertisers other than through Google's own measurement described above.",
  ],
  to: [
    `Nothing at all until you accept, in ${ASKED_FIRST}. Elsewhere analytics and advertising measurement run from your first page view, and the notice at the foot of the screen is how you switch them off.`,
    "No analytics or advertising on signed-in pages — neither the customer portal nor the admin panel is measured, whatever you answered.",
    "No session recording, no heatmaps, no keystroke or mouse-movement capture.",
    "No social media plug-ins, share widgets or embedded feeds.",
    "No tag manager. The tag is a fixed snippet in the page source, not a container anyone can add further tags to later.",
    "No selling of personal data, and no sharing of it with advertisers other than through Google's own measurement described above.",
  ],
};

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const regionScopedConsent: ContentMigration = {
  id: "2026-10-region-scoped-consent",
  describe: "the policies say where consent is asked for first, and what happens elsewhere",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of [...EDITS, NEVER_LIST]) {
      const section = await prisma.pageSection.findFirst({
        where: { page: { slug: edit.slug }, displayOrder: edit.order },
        select: { id: true, data: true },
      });

      if (!section) {
        missing += 1;
        continue;
      }

      const data = (section.data ?? {}) as Record<string, unknown>;
      const current = data[edit.field];

      if (same(current, edit.to)) {
        already += 1;
        continue;
      }
      if (!same(current, edit.from)) {
        left += 1;
        continue;
      }

      await prisma.pageSection.update({
        where: { id: section.id },
        data: { data: { ...data, [edit.field]: edit.to } as Prisma.InputJsonValue },
      });
      changed += 1;
    }

    return `${changed} passage(s) rewritten, ${already} already current, ${left} edited since and left alone, ${missing} not found`;
  },
};
