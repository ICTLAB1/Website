import Link from "next/link";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { WarrantyBadge } from "@/components/portal/warranty-badge";
import { recordDeviceForCompany } from "@/app/admin/service-actions";
import { requireCapability } from "@/lib/auth/guards";
import { can } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";
import { DEVICE_STATUSES } from "@/lib/device-service";
import { DEVICE_STATUS_LABELS, WARRANTY_LABELS } from "@/lib/warranty";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Devices" };

const FILTERS = ["expiring", "expired", "unknown"] as const;

type PageProps = { searchParams: Promise<{ warranty?: string; company?: string }> };

/**
 * Every device we have been told about, across every customer.
 *
 * The filter that earns its place is "warranty not recorded". It is the list of
 * machines we cannot answer a question about, and it is the only one on this
 * page that represents work for us rather than for the customer: every row is
 * a serial number and a date somebody could go and find.
 */
export default async function AdminDevicesPage({ searchParams }: PageProps) {
  const staff = await requireCapability("customers.read");
  const params = await searchParams;
  const filter = FILTERS.includes(params.warranty as (typeof FILTERS)[number])
    ? (params.warranty as (typeof FILTERS)[number])
    : undefined;

  const now = new Date();
  const soon = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const where =
    filter === "unknown"
      ? { deletedAt: null, warrantyEndsAt: null }
      : filter === "expired"
        ? { deletedAt: null, warrantyEndsAt: { lt: now } }
        : filter === "expiring"
          ? { deletedAt: null, warrantyEndsAt: { gte: now, lte: soon } }
          : { deletedAt: null };

  const [devices, companies, total] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: [{ warrantyEndsAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        reference: true,
        brandName: true,
        model: true,
        serial: true,
        status: true,
        warrantyEndsAt: true,
        assignedTo: true,
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, take: 500, select: { id: true, name: true } }),
    prisma.device.count({ where: { deletedAt: null } }),
  ]);

  const mayWrite = can(staff, "customers.write");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Devices</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {total} on the register across all customers. A device with no warranty end date is
          shown as not recorded — never as out of warranty.
        </p>
      </header>

      <div className="scroll-x">
        <div className="flex min-w-max gap-1">
          <Link
            href="/admin/devices"
            className={cn(
              "rounded-[--radius-md] px-3 py-2 text-[13px]",
              !filter ? "bg-graphite-900 font-medium text-white" : "text-ink-600 hover:bg-white",
            )}
          >
            All
          </Link>
          {FILTERS.map((entry) => (
            <Link
              key={entry}
              href={`/admin/devices?warranty=${entry}`}
              className={cn(
                "rounded-[--radius-md] px-3 py-2 text-[13px]",
                filter === entry
                  ? "bg-graphite-900 font-medium text-white"
                  : "text-ink-600 hover:bg-white",
              )}
            >
              {WARRANTY_LABELS[entry]}
            </Link>
          ))}
        </div>
      </div>

      {devices.length === 0 ? (
        <EmptyState
          title="Nothing here"
          description="Devices appear as customers add them, or as we record them against a delivery."
        />
      ) : (
        <TableWrap>
          <Table className="min-w-[52rem]">
            <thead>
              <tr>
                <Th>Device</Th>
                <Th>Organisation</Th>
                <Th>Serial</Th>
                <Th>Assigned to</Th>
                <Th>Warranty ends</Th>
                <Th>Warranty</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <Tr key={device.id}>
                  <Td className="font-medium text-graphite-900">
                    {device.brandName} {device.model}
                    <span className="mt-0.5 block font-mono text-[11px] font-normal text-ink-500">
                      {device.reference}
                    </span>
                  </Td>
                  <Td className="text-[13px]">{device.company?.name ?? "—"}</Td>
                  <Td className="font-mono text-[12px]">{device.serial ?? "—"}</Td>
                  <Td className="text-[13px]">{device.assignedTo ?? "—"}</Td>
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
      )}

      {mayWrite && companies.length > 0 ? (
        <section className="max-w-3xl rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[1.05rem]">Record a device for a customer</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
            For a delivery being entered on the customer&rsquo;s behalf. Leave a date blank rather
            than assuming a warranty term — the customer sees these dates and will act on them.
          </p>

          <div className="mt-5">
            <AdminForm
              action={recordDeviceForCompany}
              submitLabel="Record device"
              pendingLabel="Saving…"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organisation" name="companyId" required>
                  <Select name="companyId" required defaultValue="">
                    <option value="" disabled>
                      Choose an organisation
                    </option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
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
                <Field label="Make" name="brandName" required>
                  <Input name="brandName" required maxLength={80} />
                </Field>
                <Field label="Model" name="model" required>
                  <Input name="model" required maxLength={120} />
                </Field>
                <Field label="Serial number" name="serial">
                  <Input name="serial" maxLength={80} />
                </Field>
                <Field label="Asset tag" name="assetTag">
                  <Input name="assetTag" maxLength={80} />
                </Field>
                <Field label="Assigned to" name="assignedTo">
                  <Input name="assignedTo" maxLength={120} />
                </Field>
                <Field label="Location" name="location">
                  <Input name="location" maxLength={120} />
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
                  <Input name="warrantyNote" maxLength={300} />
                </Field>
              </div>
              <Field label="Notes" name="notes">
                <Textarea name="notes" rows={3} maxLength={2000} />
              </Field>
            </AdminForm>
          </div>
        </section>
      ) : null}
    </div>
  );
}
