"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { saveCompanyAddress } from "@/app/admin/organisation-actions";

export type CompanyAddressFormValues = {
  id: string;
  label: string;
  kind: string;
  attention: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postcode: string;
  country: string;
  gstin: string | null;
  isDefault: boolean;
};

const KINDS = ["BILLING", "DELIVERY", "BOTH"];

export function CompanyAddressForm({
  companyId,
  address,
}: {
  companyId: string;
  address?: CompanyAddressFormValues;
}) {
  return (
    <AdminForm
      action={saveCompanyAddress}
      submitLabel={address ? "Save address" : "Add address"}
      pendingLabel="Saving…"
      hidden={{ companyId, ...(address ? { addressId: address.id } : {}) }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="label" label="Label" required hint='e.g. "Head office", "Mumbai warehouse".'>
          <Input name="label" defaultValue={address?.label} required maxLength={80} />
        </Field>
        <Field name="kind" label="Used for" required>
          <Select name="kind" defaultValue={address?.kind ?? "DELIVERY"}>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind.charAt(0) + kind.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="attention" label="Attention of">
          <Input name="attention" defaultValue={address?.attention ?? ""} maxLength={120} />
        </Field>
        <Field name="gstin" label="GSTIN for this place" hint="Only if different from the company's own.">
          <Input name="gstin" defaultValue={address?.gstin ?? ""} className="font-mono uppercase" maxLength={15} />
        </Field>
        <Field name="line1" label="Address line 1" required className="sm:col-span-2">
          <Input name="line1" defaultValue={address?.line1} required maxLength={200} />
        </Field>
        <Field name="line2" label="Address line 2" className="sm:col-span-2">
          <Input name="line2" defaultValue={address?.line2 ?? ""} maxLength={200} />
        </Field>
        <Field name="city" label="City" required>
          <Input name="city" defaultValue={address?.city} required maxLength={100} />
        </Field>
        <Field name="state" label="State" required>
          <Input name="state" defaultValue={address?.state} required maxLength={100} />
        </Field>
        <Field name="postcode" label="Postcode" required>
          <Input name="postcode" defaultValue={address?.postcode} required maxLength={20} />
        </Field>
        <Field name="country" label="Country">
          <Input name="country" defaultValue={address?.country ?? "India"} maxLength={100} />
        </Field>
        <div className="sm:col-span-2">
          <Checkbox
            name="isDefault"
            defaultChecked={address?.isDefault}
            label="Preferred address of this kind"
          />
        </div>
      </div>
    </AdminForm>
  );
}
