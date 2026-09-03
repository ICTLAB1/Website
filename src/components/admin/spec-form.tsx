"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input } from "@/components/ui/form";
import { saveSpec } from "@/app/admin/actions";

export type SpecFormValues = {
  id: string;
  label: string;
  value: string;
  displayOrder: number;
};

export function SpecForm({
  productId,
  spec,
}: {
  productId: string;
  spec?: SpecFormValues;
}) {
  return (
    <AdminForm
      action={saveSpec}
      submitLabel={spec ? "Save specification" : "Add specification"}
      pendingLabel="Saving…"
      hidden={{ productId, ...(spec ? { specId: spec.id } : {}) }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_6rem]">
        <Field name="label" label="Label" required hint='"Processor", "Display", "Memory".'>
          <Input name="label" defaultValue={spec?.label} required maxLength={80} />
        </Field>
        <Field
          name="value"
          label="Value"
          required
          hint='As the manufacturer states it — "Configuration dependent" is fine.'
        >
          <Input name="value" defaultValue={spec?.value} required maxLength={300} />
        </Field>
        <Field name="displayOrder" label="Order">
          <Input name="displayOrder" type="number" min={0} max={10_000} defaultValue={spec?.displayOrder ?? 0} />
        </Field>
      </div>
    </AdminForm>
  );
}
