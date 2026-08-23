import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { WarrantyBadge } from "@/components/portal/warranty-badge";
import { recordDevice } from "@/app/account/devices/actions";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { DEVICE_STATUSES, listDevicesFor } from "@/lib/device-service";
import {
  DEVICE_STATUS_LABELS,
  WARRANTY_HINTS,
  WARRANTY_LABELS,
  warrantyState,
  type WarrantyState,
} from "@/lib/warranty";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Devices" };

/**
 * The customer's device register.
 *
 * Sorted so the machines that need a decision are at the top and the ones with
 * no warranty date on file are at the bottom — visible, counted, and described
 * as "not recorded" rather than as out of cover. That distinction is the whole
 * point of the page: the honest answer to a missing date is that nobody has
 * entered one, and a register that guessed would send somebody to buy an
 * extension they may already have.
 */
export default async function AccountDevicesPage() {
  const user = await requireUser("/account/devices");
  const devices = await listDevicesFor(user);
  const mayWrite = canInCompany(user, "service.act");

  const counts = devices.reduce<Record<WarrantyState, number>>(
    (tally, device) => {
      tally[warrantyState(device)] += 1;
      return tally;
    },
    { active: 0, expiring: 0, expired: 0, unknown: 0 },
  );

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-[1.15rem]">Devices</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          What your organisation has, and what is still covered. A ticket raised from a device
          carries its serial number with it, which saves the exchange that usually costs a day.
        </p>

        {devices.length > 0 ? (
          <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["active", "expiring", "expired", "unknown"] as const).map((state) => (
              <div key={state} className="rounded-[--radius-lg] border border-line bg-white p-4">
                <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  {WARRANTY_LABELS[state]}
                </dt>
                <dd className="mt-1 text-[1.4rem] font-semibold tabular-nums text-graphite-900">
                  {counts[state]}
                </dd>
                <p className="mt-1 text-[12px] leading-snug text-ink-500">
                  {WARRANTY_HINTS[state]}
                </p>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {devices.length === 0 ? (
        <EmptyState
          title="Nothing on the register yet"
          description="Add the machines you would like us to support. We can also load them for you from a delivery — ask, and we will."
        />
      ) : (
        <section>
          <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">
            {devices.length} {devices.length === 1 ? "device" : "devices"}
          </h3>
          <TableWrap>
            <Table className="min-w-[46rem]">
              <thead>
                <tr>
                  <Th>Device</Th>
                  <Th>Serial</Th>
                  <Th>Assigned to</Th>
                  <Th>Warranty ends</Th>
                  <Th>Warranty</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <Tr key={device.reference}>
                    <Td className="font-medium text-graphite-900">
                      <Link
                        href={`/account/devices/${device.reference}`}
                        className="underline underline-offset-2 hover:text-accent-700"
                      >
                        {device.brandName} {device.model}
                      </Link>
                      <span className="mt-0.5 block font-mono text-[11px] font-normal text-ink-500">
                        {device.reference}
                      </span>
                    </Td>
                    <Td className="font-mono text-[12px]">{device.serial ?? "—"}</Td>
                    <Td>{device.assignedTo ?? "—"}</Td>
                    <Td>{device.warrantyEndsAt ? formatDate(device.warrantyEndsAt) : "Not recorded"}</Td>
                    <Td>
                      <WarrantyBadge device={device} />
                    </Td>
                    <Td>
                      <StatusBadge status={device.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </section>
      )}

      {mayWrite ? (
        <section className="max-w-2xl rounded-[--radius-lg] border border-line bg-white p-5">
          <h3 className="text-[15px] font-semibold text-graphite-900">Add a device</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            Only the make and model are required. Leave a date blank if you do not have it —
            we would rather show &ldquo;not recorded&rdquo; than a date nobody checked.
          </p>

          <div className="mt-5">
            <AccountForm action={recordDevice} submitLabel="Add device" pendingLabel="Adding…">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Make" name="brandName" required>
                  <Input name="brandName" required maxLength={80} placeholder="HP" />
                </Field>
                <Field label="Model" name="model" required>
                  <Input name="model" required maxLength={120} placeholder="ProBook 450 G10" />
                </Field>
                <Field label="Serial number" name="serial" hint="What a warranty claim needs.">
                  <Input name="serial" maxLength={80} />
                </Field>
                <Field label="Your asset tag" name="assetTag">
                  <Input name="assetTag" maxLength={80} />
                </Field>
                <Field label="Assigned to" name="assignedTo">
                  <Input name="assignedTo" maxLength={120} />
                </Field>
                <Field label="Department" name="department">
                  <Input name="department" maxLength={120} />
                </Field>
                <Field label="Location" name="location">
                  <Input name="location" maxLength={120} />
                </Field>
                <Field label="Status" name="status">
                  <Select name="status" defaultValue="IN_SERVICE">
                    {DEVICE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {DEVICE_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Purchased" name="purchasedAt">
                  <Input name="purchasedAt" type="date" />
                </Field>
                <Field label="Warranty starts" name="warrantyStartsAt">
                  <Input name="warrantyStartsAt" type="date" />
                </Field>
                <Field label="Warranty ends" name="warrantyEndsAt">
                  <Input name="warrantyEndsAt" type="date" />
                </Field>
                <Field label="Warranty note" name="warrantyNote">
                  <Input name="warrantyNote" maxLength={300} placeholder="On-site next business day" />
                </Field>
              </div>
              <Field label="Notes" name="notes">
                <Textarea name="notes" rows={3} maxLength={2000} />
              </Field>
            </AccountForm>
          </div>
        </section>
      ) : (
        <p className="rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-[13px] text-ink-600">
          Your access is read-only. A colleague with IT or procurement access can add a device.
        </p>
      )}
    </div>
  );
}
