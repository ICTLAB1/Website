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
          <Fieldset legend="Registration">
            <Field
              label="Registered legal name"
              name="name"
              required
              hint="As it appears on your GST registration, not a trading name."
            >
              <Input name="name" defaultValue={company?.name ?? ""} autoComplete="organization" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GSTIN" name="gstin" hint="15 characters">
                <Input
                  name="gstin"
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  className="uppercase"
                  defaultValue={company?.gstin ?? ""}
                />
              </Field>
              <Field label="Website" name="website">
                <Input
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  defaultValue={company?.website ?? ""}
                />
              </Field>
            </div>
          </Fieldset>

          <Fieldset legend="Registered address">
            <Field label="Address line 1" name="addressLine1">
              <Input name="addressLine1" defaultValue={company?.addressLine1 ?? ""} autoComplete="address-line1" />
            </Field>
            <Field label="Address line 2" name="addressLine2">
              <Input name="addressLine2" defaultValue={company?.addressLine2 ?? ""} autoComplete="address-line2" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" name="city">
                <Input name="city" defaultValue={company?.city ?? ""} autoComplete="address-level2" />
              </Field>
              <Field label="State" name="state">
                <Input name="state" defaultValue={company?.state ?? ""} autoComplete="address-level1" />
              </Field>
              <Field label="Postcode" name="postcode">
                <Input name="postcode" defaultValue={company?.postcode ?? ""} autoComplete="postal-code" />
              </Field>
              <Field label="Country" name="country" required>
                <Input name="country" defaultValue={company?.country ?? "India"} autoComplete="country-name" required />
              </Field>
            </div>
          </Fieldset>
        </AccountForm>
      </div>
    </div>
  );
}
