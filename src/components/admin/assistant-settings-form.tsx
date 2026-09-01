"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input } from "@/components/ui/form";
import { saveAssistantSettings } from "@/app/admin/settings/assistant-actions";
import type { AssistantSettingsView } from "@/lib/assistant/config";

/**
 * The chat assistant, configured the same way every credential-bearing
 * integration on this site is: off until a key is entered, and the key
 * itself write-only — a masked hint is how somebody confirms which key is
 * saved, and a blank box always means "leave it alone".
 */
export function AssistantSettingsForm({ settings }: { settings: AssistantSettingsView }) {
  return (
    <AdminForm action={saveAssistantSettings} submitLabel="Save assistant" pendingLabel="Saving…">
      <Fieldset
        legend="Chat assistant"
        description="A chat widget on every public page — not admin, not the customer account area. It answers from the real catalogue and this business's own details, never from what the model already knows, and asks for a name and email before recording anyone as a lead."
      >
        <Checkbox name="enabled" defaultChecked={settings.enabled} label="Show the chat widget on the site" />
        <p className="-mt-2 text-[12px] leading-relaxed text-ink-500">
          {settings.brokenConfiguration
            ? "Currently switched on but not usable — the API key is missing or could not be read. The widget is not showing."
            : "Off until an API key is saved below."}
        </p>

        <Field label="Assistant's name" name="assistantName" hint="Shown in the chat header and used by the assistant to refer to itself.">
          <Input name="assistantName" defaultValue={settings.assistantName} maxLength={40} autoComplete="off" />
        </Field>

        <Field
          label="Anthropic API key"
          name="anthropicApiKey"
          hint={
            settings.apiKeyHint
              ? `A key ending ${settings.apiKeyHint.slice(-4)} is saved. Leave blank to keep it, or paste a new one to replace it.`
              : "From console.anthropic.com — Settings → API Keys. Looks like sk-ant-…."
          }
        >
          <Input
            name="anthropicApiKey"
            type="password"
            placeholder={settings.apiKeyHint ?? "Paste the API key"}
            autoComplete="new-password"
            spellCheck={false}
          />
        </Field>

        {settings.apiKeyHint ? <Checkbox name="clearApiKey" label="Remove the saved API key" /> : null}
      </Fieldset>
    </AdminForm>
  );
}
