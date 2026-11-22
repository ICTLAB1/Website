import type { Metadata } from "next";
import { cmsMetadata } from "@/lib/cms-route";
import { BlockRenderer } from "@/components/blocks";
import { HiringStrip } from "@/components/careers/hiring-strip";
import {
  HomePage,
  type HomeCopy,
  type HomeSlots,
} from "@/components/home/home-page";
import { getPage } from "@/lib/queries/pages";
import { resolveBlocks } from "@/lib/blocks/resolve";
import { notFound } from "next/navigation";

/**
 * The home page.
 *
 * The opening, the photograph bands for solutions and industries, the GeM panel
 * and the certification figures are designed in `HomePage`. Everything else on
 * the page — the product grids, the procurement copy, the delivery lists, the
 * brand and resource sections and the closing call to action — is still the
 * CMS page's own blocks, rendered in their original order around those bands,
 * so the wording stays editable in the admin panel and none of it is hidden.
 * The same record supplies the title, description and keywords.
 */
export async function generateMetadata(): Promise<Metadata> {
  return cmsMetadata("", "/");
}

export default async function HomePageRoute() {
  const page = await getPage("");
  if (!page) notFound();

  const resolved = await resolveBlocks(page.blocks, {
    brandSlug: null,
    faqTopic: null,
  });
  const blocks = page.blocks;
  const at = (index: number, type: string) => {
    const block = blocks[index];
    return block && block.type === type ? block : null;
  };
  /** Renders the blocks at these positions, skipping any whose type is not the one expected. */
  const show = (...picks: Array<[number, string]>) => {
    const chosen = picks.flatMap(([index, type]) => {
      const block = at(index, type);
      return block ? [block] : [];
    });
    return chosen.length > 0 ? (
      <BlockRenderer blocks={chosen} resolved={resolved} />
    ) : null;
  };

  const hero = at(0, "HERO");
  const industries = at(14, "INDUSTRY_GRID");
  const gem = at(12, "SPLIT_PANEL");
  const certs = at(15, "COLLECTION_GRID");
  const heroData = hero?.data as
    | {
        eyebrow?: string;
        headline: string;
        subheadline?: string;
        primaryCta?: { href: string; label: string };
        secondaryCta?: { href: string; label: string };
        stats?: Array<{ label: string }>;
        showSearch?: boolean;
        searchTerms?: string[];
      }
    | undefined;
  const gemData = gem?.data as
    | {
        eyebrow?: string;
        heading: string;
        description?: string;
        tiles?: string[];
        bullets?: string[];
        bulletsIntro?: string;
      }
    | undefined;
  const industriesData = industries?.data as
    | { eyebrow?: string; heading?: string; description?: string }
    | undefined;
  const certsData = certs?.data as
    | { eyebrow?: string; heading?: string; description?: string }
    | undefined;

  const copy: HomeCopy = {
    hero: {
      eyebrow: heroData?.eyebrow ?? "",
      headline:
        heroData?.headline ??
        "Trusted IT Hardware & Software Solutions Partner",
      subheadline: heroData?.subheadline ?? "",
      primaryCta: heroData?.primaryCta ?? {
        href: "/enquiry",
        label: "Get Enterprise Quote",
      },
      secondaryCta: heroData?.secondaryCta,
      statLabels: (heroData?.stats ?? []).map((stat) => stat.label),
      showSearch: heroData?.showSearch ?? false,
      searchTerms: heroData?.searchTerms ?? [],
    },
    industries: {
      eyebrow: industriesData?.eyebrow,
      heading: industriesData?.heading ?? "Industries we serve",
      description: industriesData?.description,
    },
    gem: {
      eyebrow: gemData?.eyebrow,
      heading: gemData?.heading ?? "Registered GeM seller",
      description: gemData?.description,
      tiles: gemData?.tiles ?? [],
      bullets: gemData?.bullets ?? [],
      bulletsIntro: gemData?.bulletsIntro,
    },
    certifications: {
      eyebrow: certsData?.eyebrow,
      heading: certsData?.heading ?? "Certifications & registrations",
      description: certsData?.description,
    },
  };

  const slots: HomeSlots = {
    afterBrands: show([1, "LOGO_MARQUEE"], [2, "ICON_POINTS"]),
    afterSolutions: show(
      [3, "COLLECTION_GRID"],
      [4, "PRODUCT_GRID"],
      [5, "PRODUCT_GRID"],
    ),
    afterProcurement: show(
      [6, "SPLIT_PANEL"],
      [7, "LINK_LIST"],
      [8, "CARDS"],
      [9, "COLLECTION_GRID"],
      [10, "CARDS"],
      [11, "LINK_LIST"],
    ),
    afterGem: show([13, "CHIP_LIST"]),
    afterCertifications: show(
      [16, "CHIP_LIST"],
      [17, "LOGO_MARQUEE"],
      [18, "CARDS"],
      [19, "COLLECTION_GRID"],
      [20, "KEY_VALUE_LIST"],
      [21, "COLLECTION_GRID"],
      [22, "CTA_BANNER"],
    ),
  };

  return (
    <>
      <HomePage copy={copy} slots={slots} />
      {/* Only when HR has open jobs; renders nothing otherwise. */}
      <HiringStrip />
    </>
  );
}
