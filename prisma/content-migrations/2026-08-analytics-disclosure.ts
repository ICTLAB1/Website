import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * The legal pages catch up with the analytics tag.
 *
 * Google Analytics went on to the public pages in the same release as this
 * migration. Both legal documents were written when there was none, and both
 * said so in terms: the cookie policy explained why it needed no consent
 * banner, listed "no Google Analytics" among the things this site does not use,
 * and the privacy policy named every recipient of personal data and ended the
 * list with "that is the complete list".
 *
 * Every one of those sentences became untrue the moment the tag shipped. A
 * privacy policy that is wrong is worse than one that is unflattering — it is
 * the document a regulator, a customer's procurement office or a security
 * questionnaire is answered from — so the copy is corrected in the same release
 * rather than the next one.
 *
 * ## What it does not do
 *
 * It does not add a consent banner, and it does not claim consent is
 * unnecessary. The wording states plainly that analytics is not a necessary
 * cookie, that it runs only on public pages, and how to refuse it. Whether this
 * business also wants a consent gate is a decision for the business, not
 * something a content migration should decide by writing a sentence.
 *
 * ## Why every edit is matched before it is written
 *
 * These pages are editable in the admin panel. A paragraph somebody has
 * reworded since is a paragraph somebody looked at, and it is reported rather
 * than overwritten — the same rule every content migration here follows.
 */

type Edit = {
  slug: string;
  order: number;
  field: string;
  from: unknown;
  to: unknown;
};

