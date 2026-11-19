import { describe, expect, it } from "vitest";

import { BLOCK_SCHEMAS, isBlockType } from "@/lib/blocks/schemas";
import { LANDING_PAGES, leadLandingPages } from "../prisma/content-migrations/2026-11-lead-landing-pages";
import { linkTheLeadPages } from "../prisma/content-migrations/2026-11-link-the-lead-pages";
import { LEAD_PAGES } from "@/lib/lead-pages";

/**
 * The four pages and their footer links, checked before a deploy runs them.
 *
 * The migration reaches Prisma through `as never`, so the compiler cannot tell a
 * misspelt block type or a missing field from a good one; the only check is to
 * parse each payload with the same zod schemas the renderer uses. And the
 * footer migration's ordering is the part that is easy to get subtly wrong, so
 * it runs against an in-memory table.
 */

type PageRow = { slug: string; status: string; publishedAt: unknown; title: string; description: string; keywords: string[]; breadcrumb: unknown };
type SectionRow = { pageId: string; type: string; displayOrder: number; visible: boolean; data: unknown };

function recordingPrisma(existingSlugs: string[] = []) {
  const pages: PageRow[] = [];
  const sections: SectionRow[] = [];
  const prisma = {
    page: {
      findUnique: async ({ where }: { where: { slug: string } }) => (existingSlugs.includes(where.slug) ? { id: "existing" } : null),
      create: async ({ data }: { data: PageRow }) => {
        pages.push(data);
        return { id: `page-${pages.length}` };
      },
    },
    pageSection: {
      create: async ({ data }: { data: SectionRow }) => {
        sections.push(data);
        return {};
      },
    },
  };
  return { prisma: prisma as never, pages, sections };
}

describe("the four landing pages", () => {
  it("are the four that do not exist yet, at exactly the addresses asked for", () => {
    expect(LANDING_PAGES.map((page) => page.slug)).toEqual([
      "adobe-licensing",
      "autodesk-licensing",
      "enterprise-it-hardware",
      "corporate-it-solutions",
    ]);
  });

  it("are created published, with every section valid against the real block schemas", async () => {
    const { prisma, pages, sections } = recordingPrisma();
    await leadLandingPages.apply(prisma);

    expect(pages).toHaveLength(4);
    for (const page of pages) {
      expect(page.status).toBe("PUBLISHED");
      expect(page.publishedAt).toBeInstanceOf(Date);
    }
    expect(sections.length).toBeGreaterThan(20);
    for (const section of sections) {
      expect(isBlockType(section.type), `${section.type} is not a block type`).toBe(true);
      const result = BLOCK_SCHEMAS[section.type as keyof typeof BLOCK_SCHEMAS].safeParse(section.data);
      expect(result.success, `${section.type}: ${JSON.stringify(result.success ? "" : result.error.issues)}`).toBe(true);
    }
  });

  it("each opens with a hero whose buttons land on the form, and ends with a banner that does too", async () => {
    const { prisma, pages, sections } = recordingPrisma();
    await leadLandingPages.apply(prisma);
    for (const [index] of pages.entries()) {
      const own = sections.filter((section) => section.pageId === `page-${index + 1}`).sort((a, b) => a.displayOrder - b.displayOrder);
      expect(own[0]!.type).toBe("HERO");
      expect((own[0]!.data as { primaryCta: { href: string } }).primaryCta.href).toBe("#quote");
      expect(own.at(-1)!.type).toBe("CTA_BANNER");
      expect((own.at(-1)!.data as { primaryCta: { href: string } }).primaryCta.href).toBe("#quote");
    }
  });

  it("have titles and descriptions that fit a search result, and the name spelt TechZoid", () => {
    for (const page of LANDING_PAGES) {
      // The layout appends " | TechZoid" (11 characters).
      expect(page.title.length + 11, page.slug).toBeLessThanOrEqual(70);
      expect(page.description.length, page.slug).toBeLessThanOrEqual(160);
      expect(page.description.length, page.slug).toBeGreaterThanOrEqual(80);
      expect(page.title, page.slug).not.toMatch(/\| TechZoid/);
    }
    const everything = JSON.stringify(LANDING_PAGES);
    expect(everything).not.toMatch(/Techzoid|techZoid|TECHZOID/);
  });

  it("have titles different from each other and from the pages they sit beside", () => {
    const titles = LANDING_PAGES.map((page) => page.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const existing of ["Adobe Reseller in India: Creative Cloud & Acrobat", "Autodesk Reseller in India: AutoCAD, Revit & More", "Business Laptops & Desktops — Commercial Computers", "Technology Solutions by Outcome & Industry"]) {
      expect(titles).not.toContain(existing);
    }
  });

  it("make no price, availability, certification-of-a-publisher or 'authorised' claim", () => {
    const text = JSON.stringify(LANDING_PAGES);
    expect(text).not.toMatch(/₹|\bINR\b|\bRs\.?\s?\d|lakh|\bcheapest\b|\bbest price\b|guarantee|in stock|authori[sz]ed|\bvendor\b|\bpartner authori/i);
  });

  it("only link to pages that exist", () => {
    const KNOWN = new Set([
      "/adobe", "/autodesk", "/hardware", "/solutions", "/services", "/enterprise", "/about", "/contact", "/requirement",
      "/microsoft-365", "/get-a-quote/adobe", "/get-a-quote/autodesk", "/solutions/design-engineering",
      "/hardware?family=servers", "/hardware?family=laptops",
    ]);
    for (const page of LANDING_PAGES) {
      for (const link of [...page.related, page.secondary]) {
        expect(KNOWN.has(link.href), `${page.slug} links to ${link.href}`).toBe(true);
      }
    }
  });

  it("have a lead-form config to match, so the form never renders without its options", () => {
    for (const page of LANDING_PAGES) expect(LEAD_PAGES[page.slug], page.slug).toBeDefined();
  });

  it("leaves a page that already exists exactly as it is", async () => {
    const { prisma, pages } = recordingPrisma(["adobe-licensing", "autodesk-licensing"]);
    const result = await leadLandingPages.apply(prisma);
    expect(pages.map((page) => page.slug)).toEqual(["enterprise-it-hardware", "corporate-it-solutions"]);
    expect(result).toContain("/adobe-licensing already exists");
  });

  it("creates nothing the second time", async () => {
    const { prisma, pages } = recordingPrisma(LANDING_PAGES.map((page) => page.slug));
    await leadLandingPages.apply(prisma);
    expect(pages).toHaveLength(0);
  });
});

