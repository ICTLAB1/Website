import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/lib/site-config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const config = await getSiteConfig();

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
