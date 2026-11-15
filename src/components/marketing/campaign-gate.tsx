import { cookies } from "next/headers";

import { getCampaignsForVisitor } from "@/lib/queries/campaigns";
import { CampaignDisplay } from "@/components/marketing/campaign-display";
import {
  DISMISS_COOKIE,
  DISMISS_SESSION_COOKIE,
  parseDismissals,
} from "@/lib/campaigns";

/**
 * Hands the browser whatever campaigns are live right now, and nothing when
 * there are none — in which case no campaign code reaches the page at all.
 *
 * The schedule is decided here, on the server, against the real clock. The
 * client only decides *where* a campaign appears and what to do when it is
 * closed; it is never trusted to know whether the campaign has ended.
 *
 * Dismissals are read here too, from a cookie, so a banner somebody has closed
 * is not rendered rather than rendered and then removed.
 */
export async function CampaignGate() {
  const jar = await cookies();
  const remembered = {
    ...parseDismissals(jar.get(DISMISS_SESSION_COOKIE)?.value),
    ...parseDismissals(jar.get(DISMISS_COOKIE)?.value),
  };

  const { campaigns, hidden } = await getCampaignsForVisitor(remembered);
  if (campaigns.length === 0) return null;

  return <CampaignDisplay campaigns={campaigns} initiallyHidden={hidden} />;
}
