import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readImage, type EmbeddedImage } from "@/lib/pdf/image";

/**
 * Artwork from `public/`, decoded once and kept.
 *
 * Documents need the same handful of images on every render — a letterhead, a
 * partner badge, a brand logo — and decoding a PNG is the most expensive thing
 * that happens while building one. They do not change while the process runs,
 * so they are read on first use and held.
 *
 * Failure is not an error. A missing or unreadable file, or one in a format
 * this writer declines (an SVG, most obviously — PDF cannot hold one), yields
 * null and the caller leaves that part of the document out. A quotation
 * somebody is waiting for should not fail because a logo moved.
 */

const cache = new Map<string, EmbeddedImage | null>();

/**
 * Loads a path as it appears in the database — "/brands/microsoft.png".
 *
 * The path is not trusted. It has already been through the same
 * `safeLocalImage` check every `src` on the site goes through, and this adds
 * the one thing that matters when the value reaches the filesystem rather than
 * a browser: no traversal, no absolute paths, and only the directories that
 * hold artwork.
 */
const ALLOWED = ["/brands/", "/badges/", "/marks/", "/uploads/"];

export function loadPublicImage(publicPath: string | null | undefined): EmbeddedImage | null {
  if (!publicPath) return null;
  if (publicPath.includes("..") || publicPath.includes("\0")) return null;
  if (!ALLOWED.some((prefix) => publicPath.startsWith(prefix))) return null;

  const existing = cache.get(publicPath);
  if (existing !== undefined) return existing;

  /*
   * An SVG is served to the browser and rasterised for print.
   *
   * Most brand artwork on this site is SVG, which is right for a web page and
   * impossible in a PDF. `scripts/rasterise-brand-logos.mjs` writes a PNG of
   * each one into `brands/print/`, so a quotation shows the publisher's own
   * mark rather than its name in text. Falling back rather than requiring it
   * means a newly added SVG degrades to a name until somebody runs the script.
   */
  const candidates = publicPath.toLowerCase().endsWith(".svg")
    ? [publicPath.replace(/^\/brands\//, "/brands/print/").replace(/\.svg$/i, ".png"), publicPath]
    : [publicPath];

  let image: EmbeddedImage | null = null;
  for (const candidate of candidates) {
    try {
      image = readImage(readFileSync(join(process.cwd(), "public", candidate.slice(1))));
      if (image) break;
    } catch {
      image = null;
    }
  }

  cache.set(publicPath, image);
  return image;
}

/**
 * The company's own logo, from a fixed set of names under `public/`.
 *
 * Not configurable, because there is exactly one of these per deployment and a
 * setting for it would be one nobody ever changes twice. Drop the file in and
 * every document printed after the next restart carries it.
 *
 * PNG first: it is what a brand pack contains and it keeps its transparency, so
 * a logo with rounded edges does not print as a white box on a tinted panel.
 * SVG is deliberately absent — PDF cannot hold one, and rasterising it would
 * need a renderer; the drawn mark in `lib/pdf/letterhead` covers that case.
 */
const LOGO_FILES = ["/uploads/logo.png", "/uploads/logo.jpg"];

export function letterheadImage(): EmbeddedImage | null {
  const direct = loadRootImage();
  if (direct) return direct;

  for (const path of LOGO_FILES) {
    const image = loadPublicImage(path);
    if (image) return image;
  }

  return null;
}

/** `public/logo.png`, which is where a brand pack's file naturally lands. */
function loadRootImage(): EmbeddedImage | null {
  const key = "logo:root";
  const existing = cache.get(key);
  if (existing !== undefined) return existing;

  let image: EmbeddedImage | null = null;
  for (const name of ["logo.png", "logo.jpg", "logo.jpeg"]) {
    try {
      image = readImage(readFileSync(join(process.cwd(), "public", name)));
      if (image) break;
    } catch {
      image = null;
    }
  }

  cache.set(key, image);
  return image;
}

/** For the tests, and for a deployment that replaces a file while running. */
export function forgetImages(): void {
  cache.clear();
}
