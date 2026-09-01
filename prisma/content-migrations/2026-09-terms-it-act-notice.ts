import type { ContentMigration } from "./types";

/**
 * A one-line statutory notice on the terms page.
 *
 * CCAvenue's own compliance template opens every Terms & Conditions document
 * with a line tying it to the Information Technology Act, 2000 — a genuinely
 * missing element when checked against what is otherwise a page that already
 * exceeds their template on substance (limitation of liability, indemnity,
 * governing law and every other section it asks for are already there, in a
 * form specific to this business rather than the template's boilerplate).
 *
 * The line added is deliberately narrow: it states this page is an
 * electronic record under the Act, which is true of any published terms
 * document. It does not adopt the template's "intermediary" framing — the
 * Intermediaries Guidelines Rules govern platforms hosting third-party
 * content, and overclaiming that status for a B2B reseller's own catalogue
 * is exactly the kind of thing this codebase does not do.
 */

export const termsItActNotice: ContentMigration = {
  id: "2026-09-terms-it-act-notice",
  describe: "add the IT Act 2000 electronic-record notice to the terms page",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "terms" },
      select: { id: true, sections: { select: { id: true, displayOrder: true } } },
    });

    if (!page) return "terms page not found";

    const occupied = page.sections.some((section) => section.displayOrder === 1);
    if (occupied) return "displayOrder 1 already taken on the terms page; left alone";

    await prisma.pageSection.create({
      data: {
        pageId: page.id,
        type: "RICH_TEXT",
        displayOrder: 1,
        visible: true,
        data: {
          markdown:
            "This document is an electronic record under the Information Technology Act, 2000 and the rules made under it.",
        },
      },
    });

    return "1 notice added to the terms page";
  },
};
