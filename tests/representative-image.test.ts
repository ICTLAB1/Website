import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  REPRESENTATIVE_IMAGES,
  type IllustrationMap,
  isRepresentativeImage,
  representativeImageFor,
  resolveProductPhoto,
} from "@/lib/representative-image";

const PUBLIC_DIR = join(process.cwd(), "public");

/**
 * A fixture map, so the logic is tested rather than the artwork.
 *
 * Asserting against `REPRESENTATIVE_IMAGES` directly would make these tests
 * pass or fail on whether somebody dropped a file in `public/products/` — which
 * is a different question from whether the resolver is correct, and the wrong
 * one to answer in a unit test. The real map is checked separately, below, for
 * the things that must be true of it whatever it contains.
 */
const FIXTURE: IllustrationMap = {
  DESKTOP_TOWER: "/products/representative-desktop-tower.jpg",
  DESKTOP_WORKSTATION: "/products/representative-desktop-tower.jpg",
};

describe("the configured illustrations", () => {
  it("every mapped illustration exists on disk", () => {
    // The reason this is worth its lines: a typo in the map ships a broken
    // image to a commercial catalogue, and nothing else would catch it — the
    // path passes the safety check, the component renders, and the browser
    // shows a torn frame.
    for (const [formFactor, path] of Object.entries(REPRESENTATIVE_IMAGES)) {
      expect(path, `${formFactor} has no path`).toBeTruthy();
      expect(
        existsSync(join(PUBLIC_DIR, path!.replace(/^\//, ""))),
        `${formFactor} maps to ${path}, which does not exist under public/`,
      ).toBe(true);
    }
  });

  it("names illustrations so they are recognisable as such on disk", () => {
    // `scripts/verify/hardware.mjs` identifies an illustration in the rendered
    // DOM by this prefix. A file that does not follow it would be shown without
    // the gate ever noticing whether it carried its badge.
    for (const path of Object.values(REPRESENTATIVE_IMAGES)) {
      expect(path!.startsWith("/products/representative-")).toBe(true);
    }
  });

  it("has no illustration for servers", () => {
    // A rack server does not look like a desktop tower, and this is the line
    // somebody crosses when they notice servers have no picture.
    expect(representativeImageFor("RACK_SERVER")).toBeNull();
    expect(representativeImageFor("TOWER_SERVER")).toBeNull();
  });
});

describe("resolving a product's picture", () => {
  it("prefers a real photograph over the illustration", () => {
    const resolved = resolveProductPhoto(
      { imageUrl: "/products/hp-z2-g9.jpg", formFactor: "DESKTOP_TOWER" },
      FIXTURE,
    );
    expect(resolved.src).toBe("/products/hp-z2-g9.jpg");
    expect(resolved.representative).toBe(false);
  });

  it("falls back to the illustration for the product's own form factor", () => {
    const resolved = resolveProductPhoto({ imageUrl: null, formFactor: "DESKTOP_TOWER" }, FIXTURE);
    expect(resolved.src).toBe(FIXTURE.DESKTOP_TOWER);
    expect(resolved.representative).toBe(true);
  });

  it("never lends one form factor's illustration to another", () => {
    // The failure this guards against is a laptop listing showing a tower. No
    // disclaimer repairs that, so the resolver must simply not do it.
    const resolved = resolveProductPhoto({ imageUrl: null, formFactor: "LAPTOP" }, FIXTURE);
    expect(resolved.src).toBeNull();
  });

  it("leaves an unmapped form factor with no picture at all", () => {
    const resolved = resolveProductPhoto({ imageUrl: null, formFactor: "RACK_SERVER" }, FIXTURE);
    expect(resolved.src).toBeNull();
    expect(resolved.representative).toBe(false);
  });

  it("leaves software with no picture at all", () => {
    const resolved = resolveProductPhoto({ imageUrl: null, formFactor: null }, FIXTURE);
    expect(resolved.src).toBeNull();
    expect(resolved.representative).toBe(false);
  });

  it("gives every product a labelled gap when no illustration is configured", () => {
    // The state the repository is in until artwork is supplied, and it must be
    // a safe one rather than a broken one.
    for (const formFactor of ["LAPTOP", "DESKTOP_TOWER", "ALL_IN_ONE"] as const) {
      const resolved = resolveProductPhoto({ imageUrl: null, formFactor }, {});
      expect(resolved.src).toBeNull();
      expect(resolved.representative).toBe(false);
    }
  });

  it("recognises an illustration by its path", () => {
    expect(isRepresentativeImage(FIXTURE.DESKTOP_TOWER, FIXTURE)).toBe(true);
    expect(isRepresentativeImage("/products/hp-z2-g9.jpg", FIXTURE)).toBe(false);
    expect(isRepresentativeImage(null, FIXTURE)).toBe(false);
  });

  it("marks every product that resolves to an illustration as representative", () => {
    // The invariant the whole design rests on: source and flag are decided
    // together, so there is no path to an illustration without the caveat.
    for (const formFactor of Object.keys(FIXTURE)) {
      const resolved = resolveProductPhoto(
        { imageUrl: null, formFactor: formFactor as keyof IllustrationMap },
        FIXTURE,
      );
      expect(isRepresentativeImage(resolved.src, FIXTURE)).toBe(resolved.representative);
    }
  });
});
