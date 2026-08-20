"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { saveVariant } from "@/app/admin/actions";

export type VariantFormValues = {
  id: string;
  sku: string;
  name: string;
  licenceType: string;
  termMonths: number | null;
  seats: number;
  listPriceMinor: number;
  salePriceMinor: number | null;
  gstRatePercent: number;
  isDefault: boolean;
};

const LICENCE_TYPES = [
  "SUBSCRIPTION_ANNUAL",
  "SUBSCRIPTION_MONTHLY",
  "PERPETUAL",
  "VOLUME",
  "CSP",
  "OEM",
  "EDUCATION",
  "MAINTENANCE",
];

/** Minor units are an implementation detail; the form works in rupees. */
function toMajor(minor: number | null): string {
  if (minor == null) return "";
  return (minor / 100).toFixed(2).replace(/\.00$/, "");
}

export function VariantForm({
  productId,
  variant,
}: {
  productId: string;
  variant?: VariantFormValues;
}) {
  return (
    <AdminForm
      action={saveVariant}
      submitLabel={variant ? "Save licence option" : "Add licence option"}
      pendingLabel="Saving…"
      hidden={{ productId, ...(variant ? { variantId: variant.id } : {}) }}
    >
      {({ fieldErrors }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" required error={fieldErrors.sku?.[0]}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="sku" defaultValue={variant?.sku} className="font-mono uppercase" required maxLength={64} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Option name" required error={fieldErrors.name?.[0]}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="name" defaultValue={variant?.name} placeholder="1-year subscription, single user" required aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Licence type" required error={fieldErrors.licenceType?.[0]}>
            {({ id, describedBy, invalid }) => (
              <Select id={id} name="licenceType" defaultValue={variant?.licenceType ?? "SUBSCRIPTION_ANNUAL"} aria-describedby={describedBy} invalid={invalid}>
                {LICENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type
                      .toLowerCase()
                      .split("_")
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Term in months"
            hint="Leave blank for a perpetual licence."
            error={fieldErrors.termMonths?.[0]}
          >
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="termMonths" type="number" min={1} max={120} defaultValue={variant?.termMonths ?? ""} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="Seats per unit" required error={fieldErrors.seats?.[0]}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="seats" type="number" min={1} max={100000} defaultValue={variant?.seats ?? 1} required aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field label="GST rate (%)" required error={fieldErrors.gstRatePercent?.[0]}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="gstRatePercent" type="number" min={0} max={50} defaultValue={variant?.gstRatePercent ?? 18} required aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field
            label="List price (₹, excl. GST)"
            required
            hint="Enter 0 for products that are quoted rather than priced."
            error={fieldErrors.listPrice?.[0]}
          >
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="listPrice" inputMode="decimal" defaultValue={toMajor(variant?.listPriceMinor ?? null)} required aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <Field
            label="Sale price (₹, excl. GST)"
            hint="Must be lower than the list price. Leave blank for no discount."
            error={fieldErrors.salePrice?.[0]}
          >
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="salePrice" inputMode="decimal" defaultValue={toMajor(variant?.salePriceMinor ?? null)} aria-describedby={describedBy} invalid={invalid} />
            )}
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="isDefault"
              defaultChecked={variant?.isDefault}
              label="Show this option first on the product page"
            />
          </div>
        </div>
      )}
    </AdminForm>
  );
}
