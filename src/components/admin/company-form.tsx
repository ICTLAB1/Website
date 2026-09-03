"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { saveCompany } from "@/app/admin/organisation-actions";

export type CompanyFormValues = {
  id: string;
  name: string;
  pan: string | null;
  gstin: string | null;
  website: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
  employeeCount: number | null;
};

export function CompanyForm({ company }: { company: CompanyFormValues }) {
  return (
    <AdminForm
      action={saveCompany}
      submitLabel="Save organisation details"
      pendingLabel="Saving…"
      hidden={{ companyId: company.id }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Organisation name" required>
          <Input name="name" defaultValue={company.name} required maxLength={200} />
        </Field>
        <Field name="website" label="Website">
          <Input name="website" defaultValue={company.website ?? ""} maxLength={300} />
        </Field>
        <Field name="gstin" label="GSTIN" hint="Checked against its own check digit.">
          <Input name="gstin" defaultValue={company.gstin ?? ""} className="font-mono uppercase" maxLength={15} />
        </Field>
        <Field name="pan" label="PAN">
          <Input name="pan" defaultValue={company.pan ?? ""} className="font-mono uppercase" maxLength={20} />
        </Field>
        <Field name="phone" label="Phone">
          <Input name="phone" defaultValue={company.phone ?? ""} maxLength={32} />
        </Field>
        <Field name="employeeCount" label="Employees">
          <Input
            name="employeeCount"
            type="number"
            min={0}
            defaultValue={company.employeeCount ?? ""}
          />
        </Field>
        <Field name="addressLine1" label="Registered address, line 1" className="sm:col-span-2">
          <Input name="addressLine1" defaultValue={company.addressLine1 ?? ""} maxLength={200} />
        </Field>
        <Field name="addressLine2" label="Registered address, line 2" className="sm:col-span-2">
          <Input name="addressLine2" defaultValue={company.addressLine2 ?? ""} maxLength={200} />
        </Field>
        <Field name="city" label="City">
          <Input name="city" defaultValue={company.city ?? ""} maxLength={100} />
        </Field>
        <Field name="state" label="State">
          <Input name="state" defaultValue={company.state ?? ""} maxLength={100} />
        </Field>
        <Field name="postcode" label="Postcode">
          <Input name="postcode" defaultValue={company.postcode ?? ""} maxLength={20} />
        </Field>
        <Field name="country" label="Country">
          <Input name="country" defaultValue={company.country} maxLength={100} />
        </Field>
      </div>
    </AdminForm>
  );
}
