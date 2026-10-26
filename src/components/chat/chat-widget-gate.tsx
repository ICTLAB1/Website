import { getAssistantConfig } from "@/lib/assistant/config";
import { getSiteConfig } from "@/lib/site-config";
import { ChatWidget } from "@/components/chat/chat-widget";

/**
 * Renders the chat widget only when it can actually talk to someone.
 *
 * The same "off until configured" rule as every other integration here — a
 * widget that opens onto an error is worse than no widget, so this checks
 * server-side rather than mounting the client component and letting the
 * first message fail.
 *
 * ## Why the sales details travel with it
 *
 * Being configured is not the same as working. The key can be revoked, the
 * account behind it can run dry, the API can have a bad afternoon — and all of
 * those arrive at the visitor as one red line in a chat window with nothing
 * after it. Somebody who had a question and got that has not been helped and
 * has not been captured; they have been stopped.
 *
 * So the widget is handed the same three ways through that the footer carries,
 * server-side, before anything is known to be wrong. Passing them at render
 * means the fallback cannot itself depend on a request succeeding, which is
 * the whole point of a fallback.
 */
export async function ChatWidgetGate() {
  const [config, site] = await Promise.all([getAssistantConfig(), getSiteConfig()]);
  if (!config) return null;

  return (
    <ChatWidget
      assistantName={config.assistantName}
      salesEmail={site.email.sales}
      salesPhone={site.phone.sales}
    />
  );
}
