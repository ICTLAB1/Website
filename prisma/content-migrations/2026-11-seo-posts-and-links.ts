import type { ContentMigration } from "./types";
import { SEO_POSTS, SEO_REFRESHES } from "./seo-posts.generated";

/**
 * Six new articles, two upgraded ones, one correction, and the menu and footer
 * links to the new buying guides.
 *
 * ## The articles
 *
 * Written from the catalogue and from what this site already says, with prices
 * as `{{price:<slug>}}` tokens that the blog page resolves from the catalogue when
 * it renders — so an article cannot quote a figure the catalogue has since
 * changed. Each carries five or six FAQs, stored as ordinary `Faq` rows under the
 * topic `blog:<slug>`, which the blog page renders with FAQPage markup. A post
 * that exists is left exactly as it is.
 *
 * ## Two are upgrades, not new posts
 *
 * "Office 2024 vs Microsoft 365" and "Autodesk AEC Collection: what's included"
 * are searches this site already answers, at `/blog/microsoft-office-ltsc-2024-vs-microsoft-365`
 * and `/blog/autodesk-aec-collection-explained`. A second article for each would
 * be two of this site's URLs competing for one search. So the existing article is
 * retitled for the search, extended with new sections and given FAQs, at its
 * existing address. Each upgrade applies once, and only while the article does not
 * already contain the new material.
 *
 * ## The correction
 *
 * The AutoCAD price article's FAQ and body said AutoCAD LT had been "consolidated"
 * and had no separate price. The catalogue sells AutoCAD LT as its own annual
 * subscription, so both are corrected to say so. Each edit applies only while the
 * text is still the exact text it replaces.
 *
 * ## The links
 *
 * Each guide is linked from the Products menu and the Software footer column, once.
 */

const LT_FAQ_QUESTION = "What is the AutoCAD vs AutoCAD LT price?";
const LT_FAQ_OLD_START = "AutoCAD LT has been consolidated into the main AutoCAD product line";
const LT_FAQ_NEW =
  "AutoCAD LT is sold as its own annual subscription at {{price:autocad-lt}} per user excluding GST, against {{price:autocad}} for AutoCAD. LT covers 2D drafting and documentation; AutoCAD adds 3D modelling and the industry toolsets. If you hold an older LT entitlement, we confirm the current equivalent rather than assuming a like-for-like renewal. The AutoCAD vs AutoCAD LT article sets out the difference.";

const LT_BODY_OLD =
  "The subscription includes the industry toolsets, so there is no separate AutoCAD LT line to price against it.";
const LT_BODY_NEW =
  "The subscription includes the industry toolsets. AutoCAD LT is a separate, lower-priced annual subscription for 2D drafting; the [AutoCAD vs AutoCAD LT](/blog/autocad-vs-autocad-lt) article explains which to buy.";

const AUTOCAD_PAGE_OLD = "AutoCAD LT was consolidated into the main AutoCAD product line.";
const AUTOCAD_PAGE_NEW =
  "AutoCAD LT is sold separately, as its own annual subscription for 2D drafting; see [AutoCAD vs AutoCAD LT](/blog/autocad-vs-autocad-lt).";

const GUIDE_LINKS = [
  { label: "CAD software", href: "/cad-software" },
  { label: "BIM software", href: "/bim-software" },
  { label: "PDF software", href: "/pdf-software" },
  { label: "Video editing software", href: "/video-editing-software" },
  { label: "Price list", href: "/price-list" },
] as const;

