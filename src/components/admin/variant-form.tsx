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
      <div className="grid gap-4 sm:grid-cols-2">
          <Field name="sku" label="SKU" required>
<Input name="sku" defaultValue={variant?.sku} className="font-mono uppercase" required maxLength={64} />
</Field>
          <Field name="name" label="Option name" required>
<Input name="name" defaultValue={variant?.name} placeholder="1-year subscription, single user" required />
</Field>
          <Field name="licenceType" label="Licence type" required>
<Select name="licenceType" defaultValue={variant?.licenceType ?? "SUBSCRIPTION_ANNUAL"}>
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
</Field>
          <Field name="termMonths"
            label="Term in months"
            hint="Leave blank for a perpetual licence."
          >
<Input name="termMonths" type="number" min={1} max={120} defaultValue={variant?.termMonths ?? ""} />
</Field>
          <Field name="seats" label="Seats per unit" required>
<Input name="seats" type="number" min={1} max={100000} defaultValue={variant?.seats ?? 1} required />
</Field>
          <Field name="gstRatePercent" label="GST rate (%)" required>
<Input name="gstRatePercent" type="number" min={0} max={50} defaultValue={variant?.gstRatePercent ?? 18} required />
</Field>
          <Field name="listPrice"
            label="List price (₹, excl. GST)"
            required
            hint="Enter 0 for products that are quoted rather than priced."
          >
<Input name="listPrice" inputMode="decimal" defaultValue={toMajor(variant?.listPriceMinor ?? null)} required />
</Field>
          <Field name="salePrice"
            label="Sale price (₹, excl. GST)"
            hint="Must be lower than the list price. Leave blank for no discount."
          >
<Input name="salePrice" inputMode="decimal" defaultValue={toMajor(variant?.salePriceMinor ?? null)} />
</Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="isDefault"
              defaultChecked={variant?.isDefault}
              label="Show this option first on the product page"
            />
          </div>
        </div>
    </AdminForm>
  );
}
