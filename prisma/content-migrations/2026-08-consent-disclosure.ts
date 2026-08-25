import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * The policies catch up with consent, and with advertising.
 *
 * Two things shipped in the same release as this migration. Google Consent
 * Mode: analytics and advertising measurement are denied on every page until a
 * visitor accepts, and a notice at the foot of a public page asks. And Google
 * Signals — the advertising half — which is why asking became necessary rather
 * than merely polite.
 *
 * Both documents were written for the state before that. The cookie policy said
 * this site carried no advertising or remarketing, and described analytics as
 * something a reader could only refuse afterwards in their own browser; the
 * privacy policy listed Google as receiving analytics and said nothing about an
 * advertising identifier. Neither sentence survives the change.
 *
 * What the new wording will not do is claim more privacy than the code
 * delivers. It says an identifier that recognises the same browser across
 * Google's network is created *if you accept*, because that is what accepting
 * means, and it says refusal is remembered in the visitor's own browser — which
 * is also why it has to be given again on another device.
 *
 * Every passage is matched before it is written, so anything edited in the
 * admin panel since is reported rather than overwritten.
 */

type Edit = { slug: string; order: number; field: string; from: unknown; to: unknown };

const EDITS: Edit[] = [
  {
    "slug": "cookie-policy",
    "order": 0,
    "field": "subheadline",
    "from": "Two strictly necessary cookies, and Google Analytics on the public pages. Nothing here advertises to you, follows you across other sites, or runs while you are signed in.",
    "to": "Two strictly necessary cookies, and — only if you accept — Google Analytics and Google's advertising measurement on the public pages. Nothing beyond the necessary two happens until you answer, and none of it runs while you are signed in."
  },
  {
    "slug": "cookie-policy",
    "order": 2,
    "field": "heading",
    "from": "What is necessary, what is not, and what you can refuse",
    "to": "What is necessary, what we ask for, and how to say no"
  },
  {
    "slug": "cookie-policy",
    "order": 2,
    "field": "markdown",
    "from": "Two of the cookies below are strictly necessary: without them you could not sign in, and the site could not tell a real form submission from a forged one. Those you cannot turn off and still use the site, and you are entitled to know exactly what they are — so here they are.\n\nGoogle Analytics is a different thing and we would rather say so plainly than bury it. It is not necessary, it is a third party, and it is here because we want to know which pages and products people actually use. It loads on public pages only — never while you are signed in, so no quotation, order or account page is measured. If you would rather not be counted, the last section on this page says how to refuse it, and every part of this site works exactly the same afterwards.",
    "to": "Two of the cookies below are strictly necessary: without them you could not sign in, and the site could not tell a real form submission from a forged one. Those you cannot turn off and still use the site, and you are entitled to know exactly what they are — so here they are.\n\nEverything else is asked for. On your first visit to a public page a notice at the foot of the screen asks whether you accept Google Analytics and Google's advertising measurement; until you answer, both are switched off — not paused, not partially on. That is enforced in the page itself: the tag is told analytics and advertising are denied before it is allowed to measure anything, and only your acceptance changes it.\n\nWe ask because we want to know which pages and products people actually use, and because we advertise. Neither loads while you are signed in, so no quotation, order or account page of yours is ever measured. Refusing changes nothing about how this site works, we do not ask again on every visit, and you can change your answer at the bottom of this page whenever you like."
  },
  {
    "slug": "cookie-policy",
    "order": 7,
    "field": "markdown",
    "from": "Every browser lets you view, block and delete cookies, usually under privacy or site settings.\n\n**To refuse analytics specifically**, block third-party or analytics cookies for this site in your browser, or install Google's own opt-out extension from tools.google.com/dlpage/gaoptout. Nothing else changes: every page, the catalogue, search, the enquiry basket, signing in and every form work exactly as before, and we do not treat a visitor who opts out any differently.\n\nBlocking cookies altogether is also your choice, and most of the site still works: you can browse the catalogue, read every page, search, and build an enquiry basket. You will not be able to sign in, and you will not be able to submit a form, because the protection against forged submissions depends on the token cookie.\n\nSigning out clears the session cookie immediately, and also revokes the session on our side — so a copy of the cookie taken beforehand stops working too.",
    "to": "**Your answer, and changing it.** Use the buttons below. Your choice is kept in your own browser rather than in a cookie or on our server — we have no list of who accepted and no list of who refused. It follows that a different browser, a different device, or clearing your site data means being asked again.\n\n**In the browser itself**, every browser lets you view, block and delete cookies, usually under privacy or site settings, and Google publishes its own opt-out extension at tools.google.com/dlpage/gaoptout. Any of these works regardless of what you told us here.\n\nBlocking cookies altogether is also your choice, and most of the site still works: you can browse the catalogue, read every page, search, and build an enquiry basket. You will not be able to sign in, and you will not be able to submit a form, because the protection against forged submissions depends on the token cookie.\n\nSigning out clears the session cookie immediately, and also revokes the session on our side — so a copy of the cookie taken beforehand stops working too."
  },
  {
    "slug": "privacy",
    "order": 11,
    "field": "markdown",
    "from": "This site sets two strictly necessary cookies, and loads Google Analytics on its public pages. Analytics is never loaded while you are signed in, so nothing in your account — your quotations, orders or licences — is measured or sent to Google. The [cookie policy](/cookie-policy) names every cookie, says what each one does, and says how to refuse the analytics ones.",
    "to": "This site sets two strictly necessary cookies. On its public pages it also asks whether you accept Google Analytics and Google's advertising measurement; both stay switched off until you accept, and neither is ever loaded while you are signed in — so nothing in your account, your quotations, orders or licences, is measured or sent to Google. The [cookie policy](/cookie-policy) names every cookie, says what each one does, and is where you change your answer."
  },
  {
    "slug": "privacy",
    "order": 6,
    "field": "markdown",
    "from": "**Publishers and distributors**, where provisioning a licence requires it. To create a Microsoft, Adobe, Autodesk or Zoho subscription in your name we must pass the administrator's name, email address and the organisation's details to that publisher or to the distributor through whom the programme runs. Provisioning cannot happen without this, and it happens only for orders you have placed.\n\n**Our hosting and email providers**, who process data on our instructions in order to run the site and deliver mail.\n\n**Google**, for website analytics. Our public pages load Google Analytics, which records which page was viewed, an approximate location worked out from your IP address, and the kind of device and browser you used. It is not loaded on any signed-in page, so nothing about your quotations, orders or licences reaches it. The [cookie policy](/cookie-policy) says what it sets and how to refuse it.\n\n**Professional advisers, auditors and authorities**, where we are required to disclose — a lawful demand, a tax audit, or the defence of a legal claim.\n\nThat is the complete list. We do not share personal data with anyone else, and we do not transfer it as an asset except as part of a transfer of the business as a whole, in which case you would be told.\n\n**Transfers outside India.** Some publishers operate their provisioning and support systems outside India. Where a licence you have ordered is provisioned through such a system, the data needed to provision it is processed there. Website analytics is processed by Google on infrastructure outside India. Apart from those two, we do not transfer personal data outside India.",
    "to": "**Publishers and distributors**, where provisioning a licence requires it. To create a Microsoft, Adobe, Autodesk or Zoho subscription in your name we must pass the administrator's name, email address and the organisation's details to that publisher or to the distributor through whom the programme runs. Provisioning cannot happen without this, and it happens only for orders you have placed.\n\n**Our hosting and email providers**, who process data on our instructions in order to run the site and deliver mail.\n\n**Google, if you accept it.** Our public pages ask whether you accept Google Analytics and Google's advertising measurement. If you do, Google receives which page was viewed, an approximate location worked out from your IP address, the kind of device and browser you used, and — for advertising — an identifier that lets Google recognise the same browser across sites in its network and show you advertising based on it. If you refuse, or simply never answer, none of that is sent and no advertising identifier is created. Neither is ever loaded on a signed-in page, so nothing about your quotations, orders or licences reaches Google either way. The [cookie policy](/cookie-policy) says what is set and is where you change your answer.\n\n**Professional advisers, auditors and authorities**, where we are required to disclose — a lawful demand, a tax audit, or the defence of a legal claim.\n\nThat is the complete list. We do not share personal data with anyone else, and we do not transfer it as an asset except as part of a transfer of the business as a whole, in which case you would be told.\n\n**Transfers outside India.** Some publishers operate their provisioning and support systems outside India. Where a licence you have ordered is provisioned through such a system, the data needed to provision it is processed there. Where you have accepted analytics and advertising measurement, that is processed by Google on infrastructure outside India. Apart from those two, we do not transfer personal data outside India."
  },
  {
    "slug": "cookie-policy",
    "order": 6,
    "field": "heading",
    "from": "What this site does not use",
    "to": "What this site does not do"
  },
  {
    "slug": "cookie-policy",
    "order": 6,
    "field": "items",
    "from": [
      "No advertising or remarketing pixels, and no conversion tracking.",
      "No session recording, no heatmaps, no keystroke or mouse-movement capture.",
      "No social media plug-ins, share widgets or embedded feeds.",
      "No tag manager. The analytics tag is a fixed snippet in the page source, not a container anyone can add further tags to later.",
      "No analytics at all on signed-in pages — neither the customer portal nor the admin panel is measured.",
      "No cross-site tracking, device fingerprinting or profiling."
    ],
    "to": [
      "Nothing at all until you accept. Analytics and advertising measurement are denied by default on every page, and stay denied if you never answer.",
      "No analytics or advertising on signed-in pages — neither the customer portal nor the admin panel is measured, whatever you answered.",
      "No session recording, no heatmaps, no keystroke or mouse-movement capture.",
      "No social media plug-ins, share widgets or embedded feeds.",
      "No tag manager. The tag is a fixed snippet in the page source, not a container anyone can add further tags to later.",
      "No selling of personal data, and no sharing of it with advertisers other than through Google's own measurement described above."
    ]
  }
];

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const consentDisclosure: ContentMigration = {
  id: "2026-08-consent-disclosure",
  describe: "the policies describe consent, and the advertising it gates",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of EDITS) {
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

    const parts = [`${changed} passage(s) corrected`];
    if (already > 0) parts.push(`${already} already current`);
    if (left > 0) parts.push(`${left} edited since and left alone`);
    if (missing > 0) parts.push(`${missing} not found`);
    return parts.join(", ");
  },
};
