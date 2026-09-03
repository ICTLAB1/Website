import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DeviceForm } from "@/components/admin/device-form";
import { AdminForm } from "@/components/admin/admin-form";
import { DangerZone } from "@/components/admin/danger-zone";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { archiveDevice } from "@/app/admin/service-actions";
import { DELETABLE } from "@/lib/admin/deletable";
import { isAdmin, requireCapability } from "@/lib/auth/guards";
import { can } from "@/lib/auth/capabilities";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Device" };

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminDeviceDetailPage({ params }: PageProps) {
  const staff = await requireCapability("customers.read");
  const mayWrite = can(staff, "customers.write");
  const { id } = await params;

  const device = await prisma.device.findUnique({
    where: { id },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!device) notFound();

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/devices" className="text-[13px] text-accent-700 hover:underline">
            &larr; Devices
          </Link>
          <h1 className="mt-2 text-2xl">
            {device.brandName} {device.model}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
            <span className="font-mono">{device.reference}</span>
            <StatusBadge status={device.status} />
            {device.deletedAt ? <Badge tone="warning">Removed from register</Badge> : null}
          </p>
          {device.company ? (
            <p className="mt-1.5 text-[13px] text-ink-600">
              Belongs to{" "}
              <Link href={`/admin/organisations/${device.company.id}`} className="text-accent-700 hover:underline">
                {device.company.name}
              </Link>
            </p>
          ) : null}
          <p className="mt-1 text-[12px] text-ink-400">
            Recorded {formatDate(device.createdAt)} &middot; Last updated {formatDate(device.updatedAt)}
          </p>
        </div>
        {mayWrite ? (
          <AdminForm
            action={archiveDevice}
            submitLabel={device.deletedAt ? "Restore to register" : "Remove from register"}
            pendingLabel="Saving…"
            variant={device.deletedAt ? "outline" : "danger"}
            hidden={{ deviceId: device.id, archived: device.deletedAt ? "true" : "false" }}
          />
        ) : null}
      </header>

      <section>
        {mayWrite ? (
          <DeviceForm device={device} />
        ) : (
          <p className="text-[13px] text-ink-500">Your role does not include changing this.</p>
        )}
      </section>

      {isAdmin(staff) ? (
        <DangerZone
          config={DELETABLE.devices}
          id={device.id}
          reference={device.reference}
          // The archive/restore control above already covers the reversible
          // removal; this is only for the permanent one.
          showArchive={false}
        />
      ) : null}
    </div>
  );
}