export const seoPostsAndLinks: ContentMigration = {
  id: "2026-11-seo-posts-and-links",
  describe: "six new articles, two upgraded, the AutoCAD LT correction, and menu and footer links to the buying guides",

  async apply(prisma) {
    const notes: string[] = [];
    const now = new Date();

    // 1. New articles ----------------------------------------------------------
    for (const post of SEO_POSTS) {
      const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug }, select: { id: true } });
      if (existing) {
        notes.push(`/blog/${post.slug} exists`);
        continue;
      }
      await prisma.blogPost.create({
        data: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          category: post.category,
          tags: post.tags,
          readMinutes: post.readMinutes,
          status: "PUBLISHED",
          publishedAt: now,
        },
      });
      const topic = `blog:${post.slug}`;
      if ((await prisma.faq.count({ where: { topic } })) === 0) {
        await prisma.faq.createMany({
          data: post.faqs.map((faq, index) => ({ ...faq, topic, displayOrder: (index + 1) * 10 })),
        });
      }
      notes.push(`/blog/${post.slug} published`);
    }

    // 2. Upgrades to two existing articles ------------------------------------
    for (const refresh of SEO_REFRESHES) {
      const post = await prisma.blogPost.findUnique({ where: { slug: refresh.slug }, select: { id: true, body: true } });
      if (!post) {
        notes.push(`/blog/${refresh.slug} not found`);
        continue;
      }
      const marker = refresh.appendBody.trim().slice(0, 80);
      if (!post.body.includes(marker)) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            title: refresh.newTitle,
            excerpt: refresh.newExcerpt,
            body: `${post.body.trimEnd()}\n\n${refresh.appendBody.trim()}`,
            updatedAt: now,
          },
        });
        notes.push(`/blog/${refresh.slug} upgraded`);
      }
      const topic = `blog:${refresh.slug}`;
      if ((await prisma.faq.count({ where: { topic } })) === 0) {
        await prisma.faq.createMany({
          data: refresh.faqs.map((faq, index) => ({ ...faq, topic, displayOrder: (index + 1) * 10 })),
        });
        notes.push(`/blog/${refresh.slug}: ${refresh.faqs.length} FAQs added`);
      }
    }

    // 3. The AutoCAD LT correction --------------------------------------------
    const faq = await prisma.faq.findFirst({
      where: { topic: "blog:autocad-subscription-price-in-india", question: LT_FAQ_QUESTION },
      select: { id: true, answer: true },
    });
    if (faq?.answer.startsWith(LT_FAQ_OLD_START)) {
      await prisma.faq.update({ where: { id: faq.id }, data: { answer: LT_FAQ_NEW } });
      notes.push("AutoCAD LT FAQ corrected");
    }
    const autocadPost = await prisma.blogPost.findUnique({
      where: { slug: "autocad-subscription-price-in-india" },
      select: { id: true, body: true },
    });
    if (autocadPost?.body.includes(LT_BODY_OLD)) {
      await prisma.blogPost.update({
        where: { id: autocadPost.id },
        data: { body: autocadPost.body.replace(LT_BODY_OLD, LT_BODY_NEW), updatedAt: now },
      });
      notes.push("AutoCAD article: LT sentence corrected");
    }
    const sections = await prisma.pageSection.findMany({
      where: { page: { slug: "autocad" }, type: "RICH_TEXT" },
      select: { id: true, data: true },
    });
    for (const section of sections) {
      const data = section.data as { markdown?: string };
      if (data.markdown?.includes(AUTOCAD_PAGE_OLD)) {
        await prisma.pageSection.update({
          where: { id: section.id },
          data: { data: { ...(section.data as object), markdown: data.markdown.replace(AUTOCAD_PAGE_OLD, AUTOCAD_PAGE_NEW) } },
        });
        notes.push("/autocad: LT note corrected");
      }
    }
    const autocad = await prisma.product.findUnique({ where: { slug: "autocad" }, select: { id: true, licensingNotes: true } });
    if (autocad?.licensingNotes?.includes(AUTOCAD_PAGE_OLD)) {
      await prisma.product.update({
        where: { id: autocad.id },
        data: { licensingNotes: autocad.licensingNotes.replace(AUTOCAD_PAGE_OLD, AUTOCAD_PAGE_NEW) },
      });
      notes.push("AutoCAD product: LT note corrected");
    }

    // 4. Menu and footer links ---------------------------------------------------
    const addLink = async (menu: "HEADER" | "FOOTER", column: string, link: { label: string; href: string }) => {
      if (await prisma.navigationItem.findFirst({ where: { menu, href: link.href }, select: { id: true } })) return false;
      const parent = await prisma.navigationItem.findFirst({
        where: { menu, parentId: null, label: column },
        select: { id: true },
      });
      if (!parent) return false;
      let order: number;
      const all = menu === "FOOTER"
        ? await prisma.navigationItem.findFirst({ where: { parentId: parent.id, href: "/products" }, select: { id: true, displayOrder: true } })
        : null;
      if (all) {
        order = all.displayOrder;
        await prisma.navigationItem.update({ where: { id: all.id }, data: { displayOrder: { increment: 1 } } });
      } else {
        const last = await prisma.navigationItem.findFirst({
          where: { parentId: parent.id },
          orderBy: { displayOrder: "desc" },
          select: { displayOrder: true },
        });
        order = (last?.displayOrder ?? 0) + 1;
      }
      await prisma.navigationItem.create({
        data: { menu, parentId: parent.id, label: link.label, href: link.href, displayOrder: order, visible: true },
      });
      return true;
    };
    let linked = 0;
    for (const link of GUIDE_LINKS) {
      if (await addLink("HEADER", "Products", link)) linked += 1;
      if (await addLink("FOOTER", "Software", link)) linked += 1;
    }
    if (linked > 0) notes.push(`${linked} menu and footer links added`);

    return notes.length > 0 ? notes.join("; ") : "nothing to do";
  },
};