/* ---------------------------------------------------------------- footer -- */

type NavRow = { id: string; menu: string; parentId: string | null; label: string; href: string | null; displayOrder: number; visible?: boolean };

function navPrisma(rows: NavRow[]) {
  let next = 1000;
  const matches = (row: NavRow, where: Record<string, unknown>) =>
    Object.entries(where).every(([key, value]) => {
      const actual = (row as Record<string, unknown>)[key];
      if (value && typeof value === "object" && "in" in (value as object)) return ((value as { in: unknown[] }).in).includes(actual);
      return actual === value;
    });
  const navigationItem = {
    findFirst: async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: { displayOrder: "asc" | "desc" } }) => {
      let found = rows.filter((row) => matches(row, where));
      if (orderBy) found = [...found].sort((a, b) => (orderBy.displayOrder === "desc" ? b.displayOrder - a.displayOrder : a.displayOrder - b.displayOrder));
      return found[0] ?? null;
    },
    update: async ({ where, data }: { where: { id: string }; data: { displayOrder: { increment: number } } }) => {
      const row = rows.find((r) => r.id === where.id)!;
      row.displayOrder += data.displayOrder.increment;
      return row;
    },
    create: async ({ data }: { data: Omit<NavRow, "id"> }) => {
      rows.push({ ...data, id: `new-${next++}` });
      return {};
    },
  };
  return { prisma: { navigationItem } as never, rows };
}

const footer = (): NavRow[] => [
  { id: "sw", menu: "FOOTER", parentId: null, label: "Software", href: null, displayOrder: 10 },
  { id: "sw1", menu: "FOOTER", parentId: "sw", label: "Microsoft 365", href: "/microsoft-365", displayOrder: 10 },
  { id: "sw2", menu: "FOOTER", parentId: "sw", label: "AutoCAD", href: "/autocad", displayOrder: 20 },
  { id: "swall", menu: "FOOTER", parentId: "sw", label: "All products", href: "/products", displayOrder: 30 },
  { id: "sv", menu: "FOOTER", parentId: null, label: "Services", href: null, displayOrder: 20 },
  { id: "sv1", menu: "FOOTER", parentId: "sv", label: "Cybersecurity", href: "/services/cybersecurity", displayOrder: 10 },
  { id: "svall", menu: "FOOTER", parentId: "sv", label: "All services", href: "/services", displayOrder: 20 },
];

const column = (rows: NavRow[], parentId: string) =>
  rows.filter((row) => row.parentId === parentId).sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label)).map((row) => row.label);

describe("the footer links", () => {
  it("add all four, each in its own column, and keep 'All …' last", async () => {
    const { prisma, rows } = navPrisma(footer());
    await linkTheLeadPages.apply(prisma);
    expect(column(rows, "sw")).toEqual(["Microsoft 365", "AutoCAD", "Adobe licensing", "Autodesk licensing", "All products"]);
    expect(column(rows, "sv")).toEqual(["Cybersecurity", "Enterprise IT hardware", "Corporate IT solutions", "All services"]);
  });

  it("point at the four pages", async () => {
    const { prisma, rows } = navPrisma(footer());
    await linkTheLeadPages.apply(prisma);
    const hrefs = rows.filter((row) => row.id.startsWith("new-")).map((row) => row.href).sort();
    expect(hrefs).toEqual(["/adobe-licensing", "/autodesk-licensing", "/corporate-it-solutions", "/enterprise-it-hardware"]);
  });

  it("add nothing the second time", async () => {
    const { prisma, rows } = navPrisma(footer());
    await linkTheLeadPages.apply(prisma);
    const count = rows.length;
    const result = await linkTheLeadPages.apply(prisma);
    expect(rows).toHaveLength(count);
    expect(result).toContain("already linked");
  });

  it("do not invent a column that has been removed", async () => {
    const { prisma, rows } = navPrisma(footer().filter((row) => row.id !== "sv" && row.parentId !== "sv"));
    const result = await linkTheLeadPages.apply(prisma);
    expect(rows.find((row) => row.href === "/enterprise-it-hardware")).toBeUndefined();
    expect(result).toContain('no "Services" column');
    expect(rows.find((row) => row.href === "/adobe-licensing")).toBeDefined();
  });

  it("still work when a column has no 'All …' entry", async () => {
    const rows = footer().filter((row) => row.id !== "swall");
    const { prisma } = navPrisma(rows);
    await linkTheLeadPages.apply(prisma);
    expect(column(rows, "sw")).toEqual(["Microsoft 365", "AutoCAD", "Adobe licensing", "Autodesk licensing"]);
  });
});
