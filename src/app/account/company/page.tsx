import type { Metadata } from "next";
import type { ContactKind } from "@prisma/client";

import { AccountForm } from "@/components/account/account-form";
import { CompanyTabs } from "@/components/account/company-tabs";
import { Checkbox, Field, Fieldset, Input } from "@/components/ui/form";
import { fillCompanyFromGstin, updateCompany } from "@/app/account/actions";
import { saveContact } from "@/app/account/company/actions";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";
import { gstinLookupConfigured, gstinLookupReturnsDetails } from "@/lib/gstin-lookup";

export const metadata: Metadata = { title: "Company" };

/**
 * The functional contacts an organisation is asked for.
 *
 * Deliberately the three the brief names plus escalation: a quotation goes to
 * procurement, an invoice goes to finance, a licence key goes to IT, and when
 * something has gone wrong there is somebody to ring. Any of them may be empty.
 */
const CONTACTS: Array<{ kind: ContactKind; legend: string; hint: string }> = [
  {
    kind: "PROCUREMENT",
    legend: "Procurement contact",
    hint: "Who quotations and requirement discussions go to.",
  },
  { kind: "FINANCE", legend: "Finance contact", hint: "Who invoices and payment queries go to." },
  { kind: "IT", legend: "IT contact", hint: "Who licence keys and technical details go to." },
  {
    kind: "ESCALATION",
    legend: "Escalation contact",
    hint: "Who to reach when something needs to be resolved quickly.",
  },
];

