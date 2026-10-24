import type { ContentMigration } from "./types";

/**
 * Says in the privacy policy what the chat assistant actually does.
 *
 * ## Two things the page was not saying
 *
 * The assistant sends what a visitor types to Anthropic in order to answer
 * it. The policy's "Who else sees it" section ends with the sentence **"That
 * is the complete list"** — and Anthropic was not on it. That was already
 * true before this release; it is the kind of gap that is easy to leave
 * because the feature was built after the policy was written and nobody went
 * back. Its transfers paragraph had the same shape: it accounted for two
 * destinations outside India and said "apart from those two".
 *
 * And from this release the conversations are kept. Storing what people type
 * into a chat box is storing personal data — a name, a phone number, whatever
 * they chose to put there — so it is named in the retention table with a
 * period against it, next to the other seven. `tests/retention.test.ts` reads
 * that table out of the seed copy and fails if a rule exists in code without
 * a published row, which is why the rule and the row went in together.
 *
 * ## Matched on the text rather than the position
 *
 * Both edits find the sentence they are replacing and refuse to run twice.
 * The privacy page is editable in the admin panel; keying off a block index
 * would rewrite whatever happened to be at that index after somebody
 * reordered the page.
 */

const PROCESSOR_ANCHOR = "That is the complete list. We do not share personal data with anyone else";

const PROCESSOR_PARAGRAPH =
  "**Anthropic, when you use the chat assistant.** The assistant on this site is built on Anthropic's Claude. " +
  "What you type into it, together with the catalogue information it looks up in order to answer you, is sent to Anthropic to generate the reply. " +
  "Treat it as you would an email to us rather than a private note: do not type anything into it you would not send us. " +
  "Conversations are kept for twelve months so we can see what visitors ask and answer it better, and are deleted on that schedule. " +
  "If you give your name and email so that somebody can follow up, that becomes an enquiry and is kept for the enquiry period instead.\n\n";

const TRANSFERS_OLD =
  "Where you have accepted analytics and advertising measurement, that is processed by Google on infrastructure outside India. Apart from those two, we do not transfer personal data outside India.";

const TRANSFERS_NEW =
  "Where you have accepted analytics and advertising measurement, that is processed by Google on infrastructure outside India. " +
  "Where you use the chat assistant, the messages you send it are processed by Anthropic outside India. " +
  "Apart from those three, we do not transfer personal data outside India.";

const RETENTION_HEADING = "How long we keep it";
const RETENTION_ROW = {
  key: "Chat conversations with the assistant",
  value: "12 months",
};

export const privacyTheAssistant: ContentMigration = {
  id: "2026-10-privacy-the-assistant",
  describe: "name the assistant's processor in the privacy policy, and publish its retention period",

  async apply(prisma) {
    const page = await prisma.page.findUnique({
      where: { slug: "privacy" },
      select: { id: true },
    });
    if (!page) return "no privacy page to amend; nothing changed";

    const sections = await prisma.pageSection.findMany({
      where: { pageId: page.id },
      select: { id: true, type: true, data: true },
    });

    let processor = 0;
    let transfers = 0;
    let retention = 0;

    for (const section of sections) {
      if (section.type === "RICH_TEXT") {
        const data = section.data as { markdown?: unknown } | null;
        if (typeof data?.markdown !== "string") continue;

        let markdown = data.markdown;
        if (markdown.includes(PROCESSOR_ANCHOR) && !markdown.includes("**Anthropic,")) {
          markdown = markdown.replace(PROCESSOR_ANCHOR, PROCESSOR_PARAGRAPH + PROCESSOR_ANCHOR);
          processor += 1;
        }
        if (markdown.includes(TRANSFERS_OLD)) {
          markdown = markdown.replace(TRANSFERS_OLD, TRANSFERS_NEW);
          transfers += 1;
        }
        if (markdown !== data.markdown) {
          await prisma.pageSection.update({
            where: { id: section.id },
            data: { data: { ...data, markdown } },
          });
        }
        continue;
      }

      if (section.type === "KEY_VALUE_LIST") {
        const data = section.data as {
          heading?: string;
          items?: Array<{ key: string; value: string }>;
        } | null;
        if (data?.heading !== RETENTION_HEADING || !Array.isArray(data.items)) continue;
        if (data.items.some((item) => item.key === RETENTION_ROW.key)) continue;

        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: { ...data, items: [...data.items, RETENTION_ROW] } },
        });
        retention += 1;
      }
    }

    const parts: string[] = [];
    if (processor) parts.push("named Anthropic among the recipients");
    if (transfers) parts.push("added it to the transfers outside India");
    if (retention) parts.push("published the twelve-month conversation retention");
    return parts.length > 0 ? parts.join(", ") : "the privacy policy already says all of it; nothing changed";
  },
};
