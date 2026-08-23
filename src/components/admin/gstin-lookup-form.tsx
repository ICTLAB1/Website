"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Fieldset, Input } from "@/components/ui/form";
import {
  saveGstinLookupSettings,
  testGstinLookup,
} from "@/app/admin/settings/gstin-lookup-actions";

import type { GstinLookupView } from "@/lib/gstin-lookup";

/**
 * Looking a customer's GSTIN up, when this deployment is entitled to.
 *
 * There is no free public GSTN endpoint: access runs through a GST Suvidha
 * Provider, who supplies the host and the credentials. So this screen is the
 * whole of the feature's configuration, and until a host is entered every form
 * that offers a lookup says it is not connected — which is true, and is the
 * rule this application applies to every integration.
 *
 * Header values are write-only, like the mail password and the payment secret:
 * blank means "leave the stored one alone", because blank is what the page
 * shows every time it loads and treating it as an instruction to delete would
 * wipe the credentials whenever somebody corrected a path.
 */
export function GstinLookupForm({ settings }: { settings: GstinLookupView }) {
  return (
    <div className="space-y-6">
      <div
        className={
          settings.connected
            ? "rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-700"
            : "rounded-[--radius-md] border border-warning-600/40 bg-warning-50 px-4 py-3 text-[13px] text-ink-700"
        }
      >
        {settings.connected ? (
          settings.returnsDetails ? (
            <>
              <strong className="text-graphite-900">Connected.</strong> A customer entering a GSTIN
              has their registered name and address filled in, and a cancelled registration is
              flagged before you quote against it.
            </>
          ) : (
            <>
              <strong className="text-graphite-900">Connected for verification only.</strong> A
              GSTIN is checked and its state filled in. Names and addresses need the search
              endpoint below — your provider may charge separately for it.
            </>
          )
        ) : (
          <>
            <strong className="text-graphite-900">Not connected.</strong> GSTINs are still checked
            against their own check digit and the state is still read from the number, both offline.
            Nothing is looked up, and no screen claims otherwise.
          </>
        )}
      </div>

      <AdminForm
        action={saveGstinLookupSettings}
        submitLabel="Save GST lookup"
        pendingLabel="Saving…"
      >
        <Fieldset
          legend="Your GST Suvidha Provider"
          description="The host your provider gave you, and whatever headers it authenticates with. Both endpoints are plain GET calls taking gstin and action=TP; only the version in the path differs between providers, which is why they are fields rather than fixed."
        >
          <Field
            label="Host"
            name="baseUrl"
            hint="https:// and the host only. Leaving it blank turns the lookup off."
          >
            <Input
              name="baseUrl"
              inputMode="url"
              placeholder="https://api.example.com"
              defaultValue={settings.baseUrl}
              autoComplete="off"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Search endpoint"
              name="searchPath"
              hint="Returns the legal name, trade name and principal address. This is the one that fills a form in."
            >
              <Input
                name="searchPath"
                placeholder="/commonapi/v1.3/search"
                defaultValue={settings.searchPath}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Status endpoint"
              name="statusPath"
              hint="Returns whether the registration is real and live. Used on its own if there is no search endpoint."
            >
              <Input
                name="statusPath"
                placeholder="/commonapi/v1.0/tpstatus"
                defaultValue={settings.statusPath}
                autoComplete="off"
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset
          legend="Authentication headers"
          description="Providers differ: some want a client id and secret, some a bearer token, some a subscription key. Enter whichever names yours documents. Values are encrypted and never shown again."
        >
          {[
            { name: "headerOneName", value: "headerOneValue", stored: settings.headerOneName, hint: settings.headerHints[0] },
            { name: "headerTwoName", value: "headerTwoValue", stored: settings.headerTwoName, hint: settings.headerHints[1] },
            { name: "headerThreeName", value: "headerThreeValue", stored: settings.headerThreeName, hint: settings.headerHints[2] },
          ].map((header, index) => (
            <div key={header.name} className="grid gap-4 sm:grid-cols-2">
              <Field label={`Header ${index + 1} name`} name={header.name}>
                <Input
                  name={header.name}
                  maxLength={60}
                  placeholder={index === 0 ? "client-id" : ""}
                  defaultValue={header.stored}
                  autoComplete="off"
                />
              </Field>
              <Field
                label={`Header ${index + 1} value`}
                name={header.value}
                hint={header.hint ? `Stored: ${header.hint}. Leave blank to keep it.` : "Not set."}
              >
                <Input
                  name={header.value}
                  type="password"
                  maxLength={400}
                  autoComplete="off"
                />
              </Field>
            </div>
          ))}

          <Checkbox
            name="clearHeaderValues"
            label={
              <>
                Remove the stored header values
                <span className="mt-0.5 block text-ink-500">
                  Only tick this to disconnect. A blank value field on its own leaves what is
                  stored alone.
                </span>
              </>
            }
          />
        </Fieldset>
      </AdminForm>

      {/*
        A real lookup, not a saved form.

        Saving credentials proves nothing about them. The first wrong key would
        otherwise be discovered by a customer filling in their company profile,
        who has no way to tell a bad credential from their own typo.
      */}
      <div className="rounded-[--radius-lg] border border-line bg-white p-5">
        <h3 className="text-[15px] font-semibold text-graphite-900">Try it</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
          Enter any real GSTIN — your own will do. Nothing is saved; this only asks the provider
          and reports what came back.
        </p>
        <div className="mt-4">
          <AdminForm
            action={testGstinLookup}
            submitLabel="Look it up"
            pendingLabel="Asking…"
            variant="outline"
            compact
          >
            <Field label="GSTIN" name="gstin">
              <Input
                name="gstin"
                maxLength={15}
                placeholder="07AAICT5606J1Z4"
                className="max-w-[16rem] font-mono uppercase"
                autoComplete="off"
              />
            </Field>
          </AdminForm>
        </div>
      </div>
    </div>
  );
}
