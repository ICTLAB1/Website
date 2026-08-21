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
    theme_color: "#0e1b38",
    categories: ["business", "productivity"],
  };
}