const EDITS: Edit[] = [
  {
    "slug": "privacy",
    "order": 11,
    "field": "markdown",
    "from": "This site sets two cookies, both strictly necessary, and no others. There is no analytics, advertising or tracking cookie anywhere on it. The [cookie policy](/cookie-policy) names each one and says what it does.",
    "to": "This site sets two strictly necessary cookies, and loads Google Analytics on its public pages. Analytics is never loaded while you are signed in, so nothing in your account — your quotations, orders or licences — is measured or sent to Google. The [cookie policy](/cookie-policy) names every cookie, says what each one does, and says how to refuse the analytics ones."
  },
  {
    "slug": "privacy",
    "order": 6,
    "field": "markdown",
    "from": "**Publishers and distributors**, where provisioning a licence requires it. To create a Microsoft, Adobe, Autodesk or Zoho subscription in your name we must pass the administrator's name, email address and the organisation's details to that publisher or to the distributor through whom the programme runs. Provisioning cannot happen without this, and it happens only for orders you have placed.\n\n**Our hosting and email providers**, who process data on our instructions in order to run the site and deliver mail.\n\n**Professional advisers, auditors and authorities**, where we are required to disclose — a lawful demand, a tax audit, or the defence of a legal claim.\n\nThat is the complete list. We do not share personal data with anyone else, and we do not transfer it as an asset except as part of a transfer of the business as a whole, in which case you would be told.\n\n**Transfers outside India.** Some publishers operate their provisioning and support systems outside India. Where a licence you have ordered is provisioned through such a system, the data needed to provision it is processed there. We do not transfer personal data outside India for any other purpose.",
    "to": "**Publishers and distributors**, where provisioning a licence requires it. To create a Microsoft, Adobe, Autodesk or Zoho subscription in your name we must pass the administrator's name, email address and the organisation's details to that publisher or to the distributor through whom the programme runs. Provisioning cannot happen without this, and it happens only for orders you have placed.\n\n**Our hosting and email providers**, who process data on our instructions in order to run the site and deliver mail.\n\n**Google**, for website analytics. Our public pages load Google Analytics, which records which page was viewed, an approximate location worked out from your IP address, and the kind of device and browser you used. It is not loaded on any signed-in page, so nothing about your quotations, orders or licences reaches it. The [cookie policy](/cookie-policy) says what it sets and how to refuse it.\n\n**Professional advisers, auditors and authorities**, where we are required to disclose — a lawful demand, a tax audit, or the defence of a legal claim.\n\nThat is the complete list. We do not share personal data with anyone else, and we do not transfer it as an asset except as part of a transfer of the business as a whole, in which case you would be told.\n\n**Transfers outside India.** Some publishers operate their provisioning and support systems outside India. Where a licence you have ordered is provisioned through such a system, the data needed to provision it is processed there. Website analytics is processed by Google on infrastructure outside India. Apart from those two, we do not transfer personal data outside India."
  },
  {
    "slug": "cookie-policy",
    "order": 0,
    "field": "subheadline",
    "from": "This site sets two cookies. Both are strictly necessary, neither tracks you, and there is no third-party cookie of any kind.",
    "to": "Two strictly necessary cookies, and Google Analytics on the public pages. Nothing here advertises to you, follows you across other sites, or runs while you are signed in."
  },
  {
    "slug": "cookie-policy",
    "order": 2,
    "field": "heading",
    "from": "Why there is no cookie banner",
    "to": "What is necessary, what is not, and what you can refuse"
  },
  {
    "slug": "cookie-policy",
    "order": 2,
    "field": "markdown",
    "from": "A consent banner exists to obtain permission for cookies that are not necessary — analytics, advertising, profiling. This site sets none of those, so there is nothing to ask permission for, and a banner would be theatre.\n\nThe two cookies below are strictly necessary: without them you could not sign in, and the site could not protect a form submission from being forged. Necessary cookies do not require consent under any framework we operate in, but you are entitled to know exactly what they are — so here they are.",
    "to": "Two of the cookies below are strictly necessary: without them you could not sign in, and the site could not tell a real form submission from a forged one. Those you cannot turn off and still use the site, and you are entitled to know exactly what they are — so here they are.\n\nGoogle Analytics is a different thing and we would rather say so plainly than bury it. It is not necessary, it is a third party, and it is here because we want to know which pages and products people actually use. It loads on public pages only — never while you are signed in, so no quotation, order or account page is measured. If you would rather not be counted, the last section on this page says how to refuse it, and every part of this site works exactly the same afterwards."
  },
  {
    "slug": "cookie-policy",
    "order": 3,
    "field": "heading",
    "from": "The two cookies",
    "to": "The cookies this site sets"
  },
  {
    "slug": "cookie-policy",
    "order": 7,
    "field": "markdown",
    "from": "Every browser lets you view, block and delete cookies, usually under privacy or site settings.\n\nBlocking cookies for this site is entirely your choice, and most of it will still work: you can browse the catalogue, read every page, search, and build an enquiry basket. You will not be able to sign in, and you will not be able to submit a form, because the protection against forged submissions depends on the token cookie.\n\nSigning out clears the session cookie immediately, and also revokes the session on our side — so a copy of the cookie taken beforehand stops working too.",
    "to": "Every browser lets you view, block and delete cookies, usually under privacy or site settings.\n\n**To refuse analytics specifically**, block third-party or analytics cookies for this site in your browser, or install Google's own opt-out extension from tools.google.com/dlpage/gaoptout. Nothing else changes: every page, the catalogue, search, the enquiry basket, signing in and every form work exactly as before, and we do not treat a visitor who opts out any differently.\n\nBlocking cookies altogether is also your choice, and most of the site still works: you can browse the catalogue, read every page, search, and build an enquiry basket. You will not be able to sign in, and you will not be able to submit a form, because the protection against forged submissions depends on the token cookie.\n\nSigning out clears the session cookie immediately, and also revokes the session on our side — so a copy of the cookie taken beforehand stops working too."
  },
  {
    "slug": "cookie-policy",
    "order": 3,
    "field": "items",
    "from": [
      {
        "key": "csrf_token",
        "value": "Ties a form submission to your browser, so another site cannot forge one"
      },
      {
        "key": "csrf_token — lifetime",
        "value": "The browser session"
      },
      {
        "key": "ictlab_session",
        "value": "Keeps you signed in. Set only when you sign in"
      },
      {
        "key": "ictlab_session — lifetime",
        "value": "Until you sign out or it expires"
      },
      {
        "key": "Both — flags",
        "value": "HttpOnly, Secure, SameSite"
      },
      {
        "key": "Both — contents",
        "value": "An opaque random token. No name, email or account detail"
      }
    ],
    "to": [
      {
        "key": "csrf_token",
        "value": "Strictly necessary. Ties a form submission to your browser, so another site cannot forge one"
      },
      {
        "key": "csrf_token — lifetime",
        "value": "The browser session"
      },
      {
        "key": "ictlab_session",
        "value": "Strictly necessary. Keeps you signed in. Set only when you sign in"
      },
      {
        "key": "ictlab_session — lifetime",
        "value": "Until you sign out or it expires"
      },
      {
        "key": "Those two — flags",
        "value": "HttpOnly, Secure, SameSite"
      },
      {
        "key": "Those two — contents",
        "value": "An opaque random token. No name, email or account detail"
      },
      {
        "key": "_ga",
        "value": "Google Analytics. Tells one browser from another, so a second visit is not counted as a second person"
      },
      {
        "key": "_ga_P0H1WJDZ7Y",
        "value": "Google Analytics. Holds the state of the current visit for this site's property"
      },
      {
        "key": "The analytics pair — lifetime",
        "value": "Two years from your last visit, unless you clear them sooner"
      },
      {
        "key": "The analytics pair — where",
        "value": "Public pages only. Never in your account, and never in the admin panel"
      }
    ]
  },
  {
    "slug": "cookie-policy",
    "order": 6,
    "field": "items",
    "from": [
      "No analytics of any kind — no Google Analytics, no product analytics, no session recording, no heatmaps.",
      "No advertising or remarketing pixels, and no conversion tracking.",
      "No social media plug-ins, share widgets or embedded feeds.",
      "No third-party fonts, scripts or tag managers loaded from another domain.",
      "No cross-site tracking, device fingerprinting or profiling."
    ],
    "to": [
      "No advertising or remarketing pixels, and no conversion tracking.",
      "No session recording, no heatmaps, no keystroke or mouse-movement capture.",
      "No social media plug-ins, share widgets or embedded feeds.",
      "No tag manager. The analytics tag is a fixed snippet in the page source, not a container anyone can add further tags to later.",
      "No analytics at all on signed-in pages — neither the customer portal nor the admin panel is measured.",
      "No cross-site tracking, device fingerprinting or profiling."
    ]
  }
];

