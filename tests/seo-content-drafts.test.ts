import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { BLOCK_SCHEMAS, isBlockType } from "@/lib/blocks/schemas";

/**
 * The two draft migrations, checked before a deploy runs them.
 *
 * `2026-11-seo-page-drafts` writes `PageSection` rows, and its `data` payloads
 * reach Prisma through `as never` — there is no way to type them against the
 * block schemas at the call site without reimplementing the discriminated
 * union the admin panel uses. So the compiler cannot catch a misspelt block
 * type or a missing required field, and nothing would until
 * `prisma/content-migrate.ts` ran it against a live database during a deploy.
 *
 * These parse the payloads with the same zod schemas the renderer uses, which
 * is the check the `as never` removed.
 *
 * The rest is about the one property that matters more than the content: every
 * row is a draft. A published row here would put three pages and seventeen
 * articles into the sitemap on the next deploy, one of them making statements
 * about public procurement rules, none of them read by a person.
 */

const ROOT = join(import.meta.dirname, "..", "prisma", "content-migrations");
const pagesSource = readFileSync(join(ROOT, "2026-11-seo-page-drafts.ts"), "utf8");
const articlesSource = readFileSync(join(ROOT, "2026-11-seo-article-drafts.ts"), "utf8");

/*
 * Read the module rather than parsing the source for the section payloads: the
 * blocks are object literals and the only honest way to validate them is to
 * evaluate them. The migrations export only the `ContentMigration`, whose
 * `apply` needs a Prisma client — so the drafts are reached by importing the
 * module and reading what `apply` would write, via a recording stub.
 */
type Recorded = {
  pages: { slug: string; status: string; publishedAt: unknown; title: string; description: string; keywords: string[] }[];
  sections: { type: string; data: unknown; displayOrder: number }[];
  posts: { slug: string; status: string; publishedAt: unknown; title: string; excerpt: string; body: string }[];
};

