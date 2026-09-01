import { getAssistantConfig } from "@/lib/assistant/config";
import { ChatWidget } from "@/components/chat/chat-widget";

/**
 * Renders the chat widget only when it can actually talk to someone.
 *
 * The same "off until configured" rule as every other integration here — a
 * widget that opens onto an error is worse than no widget, so this checks
 * server-side rather than mounting the client component and letting the
 * first message fail.
 */
export async function ChatWidgetGate() {
  const config = await getAssistantConfig();
  if (!config) return null;
  return <ChatWidget assistantName={config.assistantName} />;
}
