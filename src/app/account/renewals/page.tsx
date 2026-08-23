import type { Metadata } from "next";

import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { RenewalCalendar } from "@/components/portal/renewal-calendar";
import { requireUser } from "@/lib/auth/guards";
import { listUserRenewals } from "@/lib/queries/account";
import {
  REMINDER_DAYS,
  RENEWAL_OPEN_STATUSES,
  renewalSummary,
  renewalUrgency,
  URGENCY_LABELS,
  URGENCY_TONES,
} from "@/lib/renewals";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Renewals" };

/**
 * When things run out, and how soon that matters.
 *
 * A table of dates is not a plan. What a procurement officer needs in October
 * is to see that January is heavy and February is empty, and what they need in
 * the last week of a term is for the thing expiring on Friday to be impossible
 * to miss. So: the urgent ones stated in words at the top, the year ahead as a
 * shape, and the full table underneath for the detail.
 *
 * Nothing here renews anything. A renewal is a decision, and a portal that
 * quietly rolls a licence over at last year's seat count is how a customer
 * finds they have been paying for forty seats they stopped using in March.
 */
export default async function AccountRenewalsPage() {
  const user = await requireUser("/account/renewals");
  const renewals = await listUserRenewals(user);

  if (renewals.length === 0) {
    return (
      <EmptyState
        title="No renewals scheduled"
        description="Upcoming renewal dates appear here with a review window ahead of each one, so nothing renews at last year's count by default."
        action={<ButtonLink href="/services/licence-management">Licence management</ButtonLink>}
      />
    );
  }

  const open = renewals.filter((renewal) => RENEWAL_OPEN_STATUSES.includes(renewal.status));
  const pressing = open.filter((renewal) => {
    const urgency = renewalUrgency(renewal.dueAt);
    return urgency === "overdue" || urgency === "critical" || urgency === "soon";
  });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-[1.15rem]">Renewals</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          We review each of these with you before it falls due — at{" "}
          {REMINDER_DAYS.slice(0, -1).join(", ")} and {REMINDER_DAYS.at(-1)} days out — so a term
          ends because you decided it should, not because nobody noticed.
        </p>
      </section>

      {pressing.length > 0 ? (
        <section>
          <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">Needs a decision</h3>
          <ul className="space-y-2">
            {pressing.map((renewal) => {
              const urgency = renewalUrgency(renewal.dueAt);
              return (
                <li
                  key={renewal.reference}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[--radius-md] border border-line bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-graphite-900">
                      {renewal.licence.productName}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      {renewal.seats} {renewal.seats === 1 ? "seat" : "seats"} ·{" "}
                      {renewalSummary(renewal.dueAt)} · {formatDate(renewal.dueAt)}
                    </p>
                  </div>
                  <Badge tone={URGENCY_TONES[urgency]}>{URGENCY_LABELS[urgency]}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {open.length > 0 ? (
        <section>
          <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">The year ahead</h3>
          <RenewalCalendar renewals={open} />
          <p className="mt-3 text-[12px] text-ink-500">
            Months with nothing due are shown empty rather than left out, so a quiet month is
            visibly quiet.
          </p>
        </section>
      ) : null}

      <section>
        <h3 className="mb-4 text-[15px] font-semibold text-graphite-900">All renewals</h3>
        <TableWrap>
          <Table className="min-w-[46rem]">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Due</Th>
                <Th>When</Th>
                <Th>Seats</Th>
                <Th>Quoted</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((renewal) => (
                <Tr key={renewal.reference}>
                  <Td className="font-medium text-graphite-900">{renewal.licence.productName}</Td>
                  <Td className="font-mono text-[12px]">{renewal.licence.sku}</Td>
                  <Td>{formatDate(renewal.dueAt)}</Td>
                  <Td className="text-[13px] text-ink-600">
                    {RENEWAL_OPEN_STATUSES.includes(renewal.status)
                      ? renewalSummary(renewal.dueAt)
                      : "—"}
                  </Td>
                  <Td className="tabular-nums">{renewal.seats}</Td>
                  <Td className="tabular-nums">
                    {renewal.quotedMinor != null ? formatMoney(renewal.quotedMinor) : "—"}
                  </Td>
                  <Td>
                    <StatusBadge status={renewal.status} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </section>
    </div>
  );
}
