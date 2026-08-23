import Link from "next/link";
import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { RenewalCalendar } from "@/components/portal/renewal-calendar";
import { requireCapability } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  REMINDER_DAYS,
  RENEWAL_OPEN_STATUSES,
  daysUntil,
  renewalSummary,
  renewalUrgency,
  URGENCY_LABELS,
  URGENCY_TONES,
} from "@/lib/renewals";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Renewals" };

/**
 * The renewal book.
 *
 * The cadence in the brief is a set of points at which somebody should have a
 * conversation — 120 days out to plan, 7 days out to chase. This is the list
 * that makes those conversations possible: everything still open, soonest
 * first, with the ones that have gone past their date at the top rather than
 * buried at the bottom of an ascending sort.
 *
 * No reminders are sent from here. Nothing in this deployment sends a scheduled
 * email yet, and a dashboard that implied otherwise would be worse than one
 * that says plainly whose job it is.
 */
export default async function AdminRenewalsPage() {
  await requireCapability("customers.read");

  const renewals = await prisma.renewal.findMany({
    where: { status: { in: RENEWAL_OPEN_STATUSES } },
    orderBy: { dueAt: "asc" },
    take: 300,
    select: {
      id: true,
      reference: true,
      status: true,
      dueAt: true,
      seats: true,
      quotedMinor: true,
      licence: {
        select: {
          productName: true,
          sku: true,
          company: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (renewals.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl">Renewals</h1>
        </header>
        <EmptyState
          title="Nothing due"
          description="Renewal records are created when an order with a subscription term is fulfilled."
        />
      </div>
    );
  }

  const overdue = renewals.filter((renewal) => daysUntil(renewal.dueAt) < 0);
  const thisMonth = renewals.filter((renewal) => {
    const days = daysUntil(renewal.dueAt);
    return days >= 0 && days <= 30;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Renewals</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {renewals.length} open. {overdue.length} past due, {thisMonth.length} within the month.
          The review points are {REMINDER_DAYS.join(", ")} days out; nothing on this page sends
          anything by itself.
        </p>
      </header>

      <section className="rounded-[--radius-lg] border border-line bg-white p-5">
        <h2 className="mb-4 text-[1.05rem]">The year ahead</h2>
        <RenewalCalendar renewals={renewals} />
      </section>

      <TableWrap>
        <Table className="min-w-[56rem]">
          <thead>
            <tr>
              <Th>Due</Th>
              <Th>When</Th>
              <Th>Customer</Th>
              <Th>Product</Th>
              <Th>Seats</Th>
              <Th>Quoted</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((renewal) => {
              const urgency = renewalUrgency(renewal.dueAt);
              return (
                <Tr key={renewal.id}>
                  <Td>{formatDate(renewal.dueAt)}</Td>
                  <Td>
                    <Badge tone={URGENCY_TONES[urgency]}>{URGENCY_LABELS[urgency]}</Badge>
                    <span className="mt-0.5 block text-[11px] text-ink-500">
                      {renewalSummary(renewal.dueAt)}
                    </span>
                  </Td>
                  <Td className="text-[13px]">
                    {renewal.licence.company?.name ?? renewal.licence.user?.name ?? "—"}
                    {renewal.licence.user?.email ? (
                      <span className="mt-0.5 block text-[11px] text-ink-500">
                        {renewal.licence.user.email}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="font-medium text-graphite-900">
                    {renewal.licence.productName}
                    <span className="mt-0.5 block font-mono text-[11px] font-normal text-ink-500">
                      {renewal.licence.sku}
                    </span>
                  </Td>
                  <Td className="tabular-nums">{renewal.seats}</Td>
                  <Td className="tabular-nums">
                    {renewal.quotedMinor != null ? formatMoney(renewal.quotedMinor) : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={renewal.status} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      </TableWrap>

      <p className="text-[13px] text-ink-500">
        Raise a renewal quotation from{" "}
        <Link href="/admin/quotes" className="text-accent-700 hover:underline">
          Quotes
        </Link>
        , against the customer&rsquo;s existing licence.
      </p>
    </div>
  );
}
