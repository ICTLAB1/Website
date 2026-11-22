import { describe, expect, it } from "vitest";

import { BLOCK_SCHEMAS, isBlockType } from "@/lib/blocks/schemas";
import { LEAD_PAGES, NOT_SURE } from "@/lib/lead-pages";
import { services } from "../prisma/seed-data/services";
import { managedItServicesPage } from "../prisma/content-migrations/2026-11-managed-it-services-page";

/**
 * The managed IT services page, checked before a deploy runs it.
 *
 * The migration reaches Prisma through `as never`, so the only check that a
 * block is well formed is to parse it with the schemas the renderer uses. The
 * rest pins what the page must not say: it is built from what this site already
 * states, so anything this business has not said it does stays off it.
 */

type SectionRow = { type: string; displayOrder: number; data: unknown };

async function run(existing = false) {
  const pages: Array<Record<string, unknown>> = [];
  const sections: SectionRow[] = [];
  const prisma = {
    page: {
      findUnique: async () => (existing ? { id: "x" } : null),
      create: async ({ data }: { data: Record<string, unknown> }) => {
        pages.push(data);
        return { id: "p1" };
      },
    },
    pageSection: { create: async ({ data }: { data: SectionRow }) => void sections.push(data) },
  };
  const message = await managedItServicesPage.apply(prisma as never);
  return { pages, sections, message };
}

describe("the managed IT services page", () => {
  it("is created once, published, and left alone when it exists", async () => {
    const first = await run();
    expect(first.pages).toHaveLength(1);
    expect(first.pages[0]).toMatchObject({ slug: "managed-it-services", status: "PUBLISHED" });
    const again = await run(true);
    expect(again.pages).toHaveLength(0);
    expect(again.message).toMatch(/already exists/);
  });

  it("is made only of blocks the renderer accepts", async () => {
    const { sections } = await run();
    expect(sections.length).toBeGreaterThan(8);
    for (const section of sections) {
      expect(isBlockType(section.type), section.type).toBe(true);
      const result = BLOCK_SCHEMAS[section.type as keyof typeof BLOCK_SCHEMAS].safeParse(section.data);
      expect(result.success, `${section.type}: ${JSON.stringify(result.success ? "" : result.error.issues)}`).toBe(true);
    }
  });

  it("opens with a hero and ends with a banner, both landing on the form", async () => {
    const { sections } = await run();
    const ordered = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
    expect(ordered[0]!.type).toBe("HERO");
    expect((ordered[0]!.data as { primaryCta: { href: string } }).primaryCta.href).toBe("#quote");
    expect(ordered.at(-1)!.type).toBe("CTA_BANNER");
    expect((ordered.at(-1)!.data as { primaryCta: { href: string } }).primaryCta.href).toBe("#quote");
  });

  it("has a title and description that fit a search result, without the brand suffix", async () => {
    const { pages } = await run();
    const page = pages[0] as { title: string; description: string };
    expect(page.title.length + 11).toBeLessThanOrEqual(70);
    expect(page.title).not.toMatch(/\| TechZoid/);
    expect(page.description.length).toBeLessThanOrEqual(160);
    expect(page.description.length).toBeGreaterThanOrEqual(80);
  });

  it("claims nothing this site has not said: no 24x7, SOC, virtual CIO, figures or awards", async () => {
    const { sections, pages } = await run();
    const text = JSON.stringify([sections, pages]);
    expect(text).not.toMatch(/24\s?[x×/]\s?7|24 hours|\bSOC\b|\bNOC\b|\bSIEM\b|MSSP|virtual CIO|vCIO/i);
    expect(text).not.toMatch(/₹|\bINR\b|\bcrore\b|\blakh\b|\$\s?\d|\d+\s?%|guarantee|award|\bvendor\b/i);
    expect(text).not.toMatch(/Embee|Accenture/i);
    expect(text).not.toMatch(/Techzoid|techZoid|TECHZOID/);
  });

  it("links only to service pages that exist", async () => {
    const { sections } = await run();
    const known = new Set(services.map((service) => `/services/${service.slug}`));
    const links = sections
      .filter((section) => section.type === "LINK_LIST")
      .flatMap((section) => (section.data as { items: Array<{ href: string }> }).items);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(known.has(link.href), link.href).toBe(true);
  });

  it("has a form config whose options end with a way out and whose count is users or devices", () => {
    const page = LEAD_PAGES["managed-it-services"]!;
    expect(page.products.at(-1)).toBe(NOT_SURE);
    expect(page.quantityLabel).toMatch(/users or devices/i);
    expect(page.source).toBe("landing_managed_it_services");
  });
});
