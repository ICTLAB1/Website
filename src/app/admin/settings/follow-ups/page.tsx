import Link from "next/link";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { saveFollowUpSettings } from "@/app/admin/follow-up-settings-actions";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getFollowUpSettings } from "@/lib/quotes/follow-ups";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Quotation follow-ups" };

/**
 * How often a customer who has not answered gets chased.
 *
 * ## The screen says whether anything is actually running
 *
 * Saving a schedule does not send anything: the sequence runs when a scheduler
 * calls the follow-up route, and a business whose cron line was never added
 * would otherwise sit here believing its quotations were being chased. So the
 * top of this page reports the last run recorded in the follow-up table rather
 * than the setting — the same evidence a person would look for themselves.
 *
 * ## Off by default, and it stays off until somebody decides
 *
 * The defaults are a schedule and a switch that is not on. Turning it on is a
 * commercial decision with a customer on the other end of it, and it is not one
 * a deploy should make for anybody.
 */
export default async function AdminFollowUpSettingsPage() {
  await requireAdmin();

  const [settings, recent, counts] = await Promise.all([
    getFollowUpSettings(),
    prisma.quoteFollowUp.findMany({
      orderBy: { sentAt: "desc" },
      take: 15,
      select: {
        id: true,
        kind: true,
        step: true,
        toEmail: true,
        sentAt: true,
        delivered: true,
        sentBy: { select: { name: true } },
        quote: { select: { reference: true } },
      },
    }),
    prisma.quoteFollowUp.groupBy({ by: ["kind"], _count: true }),
  ]);

  const automatic = counts.find((row) => row.kind === "AUTOMATIC")?._count ?? 0;
  const manual = counts.find((row) => row.kind === "MANUAL")?._count ?? 0;
  const lastAutomatic = recent.find((row) => row.kind === "AUTOMATIC");

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/settings" className="text-[13px] text-accent-700 hover:underline">
          &larr; Settings
        </Link>
        <h1 className="mt-2 text-page">Quotation follow-ups</h1>
        <p className="mt-2 max-w-2xl text-body text-ink-600">
          A quotation that has been sent and not answered is chased on this schedule. Anyone in
          sales can also send one by hand from the quotation itself, at any time, whatever is set
          here.
        </p>
      </header>

      <section className="rounded-[--radius-lg] border border-line bg-white p-5">
        <h2 className="text-[1.05rem]">What is happening now</h2>
        <dl className="mt-3 grid gap-3 text-meta sm:grid-cols-3">
          <div>
            <dt className="text-ink-500">Automatic follow-ups</dt>
            <dd className="text-graphite-900">{settings.enabled ? "On" : "Off"}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Sent so far</dt>
            <dd className="text-graphite-900">
              {automatic} automatic, {manual} by hand
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Last automatic follow-up</dt>
            {/*
              The evidence, not the setting. A schedule saved with nothing
              calling the route sends nothing, and this line is where that
              shows up.
            */}
            <dd className="text-graphite-900">
              {lastAutomatic ? formatDateTime(lastAutomatic.sentAt) : "None yet"}
            </dd>
          </div>
        </dl>
        {settings.enabled && !lastAutomatic ? (
          <p className="mt-3 border-t border-line pt-3 text-meta text-ink-600">
            Nothing has been sent automatically yet. That is expected until a quotation reaches the
            first day on the schedule — and it stays true indefinitely if no scheduler is calling
            the follow-up endpoint. The deployment runbook has the line for it.
          </p>
        ) : null}
      </section>

      <section className="max-w-2xl rounded-[--radius-lg] border border-line bg-white p-5">
        <h2 className="text-[1.05rem]">The schedule</h2>
        <AdminForm action={saveFollowUpSettings} submitLabel="Save" pendingLabel="Saving…">
          <Checkbox
            name="enabled"
            defaultChecked={settings.enabled}
            label={
              <>
                Send follow-ups automatically
                <span className="mt-0.5 block text-label text-ink-500">
                  Off means nothing goes out on a clock. Staff can still chase a quotation by hand.
                </span>
              </>
            }
          />

          <Field
            label="Days after sending"
            name="schedule"
            hint="One number per follow-up, counted from the day the quotation went out. Leave empty to send none automatically."
          >
            <Input name="schedule" defaultValue={settings.schedule.join(", ")} maxLength={120} />
          </Field>

          <Field
            label="Never two within (days)"
            name="minimumGapDays"
            hint="A follow-up sent by hand pushes the next automatic one back by this much, so a customer is not written to twice in as many days."
          >
            <Input
              name="minimumGapDays"
              type="number"
              min={1}
              max={90}
              defaultValue={String(settings.minimumGapDays)}
            />
          </Field>

          <Checkbox
            name="stopOnReply"
            defaultChecked={settings.stopOnReply}
            label={
              <>
                Stop once the customer has written on the quotation
                <span className="mt-0.5 block text-label text-ink-500">
                  They answered. A reminder that they have not is then simply untrue.
                </span>
              </>
            }
          />
        </AdminForm>
      </section>

      <section>
        <h2 className="mb-3 text-[1.05rem]">Recently sent</h2>
        {recent.length === 0 ? (
          <p className="text-meta text-ink-500">Nothing has been sent yet.</p>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <Tr>
                  <Th>Quotation</Th>
                  <Th>Kind</Th>
                  <Th>To</Th>
                  <Th>Sent</Th>
                  <Th>Handed to the mail server</Th>
                </Tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <Link
                        href={`/admin/quotes/${row.quote.reference}`}
                        className="text-accent-700 hover:underline"
                      >
                        {row.quote.reference}
                      </Link>
                    </Td>
                    <Td>
                      {row.kind === "AUTOMATIC"
                        ? `Automatic — step ${row.step}`
                        : `By hand${row.sentBy ? ` · ${row.sentBy.name}` : ""}`}
                    </Td>
                    <Td>{row.toEmail}</Td>
                    <Td>{formatDateTime(row.sentAt)}</Td>
                    {/*
                      Deliberately not "delivered". This column reports what
                      this application can actually observe — whether the mail
                      server took the message — and not whether anybody read it.
                    */}
                    <Td>{row.delivered ? "Yes" : "No"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </section>
    </div>
  );
}
