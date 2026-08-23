import Link from "next/link";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { deliverCrmEventsAction, saveCrmSettings } from "@/app/admin/crm-settings-actions";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { crmConnection, outboxSummary } from "@/lib/crm/outbox";
import { CRM_EVENT_KINDS, CRM_EVENT_VERSION } from "@/lib/crm/events";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "CRM integration" };

/**
 * Where deal events go, if anywhere.
 *
 * ## It says "Not connected" until it is
 *
 * The whole screen is arranged around one honest sentence at the top. An
 * integration page that shows a form and a save button, and nothing about
 * whether anything is actually being delivered, is how a business believes for
 * six months that its CRM is receiving events it has never seen. The state
 * comes from `crmConnection()` — the same function the delivery pass uses, so
 * this screen cannot claim a connection the sender disagrees with.
 *
 * ## The outbox is shown whether or not it is connected
 *
 * Events accumulate from the day the pipeline is used. Showing the queue with
 * nowhere to send it is the point: it is what makes "not connected" concrete,
 * and it is the backlog that gets delivered on the day an endpoint is set.
 */
export default async function AdminCrmSettingsPage() {
  await requireAdmin();

  const [connection, outbox, settings] = await Promise.all([
    crmConnection(),
    outboxSummary(),
    prisma.crmSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <Link href="/admin/settings" className="text-[13px] text-accent-700 hover:underline">
          &larr; Settings
        </Link>
        <h1 className="mt-2 text-2xl">CRM integration</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
          Sends what happens on the pipeline here — deals raised, stages moved, deals won and lost
          — to the CRM this business already runs.
        </p>
      </header>

      {/* ── the honest sentence ────────────────────────────────────────── */}
      <section
        className={
          connection.connected
            ? "rounded-[--radius-lg] border border-success-200 bg-success-50 p-5"
            : "rounded-[--radius-lg] border border-line-strong bg-surface-muted p-5"
        }
      >
        <p className="flex flex-wrap items-center gap-3">
          {connection.connected ? (
            <Badge tone="success">Connected</Badge>
          ) : (
            <Badge tone="warning">Not connected</Badge>
          )}
          <span className="text-[14px] text-ink-700">
            {connection.connected
              ? "Events are being delivered."
              : connection.detail}
          </span>
        </p>
        {connection.connected ? null : (
          <p className="mt-3 text-meta leading-relaxed text-ink-600">
            Nothing is lost in the meantime. Events are recorded below and will be sent in order
            once an endpoint is set and switched on.
          </p>
        )}
      </section>

      {/* ── the outbox ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[1.05rem]">Outbox</h2>
          <span className="flex flex-wrap gap-2 text-[13px]">
            {outbox.pending > 0 ? <Badge tone="neutral">{outbox.pending} waiting</Badge> : null}
            {outbox.failed > 0 ? <Badge tone="warning">{outbox.failed} to retry</Badge> : null}
            {outbox.abandoned > 0 ? <Badge tone="danger">{outbox.abandoned} given up on</Badge> : null}
            {outbox.delivered > 0 ? <Badge tone="success">{outbox.delivered} delivered</Badge> : null}
          </span>
        </div>

        {outbox.recent.length === 0 ? (
          <p className="rounded-[--radius-lg] border border-dashed border-line-strong bg-surface-muted p-5 text-[14px] text-ink-600">
            Nothing yet. Events appear here as soon as somebody raises or moves a deal.
          </p>
        ) : (
          <>
            <TableWrap>
              <Table className="min-w-[42rem]">
                <thead>
                  <tr>
                    <Th>Event</Th>
                    <Th>About</Th>
                    <Th>When</Th>
                    <Th>State</Th>
                  </tr>
                </thead>
                <tbody>
                  {outbox.recent.map((event) => (
                    <Tr key={event.id}>
                      <Td className="font-mono text-[12px]">{event.kind}</Td>
                      <Td className="font-mono text-[12px]">{event.entityId}</Td>
                      <Td className="text-[12px]">{formatDateTime(event.createdAt)}</Td>
                      <Td>
                        <span className="flex flex-col gap-1">
                          <span>
                            {event.status === "DELIVERED" ? (
                              <Badge tone="success">Delivered</Badge>
                            ) : event.status === "ABANDONED" ? (
                              <Badge tone="danger">Given up</Badge>
                            ) : event.status === "FAILED" ? (
                              <Badge tone="warning">Retrying</Badge>
                            ) : (
                              <Badge tone="neutral">Waiting</Badge>
                            )}
                          </span>
                          {/*
                            The receiver's own words. A misconfigured endpoint
                            should be diagnosable from this screen rather than
                            from a server log somebody has to ask for.
                          */}
                          {event.lastError ? (
                            <span className="text-[11px] leading-snug text-ink-500">
                              {event.attempts} attempt{event.attempts === 1 ? "" : "s"} ·{" "}
                              {event.lastError}
                            </span>
                          ) : null}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <div className="mt-4">
              <AdminForm
                action={deliverCrmEventsAction}
                submitLabel="Send what is waiting"
                pendingLabel="Sending…"
                variant="outline"
                compact
              />
            </div>
          </>
        )}
      </section>

      {/* ── configuration ──────────────────────────────────────────────── */}
      <section className="rounded-[--radius-lg] border border-line bg-white p-5">
        <h2 className="text-[15px] font-semibold text-graphite-900">Endpoint</h2>
        <div className="mt-4">
          <AdminForm action={saveCrmSettings} submitLabel="Save" pendingLabel="Saving…">
            <Field
              label="Endpoint URL"
              name="endpointUrl"
              hint="An https address your CRM listens on. Leave blank to send nothing."
            >
              <Input
                name="endpointUrl"
                type="url"
                maxLength={500}
                defaultValue={settings?.endpointUrl ?? ""}
                placeholder="https://crm.example.com/hooks/techzoid"
              />
            </Field>

            <Field
              label="Signing secret"
              name="signingSecret"
              hint={
                settings?.signingSecret
                  ? "A secret is stored. Leave blank to keep it; type a new one to replace it."
                  : "A shared secret, so your CRM can tell a real event from anyone who guessed the URL."
              }
            >
              <Input name="signingSecret" type="password" maxLength={200} autoComplete="off" />
            </Field>

            <Checkbox
              name="enabled"
              label="Send events"
              defaultChecked={settings?.enabled ?? false}
            />
            <p className="-mt-2 text-meta text-ink-500">
              Off until the far end is ready. Events are still recorded while this is off, and go
              out in order when it is switched on.
            </p>
          </AdminForm>
        </div>
      </section>

      {/* ── what the far end receives ──────────────────────────────────── */}
      <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
        <h2 className="text-[15px] font-semibold text-graphite-900">What your CRM will receive</h2>
        <p className="mt-2 text-meta leading-relaxed text-ink-600">
          A JSON <code className="font-mono">POST</code> per event, version {CRM_EVENT_VERSION},
          one at a time and in order. Two headers matter:
        </p>
        <ul className="mt-3 space-y-2 text-meta leading-relaxed text-ink-600">
          <li>
            <code className="font-mono text-graphite-900">x-techzoid-event-id</code> — the same
            value on every retry, so your side can ignore a duplicate without reading the body.
          </li>
          <li>
            <code className="font-mono text-graphite-900">x-techzoid-signature</code> —{" "}
            <code className="font-mono">t=&lt;unix&gt;,v1=&lt;hex&gt;</code>, an HMAC-SHA256 over{" "}
            <code className="font-mono">&quot;&lt;t&gt;.&lt;body&gt;&quot;</code> using the secret
            above. The timestamp is inside the signed material, so a captured delivery cannot be
            replayed by changing the header.
          </li>
        </ul>
        <p className="mt-3 text-meta leading-relaxed text-ink-600">
          Anything other than a 2xx response is a failure: the event is retried with an increasing
          delay and given up on after eight attempts, staying visible above either way.
        </p>
        <p className="mt-3 text-meta text-ink-600">
          Event kinds:{" "}
          <span className="font-mono text-graphite-900">{CRM_EVENT_KINDS.join(", ")}</span>
        </p>
      </section>
    </div>
  );
}
