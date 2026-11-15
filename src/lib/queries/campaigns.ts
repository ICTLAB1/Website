import "server-only";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import {
  hiddenCampaignIds,
  liveCampaigns,
  type CampaignRow,
  type PublicCampaign,
} from "@/lib/campaigns";

/**
 * Campaigns that could be live, cached until an admin save invalidates the
 * `banners` tag.
 *
 * Only the rows are cached, never the answer. Whether a campaign is live
 * depends on the clock, and a cached "live" would keep a campaign on past its
 * end time — the exact failure the schedule exists to prevent. So the cache
 * holds the switched-on rows with their windows, and `liveCampaigns` applies
 * `now` on every request. The cap keeps a runaway number of rows from ever
 * being sent to the browser.
 */
const loadCandidates = cached(
  async (): Promise<CampaignRow[]> => {
    try {
      return (await prisma.banner.findMany({
        where: { active: true, format: { not: null } },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        take: 50,
      })) as CampaignRow[];
    } catch (error) {
      // A campaign is decoration. A database that cannot be read, or a build
      // with no database at all, must not take a page down.
      console.warn(
        "[campaigns] could not read campaigns; showing none",
        error instanceof Error ? error.message.split("\n")[0] : error,
      );
      return [];
    }
  },
  ["campaigns-candidates"],
  [tags.banners],
  300,
);

export async function getLiveCampaigns(now: Date = new Date()): Promise<PublicCampaign[]> {
  return liveCampaigns(await loadCandidates(), now);
}

/** The live campaigns, and which of them this visitor has already closed. */
export async function getCampaignsForVisitor(
  remembered: Record<string, number>,
): Promise<{ campaigns: PublicCampaign[]; hidden: string[] }> {
  const now = new Date();
  const campaigns = liveCampaigns(await loadCandidates(), now);
  return { campaigns, hidden: hiddenCampaignIds(campaigns, remembered, now.getTime()) };
}
