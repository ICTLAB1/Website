import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { WarrantyBadge } from "@/components/portal/warranty-badge";
import { raiseDeviceTicket, removeDevice, updateDevice } from "@/app/account/devices/actions";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { DEVICE_STATUSES, getDeviceFor } from "@/lib/device-service";
import {
  DEVICE_STATUS_LABELS,
  WARRANTY_HINTS,
  warrantyDaysLeft,
  warrantyState,
} from "@/lib/warranty";
import { dateInputValue, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Device" };

type PageProps = { params: Promise<{ reference: string }> };

/**
 * One device.
 *
 * The warranty statement at the top is the reason the page exists, and it is
 * written to be read by somebody deciding whether to ring us or to raise a
 * purchase order. Where the end date is missing it says so and asks for it,
 * rather than guessing a year from the purchase date — a guess here is the
 * difference between a free repair and an invoice.
 */
export default async function AccountDevicePage({ params }: PageProps) {
  const { reference } = await params;
  const user = await requireUser(`/account/devices/${reference}`);

  const device = await getDeviceFor(user, reference);
  if (!device) notFound();

  const mayWrite = canInCompany(user, "service.act");
  const state = warrantyState(device);
  const daysLeft = warrantyDaysLeft(device);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/account/devices" className="text-[13px] text-accent-700 hover:underline">
          &larr; All devices
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[1.35rem] text-graphite-900">
            {device.brandName} {device.model}
          </h2>
          <div className="flex flex-wrap gap-2">
            <WarrantyBadge device={device} />
            <StatusBadge status={device.status} />
          </div>
        </div>
        <p className="mt-1.5 font-mono text-[13px] text-ink-500">{device.reference}</p>
      </div>

      <section className="rounded-[--radius-lg] border border-line bg-white p-5">
        <h3 className="text-[15px] font-semibold text-graphite-900">Warranty</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{WARRANTY_HINTS[state]}</p>
        <dl className="mt-4 space-y-2 text-[13px]">
          {[
            ["Starts", device.warrantyStartsAt ? formatDate(device.warrantyStartsAt) : "Not recorded"],
            ["Ends", device.warrantyEndsAt ? formatDate(device.warrantyEndsAt) : "Not recorded"],
            [
              "Remaining",
              daysLeft == null
                ? "Not recorded"
                : daysLeft < 0
                  ? `Ended ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "day" : "days"} ago`
                  : `${daysLeft} ${daysLeft === 1 ? "day" : "days"}`,
            ],
            ["Terms", device.warrantyNote ?? "Not recorded"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-24 shrink-0 text-ink-500">{label}</dt>
              <dd className="min-w-0 break-words text-ink-700">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
        <h3 className="text-[15px] font-semibold text-graphite-900">Details</h3>
        <dl className="mt-3 space-y-2 text-[13px]">
          {[
            ["Serial", device.serial ?? "Not recorded"],
            ["Asset tag", device.assetTag ?? "—"],
            ["Assigned to", device.assignedTo ?? "—"],
            ["Department", device.department ?? "—"],
            ["Location", device.location ?? "—"],
            ["Purchased", device.purchasedAt ? formatDate(device.purchasedAt) : "Not recorded"],
            ["From order", device.order?.reference ?? "—"],
            ["Notes", device.notes ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-28 shrink-0 text-ink-500">{label}</dt>
              <dd className="min-w-0 whitespace-pre-line break-words text-ink-700">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {device.tickets.length > 0 ? (
        <section>
          <h3 className="mb-3 text-[15px] font-semibold text-graphite-900">Support history</h3>
          <ul className="space-y-2">
            {device.tickets.map((ticket) => (
              <li
                key={ticket.reference}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[--radius-md] border border-line bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/account/support/${ticket.reference}`}
                    className="text-[13px] font-medium text-graphite-900 underline underline-offset-2 hover:text-accent-700"
                  >
                    {ticket.subject}
                  </Link>
                  <span className="mt-0.5 block font-mono text-[11px] text-ink-500">
                    {ticket.reference} · {formatDate(ticket.createdAt)}
                  </span>
                </div>
                <StatusBadge status={ticket.status} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {mayWrite ? (
        <>
          <section className="max-w-xl rounded-[--radius-lg] border border-accent-600/30 bg-accent-50/40 p-5">
            <h3 className="text-[15px] font-semibold text-graphite-900">
              Raise a ticket about this device
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              The make, model and serial number go with it, so nobody has to ask you for them.
            </p>
            <div className="mt-5">
              <AccountForm
                action={raiseDeviceTicket}
                submitLabel="Raise ticket"
                pendingLabel="Raising…"
                hidden={{ reference: device.reference }}
              >
                <Field label="What is wrong" name="subject" required>
                  <Input name="subject" required maxLength={160} />
                </Field>
                <Field label="Tell us more" name="message" required>
                  <Textarea name="message" rows={5} maxLength={4000} required />
                </Field>
              </AccountForm>
            </div>
          </section>

          <section className="max-w-2xl rounded-[--radius-lg] border border-line bg-white p-5">
            <h3 className="text-[15px] font-semibold text-graphite-900">Edit this device</h3>
            <div className="mt-5">
              <AccountForm
                action={updateDevice}
                submitLabel="Save changes"
                pendingLabel="Saving…"
                hidden={{ reference: device.reference }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Make" name="brandName" required>
                    <Input name="brandName" required maxLength={80} defaultValue={device.brandName} />
                  </Field>
                  <Field label="Model" name="model" required>
                    <Input name="model" required maxLength={120} defaultValue={device.model} />
                  </Field>
                  <Field label="Serial number" name="serial">
                    <Input name="serial" maxLength={80} defaultValue={device.serial ?? ""} />
                  </Field>
                  <Field label="Your asset tag" name="assetTag">
                    <Input name="assetTag" maxLength={80} defaultValue={device.assetTag ?? ""} />
                  </Field>
                  <Field label="Assigned to" name="assignedTo">
                    <Input name="assignedTo" maxLength={120} defaultValue={device.assignedTo ?? ""} />
                  </Field>
                  <Field label="Department" name="department">
                    <Input name="department" maxLength={120} defaultValue={device.department ?? ""} />
                  </Field>
                  <Field label="Location" name="location">
                    <Input name="location" maxLength={120} defaultValue={device.location ?? ""} />
                  </Field>
                  <Field label="Status" name="status">
                    <Select name="status" defaultValue={device.status}>
                      {DEVICE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {DEVICE_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Purchased" name="purchasedAt">
                    <Input
                      name="purchasedAt"
                      type="date"
                      defaultValue={dateInputValue(device.purchasedAt)}
                    />
                  </Field>
                  <Field label="Warranty starts" name="warrantyStartsAt">
                    <Input
                      name="warrantyStartsAt"
                      type="date"
                      defaultValue={dateInputValue(device.warrantyStartsAt)}
                    />
                  </Field>
                  <Field label="Warranty ends" name="warrantyEndsAt">
                    <Input
                      name="warrantyEndsAt"
                      type="date"
                      defaultValue={dateInputValue(device.warrantyEndsAt)}
                    />
                  </Field>
                  <Field label="Warranty note" name="warrantyNote">
                    <Input
                      name="warrantyNote"
                      maxLength={300}
                      defaultValue={device.warrantyNote ?? ""}
                    />
                  </Field>
                </div>
                <Field label="Notes" name="notes">
                  <Textarea name="notes" rows={3} maxLength={2000} defaultValue={device.notes ?? ""} />
                </Field>
              </AccountForm>
            </div>
          </section>

          <section className="max-w-xl rounded-[--radius-lg] border border-danger-600/30 bg-danger-50/40 p-5">
            <h3 className="text-[15px] font-semibold text-danger-700">
              Take this off the register
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
              Removes it from your list. Any tickets raised against it are kept, so the support
              history of a machine you have disposed of does not vanish with it.
            </p>
            <div className="mt-4">
              <AccountForm
                action={removeDevice}
                submitLabel="Remove device"
                pendingLabel="Removing…"
                variant="danger"
                hidden={{ reference: device.reference }}
                compact
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