const META: Array<{ slug: string; field: "description"; from: string; to: string }> = [
  {
    "slug": "cookie-policy",
    "field": "description",
    "from": "The two cookies this website sets, what each one does, what is kept in your browser's local storage, and what this site deliberately does not use.",
    "to": "Every cookie this website sets — two strictly necessary, and Google Analytics on the public pages — what each one does, and how to refuse the ones that are not necessary."
  }
];

/** Deep equality by shape, which is all these values ever are. */
function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export const analyticsDisclosure: ContentMigration = {
  id: "2026-08-analytics-disclosure",
  describe: "the cookie and privacy policies state the analytics tag",

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

    for (const edit of META) {
      const page = await prisma.page.findFirst({
        where: { slug: edit.slug },
        select: { id: true, description: true },
      });

      if (!page) {
        missing += 1;
        continue;
      }
      if (page.description === edit.to) {
        already += 1;
        continue;
      }
      if (page.description !== edit.from) {
        left += 1;
        continue;
      }

      await prisma.page.update({ where: { id: page.id }, data: { description: edit.to } });
      changed += 1;
    }

    const parts = [`${changed} passage(s) corrected`];
    if (already > 0) parts.push(`${already} already current`);
    if (left > 0) parts.push(`${left} edited since and left alone`);
    if (missing > 0) parts.push(`${missing} not found`);
    return parts.join(", ");
  },
};
