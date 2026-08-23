import type { ContentMigration } from "./types";

/**
 * Who is copied on every quotation that leaves the site.
 *
 * Supplied by the business. It lives in `MailSettings` so an administrator can
 * change it without a deploy, and it is written here because a value typed into
 * one environment's admin panel exists in exactly that environment — the
 * request was that this happen automatically on every quotation, which means it
 * has to be true the moment the deploy finishes rather than after somebody
 * remembers to set it.
 *
 * A visible Cc, not a Bcc. The customer can see who else at the supplier is on
 * the thread and a reply-all reaches them, which is the point of copying
 * somebody on a commercial document.
 *
 * ## Why it refuses to overwrite
 *
 * Anything already stored is left alone. The field exists so a person can
 * decide what belongs in it, and a migration that replaced a later decision
 * with this one would undo it silently during a deploy.
 *
 * The row is created if there is none: `MailSettings` is a singleton that first
 * appears when somebody saves the mail form, and a deployment configured
 * entirely through environment variables has no row at all.
 */
const COPY_TO = "abhinav.jain@techzoidtechnologies.com";

export const quoteCopy: ContentMigration = {
  id: "2026-08-quote-copy",
  describe: "copy every quotation to the supplied address",

  async apply(prisma) {
    const existing = await prisma.mailSettings.findUnique({
      where: { id: "singleton" },
      select: { quoteCopyEmail: true },
    });

    if (existing?.quoteCopyEmail?.trim()) {
      return "a quotation copy address is already set — left alone";
    }

    await prisma.mailSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", quoteCopyEmail: COPY_TO },
      update: { quoteCopyEmail: COPY_TO },
    });

    return `quotations are copied to ${COPY_TO}`;
  },
};
