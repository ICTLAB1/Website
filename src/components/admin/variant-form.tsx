"use client";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { saveVariant } from "@/app/admin/actions";

export type VariantFormValues = {
  id: string;
  sku: string;
  name: string;
  licenceType: string;
  audience: string;
  termMonths: number | null;
  seats: number;
  listPriceMinor: number;
  salePriceMinor: number | null;
  gstRatePercent: number;
  isDefault: boolean;
  partNumber: string | null;
  processor: string | null;
  memory: string | null;
  storage: string | null;
  graphics: string | null;
  operatingSystem: string | null;
  opticalDrive: string | null;
  powerSupply: string | null;
  warranty: string | null;
  raidController: string | null;
  systemManagement: string | null;
  configNote: string | null;
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
  "HARDWARE",
];

const AUDIENCES = ["COMMERCIAL", "EDUCATION", "NON_PROFIT"];

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
          <Field name="audience"
            label="Audience"
            hint="Education and non-profit pricing is only shown to a buyer a member of staff has confirmed as eligible."
          >
<Select name="audience" defaultValue={variant?.audience ?? "COMMERCIAL"}>
                {AUDIENCES.map((value) => (
                  <option key={value} value={value}>
                    {value
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
            hint="Leave blank for a perpetual licence, and for hardware."
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

        {/*
          Hardware configuration — all free text, all optional, and all left
          blank on a software licence. A line card says "16GB DDR5 RAM" and "2
          X 16GB DDR5 RAM"; those are different machines, so nothing here is
          parsed into a number. Collapsed by default so the common case
          (editing a licence) isn't asked to skip past twelve blank fields —
          open by default only when the variant already has hardware data.
        */}
        <details
          className="mt-6 rounded-[--radius-md] border border-line bg-surface-muted p-4"
          open={Boolean(variant?.processor || variant?.memory || variant?.storage || variant?.partNumber)}
        >
          <summary className="cursor-pointer text-[13px] font-medium text-graphite-900">
            Hardware configuration
          </summary>
          <p className="mt-2 text-[12px] text-ink-500">
            Leave every field below blank for a licence. Fill them in only for a hardware build —
            set licence type to Hardware above.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="partNumber" label="Manufacturer part number">
              <Input name="partNumber" defaultValue={variant?.partNumber ?? ""} className="font-mono" />
            </Field>
            <Field name="processor" label="Processor">
              <Input name="processor" defaultValue={variant?.processor ?? ""} />
            </Field>
            <Field name="memory" label="Memory">
              <Input name="memory" defaultValue={variant?.memory ?? ""} placeholder="16GB DDR5 RAM" />
            </Field>
            <Field name="storage" label="Storage">
              <Input name="storage" defaultValue={variant?.storage ?? ""} placeholder="512GB SSD" />
            </Field>
            <Field name="graphics" label="Graphics" hint="Workstations. Leave blank for a server.">
              <Input name="graphics" defaultValue={variant?.graphics ?? ""} />
            </Field>
            <Field name="operatingSystem" label="Operating system">
              <Input name="operatingSystem" defaultValue={variant?.operatingSystem ?? ""} />
            </Field>
            <Field name="opticalDrive" label="Optical drive">
              <Input name="opticalDrive" defaultValue={variant?.opticalDrive ?? ""} />
            </Field>
            <Field name="powerSupply" label="Power supply">
              <Input name="powerSupply" defaultValue={variant?.powerSupply ?? ""} />
            </Field>
            <Field name="warranty" label="Warranty">
              <Input name="warranty" defaultValue={variant?.warranty ?? ""} placeholder="3 years onsite" />
            </Field>
            <Field name="raidController" label="RAID controller" hint="Servers. Leave blank for a workstation.">
              <Input name="raidController" defaultValue={variant?.raidController ?? ""} />
            </Field>
            <Field name="systemManagement" label="System management" hint="Servers — the management processor.">
              <Input name="systemManagement" defaultValue={variant?.systemManagement ?? ""} />
            </Field>
            <Field name="configNote" label="Configuration note" hint="e.g. &ldquo;Made in India&rdquo;, &ldquo;Modified&rdquo;.">
              <Input name="configNote" defaultValue={variant?.configNote ?? ""} />
            </Field>
          </div>
        </details>
    </AdminForm>
  );
}
