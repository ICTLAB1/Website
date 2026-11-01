import { FestivalGreeting } from "@/components/marketing/festival-greeting";
import { campaignIsRunning } from "@/lib/marketing/festival-campaign";
import { getSiteConfig } from "@/lib/site-config";

/**
 * Decides, on the server, whether the Diwali greeting exists at all.
 *
 * ## Why the date is checked here and not in the browser
 *
 * Two reasons, and the second is the one that matters.
 *
 * A campaign ended by each visitor's own clock ends at a different moment for
 * every visitor, and never at all for one whose clock is wrong. Checking here
 * means one clock decides: the server's.
 *
 * And once it has passed, the component is not rendered rather than merely
 * hidden — no markup, no script, nothing for a crawler to read, nothing to
 * dismiss. The dates themselves live in `lib/marketing/festival-campaign`,
 * with the reasoning for the exact instant.
 */
export async function FestivalGreetingGate() {
  if (!(await campaignIsRunning())) return null;

  const site = await getSiteConfig();
  return <FestivalGreeting tradingName={site.tradingName} />;
}
