import type { ContentMigration } from "./types";

/**
 * The support address, from a person's mailbox to the shared one.
 *
 * "Support" on the company information block, and everywhere else the support
 * address is printed, was a named person's mailbox. It is now
 * `support@techzoidtechnologies.com`.
 *
 * The address can come from two places: the settings row an administrator
 * edits, or the `COMPANY_EMAIL_SUPPORT` environment variable it falls back to.
 * This reads the value the site is actually using and, if it is exactly the
 * old address, stores the new one in the settings row, which wins over the
 * environment. Anything else — a different address somebody has since chosen —
 * is left alone.
 */
const OLD = "abhinav.jain@techzoidtechnologies.com";
const NEW = "support@techzoidtechnologies.com";

export const supportEmail: ContentMigration = {
  id: "2026-11-support-email",
  describe: "the support address, from a personal mailbox to support@",

  async apply(prisma) {
    const row = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { emailSupport: true },
    });
    const current =
      row?.emailSupport?.trim() ||
      process.env.COMPANY_EMAIL_SUPPORT?.trim() ||
      null;

    if (current?.toLowerCase() !== OLD) {
      return `support address left alone (${current ?? "not set"})`;
    }

    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: { emailSupport: NEW },
      create: { id: "singleton", emailSupport: NEW },
    });
    return `support address is now ${NEW}`;
  },
};
