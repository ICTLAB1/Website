"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input, Select } from "@/components/ui/form";
import { savePaymentSettings } from "@/app/admin/settings/payment-actions";
import type { PaymentSettingsView } from "@/lib/payments/config";

/**
 * The payment gateway form.
 *
 * A client component for the same reason as every other form here: `Field`
 * clones its child to attach an id and the aria attributes, which needs a real
 * element rather than one that has crossed the server boundary.
 *
 * The two secret fields are write-only. They are never populated, because the
 * value is never sent to the browser — a masked hint beside the label is how
 * somebody confirms *which* key is stored, by matching the last four characters
 * against what Razorpay shows them. A blank box therefore means "leave it
 * alone", which is why removing a secret needs its own explicit checkbox.
 */
export function PaymentSettingsForm({ settings }: { settings: PaymentSettingsView }) {
  return (
    <AdminForm
      action={savePaymentSettings}
      submitLabel="Save payment settings"
      pendingLabel="Saving…"
    >
      <Fieldset
        legend="Card payments"
        description="An addition to the purchase-order route, never a replacement for it. Government and enterprise buyers generally cannot pay by card, so the invoice route stays available whatever is set here."
      >
        <Checkbox
          name="enabled"
          defaultChecked={settings.enabled}
          label="Offer card payment at checkout"
        />
        <p className="-mt-2 text-[12px] leading-relaxed text-ink-500">
          {settings.brokenConfiguration
            ? "Currently switched on but not usable — the key id or secret is missing or could not be read. Customers are seeing the purchase-order route only."
            : "Off until both a key id and a key secret are saved."}
        </p>

        <Field
          label="Mode"
          name="mode"
          hint="Test mode moves no real money and is the right place to prove the flow. Switch to Live only once a test payment has worked end to end."
        >
          <Select name="mode" defaultValue={settings.mode}>
            <option value="TEST">Test — no real money</option>
            <option value="LIVE">Live — real payments</option>
          </Select>
        </Field>
      </Fieldset>

      <Fieldset
        legend="Razorpay credentials"
        description="From your Razorpay dashboard, under Settings → API Keys. The key id is not a secret — the checkout page needs it in the browser — but the other two are, and are stored encrypted and never shown again."
      >
        <Field
          label="Key ID"
          name="razorpayKeyId"
          hint="Looks like rzp_test_xxxxxxxxxxxx or rzp_live_xxxxxxxxxxxx."
        >
          <Input
            name="razorpayKeyId"
            defaultValue={settings.keyId}
            placeholder="rzp_test_1234567890abcd"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Key Secret"
          name="razorpayKeySecret"
          hint={
            settings.keySecretHint
              ? `A secret ending ${settings.keySecretHint.slice(-4)} is saved. Leave blank to keep it, or paste a new one to replace it.`
              : "Not set. Paste the secret shown when you generated the key — Razorpay does not show it again."
          }
        >
          <Input
            name="razorpayKeySecret"
            type="password"
            placeholder={settings.keySecretHint ?? "Paste the key secret"}
            autoComplete="new-password"
            spellCheck={false}
          />
        </Field>

        {settings.keySecretHint ? (
          <Checkbox name="clearKeySecret" label="Remove the saved key secret" />
        ) : null}

        <Field
          label="Webhook Secret"
          name="razorpayWebhookSecret"
          hint={
            settings.webhookSecretHint
              ? `A secret ending ${settings.webhookSecretHint.slice(-4)} is saved. Leave blank to keep it.`
              : "Optional but strongly recommended. Razorpay signs its webhook calls with this, and a webhook is the only reliable way to learn that a payment succeeded when a customer closes the tab mid-payment."
          }
        >
          <Input
            name="razorpayWebhookSecret"
            type="password"
            placeholder={settings.webhookSecretHint ?? "Paste the webhook secret"}
            autoComplete="new-password"
            spellCheck={false}
          />
        </Field>

        {settings.webhookSecretHint ? (
          <Checkbox name="clearWebhookSecret" label="Remove the saved webhook secret" />
        ) : null}
      </Fieldset>
    </AdminForm>
  );
}
