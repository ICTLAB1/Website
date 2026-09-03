"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { saveCompanyContact } from "@/app/admin/organisation-actions";

export type CompanyContactFormValues = {
  id: string;
  kind: string;
  name: string;
  email: string;
  phone: string | null;
  note: string | null;
};

const KINDS = ["PROCUREMENT", "FINANCE", "IT", "ESCALATION"];

export function CompanyContactForm({
  companyId,
  contact,
}: {
  companyId: string;
  contact?: CompanyContactFormValues;
}) {
  return (
    <AdminForm
      action={saveCompanyContact}
      submitLabel={contact ? "Save contact" : "Add contact"}
      pendingLabel="Saving…"
      hidden={{ companyId, ...(contact ? { contactId: contact.id } : {}) }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="kind" label="Role" required>
          <Select name="kind" defaultValue={contact?.kind ?? "PROCUREMENT"}>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind.charAt(0) + kind.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field name="name" label="Name" required>
          <Input name="name" defaultValue={contact?.name} required maxLength={160} />
        </Field>
        <Field name="email" label="Email" required>
          <Input name="email" type="email" defaultValue={contact?.email} required maxLength={254} />
        </Field>
        <Field name="phone" label="Phone">
          <Input name="phone" defaultValue={contact?.phone ?? ""} maxLength={32} />
        </Field>
        <Field name="note" label="Note" className="sm:col-span-2">
          <Textarea name="note" rows={2} defaultValue={contact?.note ?? ""} maxLength={500} />
        </Field>
      </div>
    </AdminForm>
  );
}