export default async function AccountCompanyPage() {
  const session = await requireUser("/account/company");
  const company = session.companyId
    ? await prisma.company.findUnique({
        where: { id: session.companyId },
        include: { contacts: true },
      })
    : null;

  const mayEdit = canInCompany(session, "company.manage");

  /*
   * Whether the button is worth showing at all.
   *
   * There is no free public GSTN endpoint, so a deployment with no provider
   * configured cannot look anything up — and a "Fetch my details" button that
   * always fails is worse than no button. Both questions are asked because the
   * answers differ: a provider may sell verification without the taxpayer
   * search, and then the panel promises the state and the PAN rather than an
   * address it cannot fetch.
   */
  const [lookupAvailable, lookupReturnsDetails] = await Promise.all([
    gstinLookupConfigured(),
    gstinLookupReturnsDetails(),
  ]);
  const contactByKind = new Map(company?.contacts.map((contact) => [contact.kind, contact]) ?? []);

  return (
    <div className="max-w-3xl">
      <h2 className="text-[1.15rem]">Company details</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
        These details appear on your quotations and tax invoices. The GSTIN and registered legal
        name must match your GST registration exactly, or input credit can be lost to a
        reconciliation mismatch.
      </p>

      {company ? <CompanyTabs /> : null}

      {!mayEdit ? (
        <p className="mt-6 rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Your access is read-only. A company administrator can change these details.
        </p>
      ) : null}

      {/*
        Fill it in from the GSTIN, rather than typing it a fourth time.

        Above the form and not inside it, because it is a different action with
        a different outcome: this one writes to the record and reloads the page
        with the values in place, which is what "auto-populated" has to mean on
        a form built out of uncontrolled inputs.

        Shown only to somebody who may edit, and only when a lookup is possible.
        Offering a button that cannot work is worse than not offering one.
      */}
      {mayEdit && lookupAvailable ? (
        <div className="mt-8 rounded-[--radius-lg] border border-line bg-surface-muted p-5">
          <h2 className="text-[15px] font-semibold text-graphite-900">
            Fill this in from your GSTIN
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
            {lookupReturnsDetails
              ? "Enter your GST number and we will bring in the registered name and address the tax authority holds. Nothing already filled in is replaced unless you ask."
              : "Enter your GST number and we will confirm the registration and fill in your state and PAN. This site cannot read the registered address, so the rest is yours to fill in."}
          </p>
          <div className="mt-4">
            <AccountForm
              action={fillCompanyFromGstin}
              submitLabel={lookupReturnsDetails ? "Fetch my details" : "Check my GSTIN"}
              pendingLabel="Asking the GST system…"
            >
              <Field label="GSTIN" name="gstin" hint="15 characters">
                <Input
                  name="gstin"
                  maxLength={15}
                  placeholder="22AAAAA0000A1ZC"
                  className="max-w-[16rem] uppercase"
                  defaultValue={company?.gstin ?? ""}
                />
              </Field>
              <Checkbox
                name="replaceExisting"
                label={
                  <>
                    Replace details I have already entered
                    <span className="mt-0.5 block text-ink-500">
                      A registered address is often an accountant&rsquo;s office rather than where
                      you actually sit, so by default we only fill in what is blank.
                    </span>
                  </>
                }
              />
            </AccountForm>
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <AccountForm action={updateCompany} submitLabel="Save company details" pendingLabel="Saving…">
          <Fieldset legend="Registration">
            <Field
              label="Registered legal name"
              name="name"
              required
              hint="As it appears on your GST registration, not a trading name."
            >
              <Input
                name="name"
                defaultValue={company?.name ?? ""}
                autoComplete="organization"
                required
                disabled={!mayEdit}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GSTIN" name="gstin" hint="15 characters">
                <Input
                  name="gstin"
                  maxLength={15}
                  placeholder="22AAAAA0000A1ZC"
                  className="uppercase"
                  defaultValue={company?.gstin ?? ""}
                  disabled={!mayEdit}
                />
              </Field>
              <Field label="PAN" name="pan" hint="10 characters">
                <Input
                  name="pan"
                  maxLength={10}
                  placeholder="AAAPA1234A"
                  className="uppercase"
                  defaultValue={company?.pan ?? ""}
                  disabled={!mayEdit}
                />
              </Field>
              <Field label="Switchboard" name="phone">
                <Input
                  name="phone"
                  type="tel"
                  defaultValue={company?.phone ?? ""}
                  autoComplete="tel"
                  disabled={!mayEdit}
                />
              </Field>
              <Field label="Website" name="website">
                <Input
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  defaultValue={company?.website ?? ""}
                  disabled={!mayEdit}
                />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Registered address">
            <Field label="Address line 1" name="addressLine1">
              <Input
                name="addressLine1"
                defaultValue={company?.addressLine1 ?? ""}
                autoComplete="address-line1"
                disabled={!mayEdit}
              />
            </Field>
            <Field label="Address line 2" name="addressLine2">
              <Input
                name="addressLine2"
                defaultValue={company?.addressLine2 ?? ""}
                autoComplete="address-line2"
                disabled={!mayEdit}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" name="city">
                <Input
                  name="city"
                  defaultValue={company?.city ?? ""}
                  autoComplete="address-level2"
                  disabled={!mayEdit}
                />
              </Field>
              <Field label="State" name="state">
                <Input
                  name="state"
                  defaultValue={company?.state ?? ""}
                  autoComplete="address-level1"
                  disabled={!mayEdit}
                />
              </Field>
              <Field label="Postcode" name="postcode">
                <Input
                  name="postcode"
                  defaultValue={company?.postcode ?? ""}
                  autoComplete="postal-code"
                  disabled={!mayEdit}
                />
              </Field>
              <Field label="Country" name="country" required>
                <Input
                  name="country"
                  defaultValue={company?.country ?? "India"}
                  autoComplete="country-name"
                  required
                  disabled={!mayEdit}
                />
              </Field>
            </div>
          </Fieldset>
        </AccountForm>
      </div>

      {company ? (
        <section className="mt-14 border-t border-line pt-10">
          <h3 className="text-[1.05rem]">Who we should contact</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            A contact does not need an account here. Leave a name and address blank to remove that
            contact.
          </p>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {CONTACTS.map((slot) => {
              const contact = contactByKind.get(slot.kind);
              return (
                <div
                  key={slot.kind}
                  className="rounded-[--radius-lg] border border-line bg-white p-5"
                >
                  <AccountForm
                    action={saveContact}
                    submitLabel="Save contact"
                    pendingLabel="Saving…"
                    variant="outline"
                    hidden={{ kind: slot.kind }}
                    compact
                  >
                    <Fieldset legend={slot.legend}>
                      <p className="-mt-1 mb-3 text-[13px] text-ink-500">{slot.hint}</p>
                      <Field label="Name" name="name">
                        <Input name="name" defaultValue={contact?.name ?? ""} disabled={!mayEdit} />
                      </Field>
                      <Field label="Email" name="email">
                        <Input
                          name="email"
                          type="email"
                          defaultValue={contact?.email ?? ""}
                          disabled={!mayEdit}
                        />
                      </Field>
                      <Field label="Phone" name="phone">
                        <Input
                          name="phone"
                          type="tel"
                          defaultValue={contact?.phone ?? ""}
                          disabled={!mayEdit}
                        />
                      </Field>
                    </Fieldset>
                  </AccountForm>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
