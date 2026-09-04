"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { saveWhatsAppSettings, createWhatsAppTemplates } from "@/app/admin/settings/whatsapp-actions";
import type { WhatsAppSettingsView } from "@/lib/whatsapp/config";

/**
 * Order and payment confirmations over WhatsApp — credentials, and the
 * button that submits the two templates those confirmations need for Meta's
 * review. Nothing sends until both this form is saved *and* Meta approves
 * the templates, which the "Create WhatsApp templates" button starts but
 * cannot finish — that happens in WhatsApp Manager, on Meta's own schedule.
 */
export function WhatsAppSettingsForm({ settings }: { settings: WhatsAppSettingsView }) {
  return (
    <div className="space-y-6">
      <AdminForm action={saveWhatsAppSettings} submitLabel="Save WhatsApp settings" pendingLabel="Saving…">
        <Checkbox
          name="enabled"
          label="Send order and payment confirmations over WhatsApp, alongside email"
          defaultChecked={settings.enabled}
        />

        <Field
          label="Phone number ID"
          name="phoneNumberId"
          hint="From WhatsApp → API Setup in your Meta app."
        >
          <Input
            name="phoneNumberId"
            defaultValue={settings.phoneNumberId}
            placeholder="639721822561011"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="WhatsApp Business Account ID"
          name="businessAccountId"
          hint="Shown on the same page. Needed to submit message templates for review."
        >
          <Input
            name="businessAccountId"
            defaultValue={settings.businessAccountId}
            placeholder="1379464414331830"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Access token"
          name="accessToken"
          hint={
            settings.accessTokenHint
              ? `A token ending ${settings.accessTokenHint.slice(-4)} is saved. Leave blank to keep it.`
              : "The temporary token on the API Setup page works for about 24 hours; a System User token from Business Settings lasts far longer."
          }
        >
          <Input
            name="accessToken"
            type="password"
            placeholder={settings.accessTokenHint ?? "Paste the access token"}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {settings.accessTokenHint ? (
          <Checkbox name="clearAccessToken" label="Remove the saved access token" />
        ) : null}

        {settings.brokenConfiguration ? (
          <p className="rounded-[--radius-md] border border-amber-300 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
            Switched on, but the phone number ID, business account ID, or access token is missing —
            customers are only getting the email confirmation until all three are set.
          </p>
        ) : null}
      </AdminForm>

      {settings.enabled && !settings.brokenConfiguration ? (
        <AdminForm
          action={createWhatsAppTemplates}
          submitLabel="Create WhatsApp templates"
          pendingLabel="Submitting…"
        >
          <p className="text-[13px] leading-relaxed text-ink-600">
            Submits the <strong>order_confirmation</strong> and <strong>payment_confirmation</strong> templates for
            Meta&rsquo;s review. Safe to press more than once — a template already submitted is reported back
            rather than duplicated. Check WhatsApp Manager for approval status; a template cannot send until
            Meta approves it.
          </p>
        </AdminForm>
      ) : null}
    </div>
  );
}
