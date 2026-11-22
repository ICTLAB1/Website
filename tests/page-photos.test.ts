import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { heroSchema } from "@/lib/blocks/schemas";
import { PAGE_PHOTOS, photoForPath } from "@/lib/page-photos";
import { industrySeeds } from "../prisma/seed-data/industries";
import { services } from "../prisma/seed-data/services";
import { pageSeeds } from "../prisma/seed-data/pages";

describe("the photographs on the solution, industry and service pages", () => {
  it("every one is a file that exists, with a description and its real shape", async () => {
    const sharp = (await import("sharp")).default;
    for (const [path, photo] of Object.entries(PAGE_PHOTOS)) {
      const file = join(process.cwd(), "public", photo.src);
      expect(existsSync(file), `${path}: ${photo.src}`).toBe(true);
      expect(photo.alt.length, path).toBeGreaterThan(20);
      const meta = await sharp(file).metadata();
      expect([meta.width, meta.height], path).toEqual([photo.width, photo.height]);
    }
  });

  it("only names pages that exist", () => {
    const known = new Set([
      ...industrySeeds.map((i) => `/industries/${i.slug}`),
      ...services.map((s) => `/services/${s.slug}`),
      ...pageSeeds.map((p) => `/${p.slug}`),
      // Index and listing routes that are not CMS pages
      "/products",
      "/hardware",
      "/brands",
      "/blog",
      "/contact",
      "/support",
      "/industries",
      "/services",
      // CMS pages created by content migrations rather than the seed
      "/corporate-it-solutions",
      "/adobe-licensing",
      "/get-a-quote/microsoft",
      "/get-a-quote/adobe",
      "/get-a-quote/autodesk",
      "/software-licensing-company-delhi",
      "/software-licensing-company-gurugram",
      "/software-licensing-company-noida",
      "/solutions/modern-workplace",
      "/solutions/cloud-transformation",
      "/solutions/security-compliance",
      "/solutions/design-engineering",
      "/solutions/architecture-construction",
      "/solutions/manufacturing",
      "/solutions/education",
      "/solutions/financial-services",
      "/solutions/technology",
      "/",
      "/enterprise",
      "/microsoft-365",
      "/autodesk-licensing",
      "/enterprise-it-hardware",
      "/managed-it-services",
      "/gem-software-supplier",
    ]);
    for (const path of Object.keys(PAGE_PHOTOS)) expect(known.has(path), path).toBe(true);
  });

  it("does not describe who is in a picture, only what it shows", () => {
    for (const photo of Object.values(PAGE_PHOTOS)) {
      expect(photo.alt).not.toMatch(/TechZoid|our team|our staff|employee/i);
    }
  });

  it("has no file in the folder that no page uses, and a descriptive name for each", () => {
    const used = new Set(Object.values(PAGE_PHOTOS).map((p) => p.src.split("/").pop()));
    const onDisk = readdirSync(join(process.cwd(), "public/images/site"));
    expect(onDisk.filter((f) => !used.has(f))).toEqual([]);
    for (const file of onDisk) expect(file, file).toMatch(/^[a-z]+(-[a-z0-9]+)+\.webp$/);
  });

  it("finds a page's photo with or without a trailing slash, and not by accident", () => {
    expect(photoForPath("/industries/healthcare")).not.toBeNull();
    expect(photoForPath("/industries/healthcare/")).not.toBeNull();
    expect(photoForPath("/")).not.toBeNull();
    for (const bad of ["/privacy", "/terms", "/login", "constructor", "__proto__", "/toString"]) {
      expect(photoForPath(bad), bad).toBeNull();
    }
  });

  it("is not stored with the hero block: the route chooses it, so the editor never sees or drops it", () => {
    expect(Object.keys(heroSchema.shape)).not.toContain("image");
  });
});
