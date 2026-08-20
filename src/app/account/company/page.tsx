import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Fieldset, Input } from "@/components/ui/form";
import { updateCompany } from "@/app/account/actions";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Company" };

export default async function AccountCompanyPage() {
  const session = await requireUser("/account/company");
  const company = session.companyId
    ? await prisma.company.findUnique({ where: { id: session.companyId } })
    : null;

  return (
    <div className="max-w-2xl">
      <h2 className="text-[1.15rem]">Company details</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
        These details appear on your quotations and tax invoices. The GSTIN and registered legal
        name must match your GST registration exactly, or input credit can be lost to a
        reconciliation mismatch.
      </p>

      <div className="mt-8">
        <AccountForm action={updateCompany} submitLabel="Save company details" pendingLabel="Saving…">
          {({ fieldErrors }) => (
            <>
              <Fieldset legend="Registration">
                <Field
                  label="Registered legal name"
                  required
                  hint="As it appears on your GST registration, not a trading name."
                  error={fieldErrors.name?.[0]}
                >
                  {({ id, describedBy, invalid }) => (
                    <Input
                      id={id}
                      name="name"
                      defaultValue={company?.name ?? ""}
                      autoComplete="organization"
                      required
                      aria-describedby={describedBy}
                      invalid={invalid}
                    />
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="GSTIN" hint="15 characters" error={fieldErrors.gstin?.[0]}>
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        name="gstin"
                        maxLength={15}
                        placeholder="22AAAAA0000A1Z5"
                        className="uppercase"
                        defaultValue={company?.gstin ?? ""}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      />
                    )}
                  </Field>
                  <Field label="Website" error={fieldErrors.website?.[0]}>
                    {({ id, describedBy, invalid }) => (
                      <Input
                        id={id}
                        name="website"
                        type="url"
                        placeholder="https://example.com"
                        defaultValue={company?.website ?? ""}
                        aria-describedby={describedBy}
                        invalid={invalid}
                      />
                    )}
                  </Field>
                </div>
              </Fieldset>

              <Fieldset legend="Registered address">
                <Field label="Address line 1" error={fieldErrors.addressLine1?.[0]}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} name="addressLine1" defaultValue={company?.addressLine1 ?? ""} autoComplete="address-line1" aria-describedby={describedBy} invalid={invalid} />
                  )}
                </Field>
                <Field label="Address line 2" error={fieldErrors.addressLine2?.[0]}>
                  {({ id, describedBy, invalid }) => (
                    <Input id={id} name="addressLine2" defaultValue={company?.addressLine2 ?? ""} autoComplete="address-line2" aria-describedby={describedBy} invalid={invalid} />
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="City" error={fieldErrors.city?.[0]}>
                    {({ id, describedBy, invalid }) => (
                      <Input id={id} name="city" defaultValue={company?.city ?? ""} autoComplete="address-level2" aria-describedby={describedBy} invalid={invalid} />
                    )}
                  </Field>
                  <Field label="State" error={fieldErrors.state?.[0]}>
                    {({ id, describedBy, invalid }) => (
                      <Input id={id} name="state" defaultValue={company?.state ?? ""} autoComplete="address-level1" aria-describedby={describedBy} invalid={invalid} />
                    )}
                  </Field>
                  <Field label="Postcode" error={fieldErrors.postcode?.[0]}>
                    {({ id, describedBy, invalid }) => (
                      <Input id={id} name="postcode" defaultValue={company?.postcode ?? ""} autoComplete="postal-code" aria-describedby={describedBy} invalid={invalid} />
                    )}
                  </Field>
                  <Field label="Country" required error={fieldErrors.country?.[0]}>
                    {({ id, describedBy, invalid }) => (
                      <Input id={id} name="country" defaultValue={company?.country ?? "India"} autoComplete="country-name" required aria-describedby={describedBy} invalid={invalid} />
                    )}
                  </Field>
                </div>
              </Fieldset>
            </>
          )}
        </AccountForm>
      </div>
    </div>
  );
}
