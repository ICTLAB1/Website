"use client";

import { useState } from "react";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input, Select } from "@/components/ui/form";
import { saveMailSettings } from "@/app/admin/settings/mail-settings-actions";
import type { MailSettingsView } from "@/lib/mail-config";

/**
 * The mail server, editable without SSH.
 *
 * A client component for the same reason as every other form here: `Field`
 * clones its child to attach an id and the aria attributes, which needs a real
 * element rather than one that has crossed the server boundary.
 *
 * The password is write-only — never populated, identified only by a masked
 * hint — so a blank box means "leave it alone" and removing it takes its own
 * checkbox. Every other blank field falls back to the server's own
 * configuration, which is what lets this be introduced to a deployment that is
 * already sending email without a moment where it stops.
 */
export function MailSettingsForm({ settings }: { settings: MailSettingsView }) {
  /*
   * Which set of fields is shown, held in state so switching is immediate.
   *
   * Both sets are always *submitted* — the hidden ones keep their stored values
   * rather than arriving blank — so choosing Microsoft, saving, and later
   * switching back to SMTP finds the server settings exactly as they were. A
   * form that quietly cleared the other provider on every save would make
   * trying one out a one-way door.
   */
  const [provider, setProvider] = useState(settings.provider);
  const graph = provider === "MICROSOFT_GRAPH";

  return (
    <AdminForm action={saveMailSettings} submitLabel="Save mail server" pendingLabel="Saving…">
      <Fieldset
        legend="How email is sent"
        description="Microsoft 365 over HTTPS is the more reliable of the two: no password, nothing to enable per mailbox, and it is unaffected by a hosting provider blocking outbound mail ports — which most of them do on new servers."
      >
        <Field label="Method" name="provider">
          {/*
            * Controlled, unlike every other field here.
            *
            * This one decides which half of the form exists, so the React value
            * and the DOM value must not be able to disagree — and they can:
            * React 19 resets an uncontrolled form after its action returns,
            * which reverted the select to its old value while the state that
            * chooses the visible fields kept the new one. The result was a form
            * showing Microsoft's fields with SMTP selected.
            */}
          <Select
            name="provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value as MailSettingsView["provider"])}
          >
            <option value="SMTP">A mail server (SMTP)</option>
            <option value="MICROSOFT_GRAPH">Microsoft 365 (recommended)</option>
          </Select>
        </Field>
      </Fieldset>

      {graph ? (
        <Fieldset
          legend="Microsoft 365"
          description="From an app registration in the Azure portal: Entra ID → App registrations → New registration, then add the Mail.Send Application permission and press Grant admin consent. It needs no redirect URI — nobody signs in to it."
        >
          <Field
            label="Directory (tenant) ID"
            name="graphTenantId"
            hint="On the app registration's Overview page."
          >
            <Input
              name="graphTenantId"
              defaultValue={settings.graphTenantId}
              placeholder="72f988bf-86f1-41af-91ab-2d7cd011db47"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field label="Application (client) ID" name="graphClientId" hint="Directly beneath it.">
            <Input
              name="graphClientId"
              defaultValue={settings.graphClientId}
              placeholder="00000000-0000-0000-0000-000000000000"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          <Field
            label="Client secret"
            name="graphClientSecret"
            hint={
              settings.graphClientSecretHint
                ? `A secret ending ${settings.graphClientSecretHint.slice(-4)} is saved. Leave blank to keep it.`
                : "Certificates & secrets → New client secret. Copy the Value, not the Secret ID — Azure shows both and reveals the Value only once."
            }
          >
            <Input
              name="graphClientSecret"
              type="password"
              placeholder={settings.graphClientSecretHint ?? "Paste the secret Value"}
              autoComplete="new-password"
              spellCheck={false}
            />
          </Field>

          {settings.graphClientSecretHint ? (
            <Checkbox name="clearGraphSecret" label="Remove the saved client secret" />
          ) : null}

          <Field
            label="Send from this mailbox"
            name="graphSender"
            hint="A licensed mailbox, not a distribution list or an alias. This is the address customers will see."
          >
            <Input
              name="graphSender"
              type="email"
              defaultValue={settings.graphSender}
              placeholder="sales@example.com"
              autoComplete="off"
            />
          </Field>
        </Fieldset>
      ) : null}

      <div hidden={graph}>
      {settings.usingEnvironment && !graph ? (
        <p className="rounded-[--radius-md] border border-line bg-surface-muted p-3 text-[12px] leading-relaxed text-ink-600">
          These fields are empty because the mail server is currently set in the server&rsquo;s own
          configuration file. Filling them in here takes over from that, and takes effect
          immediately — no redeploy. Clearing one again hands it back.
        </p>
      ) : null}

      <Fieldset
        legend="Mail server"
        description="From your email provider. For Microsoft 365 this is smtp.office365.com on port 587; for Google Workspace, smtp.gmail.com on 587."
      >
        <Field label="Server" name="host" hint="For example smtp.office365.com">
          <Input
            name="host"
            defaultValue={settings.host}
            placeholder="smtp.office365.com"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Port" name="port" hint="587 for almost everything.">
            <Input name="port" type="number" min={1} max={65535} defaultValue={String(settings.port)} />
          </Field>
          <Field
            label="Encryption"
            name="secure"
            hint="Port 587 uses STARTTLS, which is the first option. Only port 465 needs the second."
          >
            <Select name="secure" defaultValue={settings.secure ? "on" : ""}>
              <option value="">STARTTLS — port 587</option>
              <option value="on">SSL/TLS on connect — port 465</option>
            </Select>
          </Field>
        </div>
      </Fieldset>

      <Fieldset
        legend="Sign-in"
        description="The mailbox the site signs in as. On Microsoft 365 this mailbox must have Authenticated SMTP switched on, and if it uses multi-factor authentication you need an app password rather than the ordinary one."
      >
        <Field label="Username" name="username" hint="Usually the full email address.">
          <Input
            name="username"
            defaultValue={settings.username}
            placeholder="sales@example.com"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        <Field
          label="Password"
          name="password"
          hint={
            settings.passwordHint
              ? `A password ending ${settings.passwordHint.slice(-4)} is saved. Leave blank to keep it, or type a new one to replace it.`
              : "Stored encrypted and never shown again."
          }
        >
          <Input
            name="password"
            type="password"
            placeholder={settings.passwordHint ?? "Paste the mailbox password"}
            autoComplete="new-password"
            spellCheck={false}
          />
        </Field>

        {settings.passwordHint ? (
          <Checkbox name="clearPassword" label="Remove the saved password" />
        ) : null}
      </Fieldset>

      <Fieldset
        legend="Sender"
        description="What customers see in the From line. Providers generally require the address to be the mailbox you sign in as, or a confirmed alias of it — a mismatch is refused as a relay attempt."
      >
        <Field label="From address" name="fromAddress">
          <Input
            name="fromAddress"
            type="email"
            defaultValue={settings.fromAddress}
            placeholder="sales@example.com"
            autoComplete="off"
          />
        </Field>
        <Field label="From name" name="fromName" hint="Optional. Shown beside the address.">
          <Input name="fromName" defaultValue={settings.fromName} placeholder="TechZoid" />
        </Field>
        <Field
          label="Send a copy of enquiries and orders to"
          name="salesNotificationEmail"
          hint="Optional. Your team gets a copy of every enquiry and order as it arrives."
        >
          <Input
            name="salesNotificationEmail"
            type="email"
            defaultValue={settings.salesNotificationEmail}
            placeholder="sales@example.com"
            autoComplete="off"
          />
        </Field>
        <Field
          label="Copy every quotation to"
          name="quoteCopyEmail"
          hint="Optional. A visible Cc on each quotation, so a reply-all reaches them. Verification codes and password resets are never copied."
        >
          <Input
            name="quoteCopyEmail"
            type="email"
            defaultValue={settings.quoteCopyEmail}
            placeholder="director@example.com"
            autoComplete="off"
          />
        </Field>
      </Fieldset>
      </div>

      <Fieldset
        legend="System mail (Azure Communication Services)"
        description="A separate, optional channel for verification codes, order and payment confirmations, and status updates — everything above except quotations and the internal copies your team already gets. Switched off, all of it keeps coming from the mailbox configured above, exactly as before."
      >
        <Checkbox
          name="acsEnabled"
          label="Send system mail through Azure Communication Services"
          defaultChecked={settings.acsEnabled}
        />

        <Field
          label="Connection string"
          name="acsConnectionString"
          hint={
            settings.acsConnectionStringHint
              ? `A connection string ending ${settings.acsConnectionStringHint.slice(-4)} is saved. Leave blank to keep it.`
              : "Communication Services resource → Keys. Looks like endpoint=https://<resource>.communication.azure.com/;accesskey=..."
          }
        >
          <Input
            name="acsConnectionString"
            type="password"
            placeholder={settings.acsConnectionStringHint ?? "Paste the connection string"}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {settings.acsConnectionStringHint ? (
          <Checkbox name="clearAcsConnectionString" label="Remove the saved connection string" />
        ) : null}

        <Field
          label="Sender address"
          name="acsSenderAddress"
          hint="From the Email Communication Service domain connected to that resource — an Azure managed domain gives you a working DoNotReply@<guid>.azurecomm.net with nothing to verify."
        >
          <Input
            name="acsSenderAddress"
            type="email"
            defaultValue={settings.acsSenderAddress}
            placeholder="DoNotReply@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.azurecomm.net"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>

        {settings.acsBrokenConfiguration ? (
          <p className="rounded-[--radius-md] border border-amber-300 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-800">
            Switched on, but the connection string or the sender address is missing — system mail
            is still going out from the mailbox configured above until both are set.
          </p>
        ) : null}
      </Fieldset>
    </AdminForm>
  );
}
