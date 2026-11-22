import type { Metadata } from "next";
import { cmsMetadata } from "@/lib/cms-route";
import { BlockRenderer } from "@/components/blocks";
import { HiringStrip } from "@/components/careers/hiring-strip";
import { HomePage } from "@/components/home/home-page";
import { getPage } from "@/lib/queries/pages";
import { resolveBlocks } from "@/lib/blocks/resolve";

/**
 * The home page.
 *
 * The layout is its own component, because it is a designed page rather than a
 * stack of interchangeable blocks. Its title, description and keywords still
 * come from the CMS record stored under the empty slug, so the SEO fields stay
 * editable in the admin panel. The belt of client organisations is the one
 * CMS block the page still renders, so that list keeps being managed there.
 */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("", "/");
}

export default async function HomePageRoute() {
  const page = await getPage("");
  const belt = page?.blocks.filter(
    (block) => block.type === "LOGO_MARQUEE" && block.data.source === "clients",
  );
  const resolved = page && belt?.length ? await resolveBlocks(belt, { brandSlug: null, faqTopic: null }) : null;

  return (
    <>
      <HomePage
        clientBelt={page && belt?.length && resolved ? <BlockRenderer blocks={belt} resolved={resolved} /> : null}
      />
      {/* Only when HR has open jobs; renders nothing otherwise. */}
      <HiringStrip />
    </>
  );
}
