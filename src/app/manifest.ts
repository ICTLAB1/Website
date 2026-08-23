import type { MetadataRoute } from "next";
import { getSiteIdentity } from "@/lib/site-config";

/**
 * Synchronous, and reading only the identity.
 *
 * This route is prerendered at build time, and a Docker build has no database —
 * not even an unreachable one, since `.dockerignore` keeps `.env` out of the
 * image. Reaching for `getSiteConfig` here would make the manifest depend on a
 * query it cannot make, for a value that was never in the database anyway: it
 * needs the company name, which is identity and lives in the environment.
 */
export default function manifest(): MetadataRoute.Manifest {
  const config = getSiteIdentity();

  return {
    name: `${config.tradingName} — Enterprise Technology`,
    short_name: config.tradingName,
    description:
      "Enterprise software licensing, cloud and IT solutions from one procurement partner.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    /*
     * Charcoal, the brand's own ground colour, and the same value the header
     * and footer are painted in. It was `#0e1b38` — a navy that appears
     * nowhere else in this design and predates the brand being settled. On
     * Android this is the colour drawn behind the status bar of an installed
     * app, so a wrong value here is a visible seam nobody sees in a browser.
     */
    theme_color: "#1C1F1E",
    /*
     * The aperture alone rather than the full lockup: an installed icon is
     * shown at 48–192 px and square, and a 3:1 wordmark scaled into that is a
     * grey smudge. `maskable` lets Android crop it to whatever shape the
     * launcher uses without clipping the mark, which is why the source is
     * padded.
     */
    icons: [
      { src: "/brand-assets/techzoid-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand-assets/techzoid-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["business", "productivity"],
  };
}