async function record(): Promise<Recorded> {
  const out: Recorded = { pages: [], sections: [], posts: [] };

  const stub = {
    page: {
      findUnique: async () => null,
      create: async ({ data }: { data: Recorded["pages"][number] }) => {
        out.pages.push(data);
        return { id: `stub-${out.pages.length}` };
      },
    },
    pageSection: {
      createMany: async ({ data }: { data: Recorded["sections"] }) => {
        out.sections.push(...data);
        return { count: data.length };
      },
    },
    blogPost: {
      findMany: async () => [],
      createMany: async ({ data }: { data: Recorded["posts"] }) => {
        out.posts.push(...data);
        return { count: data.length };
      },
    },
  };

  const { seoPageDrafts } = await import("../prisma/content-migrations/2026-11-seo-page-drafts");
  const { seoArticleDrafts } = await import("../prisma/content-migrations/2026-11-seo-article-drafts");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await seoPageDrafts.apply(stub as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await seoArticleDrafts.apply(stub as any);
  return out;
}

describe("the SEO draft migrations", () => {
  it("writes every page and article as a draft, published by nobody", async () => {
    const { pages, posts } = await record();

    expect(pages.length).toBeGreaterThan(0);
    expect(posts.length).toBeGreaterThan(0);

    for (const page of pages) {
      expect(page.status, `${page.slug} must be a draft`).toBe("DRAFT");
      expect(page.publishedAt, `${page.slug} must have no publication date`).toBeNull();
    }
    for (const post of posts) {
      expect(post.status, `${post.slug} must be a draft`).toBe("DRAFT");
      expect(post.publishedAt, `${post.slug} must have no publication date`).toBeNull();
    }
  });

  it("writes section payloads that the renderer's own schemas accept", async () => {
    const { sections } = await record();
    expect(sections.length).toBeGreaterThan(0);

    for (const section of sections) {
      expect(isBlockType(section.type), `${section.type} is not a block type`).toBe(true);
      if (!isBlockType(section.type)) continue;

      const result = BLOCK_SCHEMAS[section.type].safeParse(section.data);
      expect(
        result.success,
        `${section.type} payload rejected: ${
          result.success ? "" : JSON.stringify(result.error.issues.slice(0, 3))
        }`,
      ).toBe(true);
    }
  });

  it("gives every page the metadata a search engine reads", async () => {
    const { pages } = await record();
    for (const page of pages) {
      expect(page.title.length, `${page.slug} title`).toBeGreaterThan(10);
      // 60 characters is where Google starts truncating a title in practice.
      expect(page.title.length, `${page.slug} title is too long to show in full`).toBeLessThanOrEqual(70);
      expect(page.description.length, `${page.slug} description`).toBeGreaterThanOrEqual(70);
      expect(page.description.length, `${page.slug} description`).toBeLessThanOrEqual(260);
      expect(page.keywords.length, `${page.slug} keywords`).toBeGreaterThan(0);
    }
  });

  it("gives every article an excerpt and a body with real structure", async () => {
    const { posts } = await record();
    for (const post of posts) {
      expect(post.excerpt.length, `${post.slug} excerpt`).toBeGreaterThanOrEqual(70);
      // Thin content is the failure mode these are written against, so the
      // floor is deliberately well above what a stub would clear.
      const words = post.body.split(/\s+/).filter(Boolean).length;
      expect(words, `${post.slug} is too thin at ${words} words`).toBeGreaterThan(450);
      expect(post.body, `${post.slug} needs section headings`).toMatch(/^## /m);
      expect(post.body, `${post.slug} needs at least one internal link`).toMatch(/\]\(\//);
    }
  });

  it("states no price, in any page block or article body", async () => {
    /*
     * The convention `2026-10-quote-page-autodesk` states: a price lives in
     * the product row and nowhere else, because "a price typed into a
     * migration is correct the day it is written and wrong the first time a
     * publisher moves a list". An indexed article is worse than a migration
     * for this, because a stale figure in one is what a buyer quotes back.
     *
     * Matches a currency symbol or code followed by digits. Bare numbers are
     * not matched: "300 seats" and "ISO 9001" are not prices, and a rule that
     * flagged them would be turned off rather than obeyed.
     */
    const PRICE = /(?:₹|\bRs\.?\s|\bINR\s|\$|\bUSD\s)\s?[\d,]+/i;
    const { pages, sections, posts } = await record();

    for (const post of posts) {
      const found = PRICE.exec(post.body);
      expect(found?.[0], `${post.slug} states a price: ${found?.[0]}`).toBeUndefined();
    }
    for (const section of sections) {
      const found = PRICE.exec(JSON.stringify(section.data));
      expect(found?.[0], `a ${section.type} block states a price: ${found?.[0]}`).toBeUndefined();
    }
    for (const page of pages) {
      expect(PRICE.exec(page.description)?.[0], `${page.slug} description`).toBeUndefined();
    }
  });

  it("asserts no partner designation of its own", async () => {
    /*
     * Partner designations live in seed-data/partner-status.ts behind
     * lib/brand-partner, which withdraws a claim 400 days after somebody
     * confirmed it. A designation written into a page block or an article body
     * is outside that gate and would still be asserting itself after the
     * confirmation lapsed — which for the current records is roughly late
     * September 2027.
     *
     * "Partner" alone is not matched: naming a partner page or writing "ask
     * your partner" is not a claim. The pattern is the market's stock phrases,
     * which are the ones that would be a misrepresentation if stale.
     */
    const CLAIM =
      /\b(?:authoriz|authoris)ed\s+(?:reseller|partner|distributor)\b|\bgold\s+partner\b|\bplatinum\s+(?:partner|reseller)\b|\bcertified\s+reseller\b|\bsolutions\s+partner\b/i;
    const { sections, posts } = await record();

    for (const post of posts) {
      const found = CLAIM.exec(post.body);
      expect(found?.[0], `${post.slug} asserts "${found?.[0]}"`).toBeUndefined();
    }
    for (const section of sections) {
      const found = CLAIM.exec(JSON.stringify(section.data));
      expect(found?.[0], `a ${section.type} block asserts "${found?.[0]}"`).toBeUndefined();
    }
  });

  it("does not create a page that already has a URL on the live site", async () => {
    /*
     * The failure this guards is the one the migrations' own docblocks are
     * about: a new page landing on top of an existing one and splitting it.
     * These slugs were checked against the live sitemap on 7 November 2026 and
     * none of them resolved; the check is kept so that adding a slug to either
     * migration later has to clear it.
     */
    const TAKEN = [
      "microsoft",
      "microsoft-365",
      "microsoft-csp",
      "microsoft-licensing",
      "microsoft-office",
      "microsoft-office-ltsc",
      "windows-server",
      "sql-server",
      "adobe",
      "adobe-acrobat",
      "adobe-acrobat-pro",
      "adobe-creative-cloud",
      "autodesk",
      "autocad",
      "aec-collection",
      "revit",
      "zoho",
      "brands",
      "industries",
      "services",
      "resources",
      "enterprise",
      "hardware",
      "about",
      "contact",
      "software-licensing-company-delhi",
    ];
    const { pages } = await record();
    for (const page of pages) {
      expect(TAKEN, `/${page.slug} already exists`).not.toContain(page.slug);
    }
  });

  it("registers both migrations in the runner, or they never run", async () => {
    const index = readFileSync(join(ROOT, "index.ts"), "utf8");
    for (const name of ["seoArticleDrafts", "seoPageDrafts"]) {
      expect(index, `${name} is not imported`).toContain(`import { ${name} }`);
      expect(index, `${name} is not in the list`).toMatch(
        new RegExp(`^\\s*${name},\\s*$`, "m"),
      );
    }
  });

  it("keeps both migrations idempotent on a second run", async () => {
    // Each migration checks for an existing row before writing one. A stub
    // that reports everything as present must produce no writes at all.
    const writes: string[] = [];
    const stub = {
      page: {
        findUnique: async () => ({ id: "already-here" }),
        create: async () => {
          writes.push("page");
          return { id: "x" };
        },
      },
      pageSection: {
        createMany: async () => {
          writes.push("section");
          return { count: 0 };
        },
      },
      blogPost: {
        findMany: async ({ where }: { where: { slug: { in: string[] } } }) =>
          where.slug.in.map((slug) => ({ slug })),
        createMany: async () => {
          writes.push("post");
          return { count: 0 };
        },
      },
    };

    const { seoPageDrafts } = await import("../prisma/content-migrations/2026-11-seo-page-drafts");
    const { seoArticleDrafts } = await import("../prisma/content-migrations/2026-11-seo-article-drafts");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageSummary = await seoPageDrafts.apply(stub as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const articleSummary = await seoArticleDrafts.apply(stub as any);

    expect(writes).toEqual([]);
    expect(pageSummary).toMatch(/already exist/i);
    expect(articleSummary).toMatch(/already exist/i);
  });

  it("says in its own docblock why the briefed pages are absent", () => {
    // The brief asked for eight landing pages that would have duplicated
    // existing ones. The reasoning is the deliverable here as much as the
    // pages are, and a later reader needs it to not simply add them back.
    expect(pagesSource).toContain("microsoft-enterprise-licensing");
    expect(pagesSource).toMatch(/already exist/i);
    expect(articlesSource).toMatch(/keyword-gap join/i);
  });
});
