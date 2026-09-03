"use client";

import type { DeviceStatus } from "@prisma/client";
import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { updateDevice } from "@/app/admin/service-actions";
import { DEVICE_STATUS_LABELS } from "@/lib/warranty";

// Not imported from lib/device-service: that module is server-only (it also
// carries parseDeviceForm, which touches Prisma types), and pulling it into
// this client component would drag "server-only" into the browser bundle.
// Same pattern as variant-form.tsx's own LICENCE_TYPES — the enum's values,
// copied rather than imported.
const DEVICE_STATUSES: DeviceStatus[] = ["IN_SERVICE", "IN_STOCK", "IN_REPAIR", "RETIRED", "LOST"];

export type DeviceFormValues = {
  id: string;
  brandName: string;
  model: string;
  serial: string | null;
  assetTag: string | null;
  status: string;
  purchasedAt: Date | string | null;
  warrantyStartsAt: Date | string | null;
  warrantyEndsAt: Date | string | null;
  warrantyNote: string | null;
  assignedTo: string | null;
  department: string | null;
  location: string | null;
  notes: string | null;
};

function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function DeviceForm({ device }: { device: DeviceFormValues }) {
  return (
    <AdminForm
      action={updateDevice}
      submitLabel="Save device"
      pendingLabel="Saving…"
      hidden={{ deviceId: device.id }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" name="status">
          <Select name="status" defaultValue={device.status}>
            {DEVICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {DEVICE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Make" name="brandName" required>
          <Input name="brandName" defaultValue={device.brandName} required maxLength={80} />
        </Field>
        <Field label="Model" name="model" required>
          <Input name="model" defaultValue={device.model} required maxLength={120} />
        </Field>
        <Field label="Serial number" name="serial">
          <Input name="serial" defaultValue={device.serial ?? ""} maxLength={80} />
        </Field>
        <Field label="Asset tag" name="assetTag">
          <Input name="assetTag" defaultValue={device.assetTag ?? ""} maxLength={80} />
        </Field>
        <Field label="Assigned to" name="assignedTo">
          <Input name="assignedTo" defaultValue={device.assignedTo ?? ""} maxLength={120} />
        </Field>
        <Field label="Department" name="department">
          <Input name="department" defaultValue={device.department ?? ""} maxLength={120} />
        </Field>
        <Field label="Location" name="location">
          <Input name="location" defaultValue={device.location ?? ""} maxLength={120} />
        </Field>
        <Field label="Purchased" name="purchasedAt">
          <Input name="purchasedAt" type="date" defaultValue={toDateInput(device.purchasedAt)} />
        </Field>
        <Field label="Warranty starts" name="warrantyStartsAt">
          <Input name="warrantyStartsAt" type="date" defaultValue={toDateInput(device.warrantyStartsAt)} />
        </Field>
        <Field label="Warranty ends" name="warrantyEndsAt">
          <Input name="warrantyEndsAt" type="date" defaultValue={toDateInput(device.warrantyEndsAt)} />
        </Field>
        <Field label="Warranty note" name="warrantyNote">
          <Input name="warrantyNote" defaultValue={device.warrantyNote ?? ""} maxLength={300} />
        </Field>
      </div>
      <Field label="Notes" name="notes">
        <Textarea name="notes" rows={3} defaultValue={device.notes ?? ""} maxLength={2000} />
      </Field>
    </AdminForm>
  );
}
