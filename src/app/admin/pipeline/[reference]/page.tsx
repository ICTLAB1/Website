import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import {
  logActivityAction,
  moveDealStageAction,
  updateDealAction,
} from "@/app/admin/crm-actions";
import { requireStaff } from "@/lib/auth/guards";
import { dealOwners, getDeal } from "@/lib/queries/crm";
import {
  ACTIVITY_KINDS,
  ACTIVITY_KIND_LABELS,
  DEAL_SOURCES,
  DEAL_SOURCE_LABELS,
  DEAL_STAGES,
  DEAL_STAGE_HINTS,
  DEAL_STAGE_LABELS,
  daysInStage,
  isClosed,
  isOverdue,
  isStale,
  weightedValue,
} from "@/lib/crm/pipeline";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Deal" };

type PageProps = { params: Promise<{ reference: string }> };

/** A date for a `type="date"` input: the ISO day, in UTC. */
function dateValue(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

/**
 * One deal: where it stands, what it is worth, and everything that has happened.
 *
 * ## The stage control is separate from the edit form
 *
 * Moving a deal is not the same kind of act as correcting its title, and the
 * service enforces that: a stage change is dated and written into the history,
 * and `updateDeal` cannot set a stage at all. Two forms rather than one field
 * among many, so that the difference is visible rather than merely true.
 *
 * ## Why the timeline is the largest thing on the page
 *
 * It is what the screen is for. A pipeline row tells you a deal exists; the
 * history is what tells you whether to call them today, and it is the part that
 * is worthless if it is not kept. Putting it below a fold of form fields is how
 * it stops being kept.
 */
export default async function AdminDealPage({ params }: PageProps) {
  await requireStaff();
  const { reference } = await params;

  const [deal, owners] = await Promise.all([getDeal(reference), dealOwners()]);
  if (!deal) notFound();

  const closed = isClosed(deal.stage);
  const overdue = isOverdue(deal);
  const stale = isStale(deal);

  return (
    <div className="space-y-8">
      <header>
        <Link href="/admin/pipeline" className="text-[13px] text-accent-700 hover:underline">
          &larr; Pipeline
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl">{deal.title}</h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-600">
              <span className="font-mono">{deal.reference}</span>
              {deal.company ? (
                <Link
                  href={`/admin/organisations/${deal.company.id}`}
                  className="text-accent-700 hover:underline"
                >
                  {deal.company.name}
                </Link>
              ) : deal.companyName ? (
                <span>{deal.companyName}</span>
              ) : null}
              {deal.enquiry ? (
                <Link
                  href={`/admin/enquiries/${deal.enquiry.reference}`}
                  className="text-accent-700 hover:underline"
                >
                  From {deal.enquiry.reference}
                </Link>
              ) : null}
            </p>
          </div>
          <span className="flex flex-wrap items-center gap-2">
            {overdue ? <Badge tone="danger">Past close date</Badge> : null}
            {stale ? <Badge tone="warning">Untouched for a month</Badge> : null}
            <StatusBadge status={deal.stage} />
          </span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          {/* ── move it ─────────────────────────────────────────────────── */}
          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Stage</h2>
            <p className="mt-1.5 text-meta leading-relaxed text-ink-600">
              {DEAL_STAGE_HINTS[deal.stage]}
              {closed ? null : ` ${daysInStage(deal)} days here.`}
            </p>

            <div className="mt-4 max-w-md">
              <AdminForm
                action={moveDealStageAction}
                submitLabel="Move"
                pendingLabel="Moving…"
                hidden={{ reference: deal.reference }}
                compact
              >
                <Field label="Move to" name="stage" required>
                  <Select name="stage" defaultValue={deal.stage} required>
                    {DEAL_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {DEAL_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </Select>
                </Field>
                {/*
                  Always present rather than revealed by the stage select. This
                  is a server-rendered form with no client state, and a reason
                  box that appears only after a round trip is a reason box
                  somebody fills in twice. The service is what enforces it.
                */}
                <Field
                  label="If lost, why"
                  name="lostReason"
                  hint="Required to mark a deal lost. Price, timing, competitor, no budget — whatever it actually was."
                >
                  <Input name="lostReason" maxLength={600} defaultValue={deal.lostReason ?? ""} />
                </Field>
              </AdminForm>
            </div>

            {deal.lostReason ? (
              <p className="mt-4 rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-meta text-ink-700">
                Lost: {deal.lostReason}
              </p>
            ) : null}
          </section>

          {/* ── log something ───────────────────────────────────────────── */}
          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Log an activity</h2>
            <div className="mt-4">
              <AdminForm
                action={logActivityAction}
                submitLabel="Log it"
                pendingLabel="Logging…"
                hidden={{
                  dealId: deal.id,
                  companyId: deal.company?.id ?? "",
                  reference: deal.reference,
                }}
                compact
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="What" name="kind" required>
                    <Select name="kind" defaultValue="CALL" required>
                      {ACTIVITY_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {ACTIVITY_KIND_LABELS[kind]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="When"
                    name="occurredOn"
                    hint="Leave blank for today. A call logged on Friday about Wednesday should say Wednesday."
                  >
                    <Input name="occurredOn" type="date" />
                  </Field>
                </div>
                <Field label="Summary" name="subject" required>
                  <Input name="subject" maxLength={200} required />
                </Field>
                <Field label="Detail" name="body">
                  <Textarea name="body" rows={3} maxLength={4000} />
                </Field>
                <Field
                  label="Follow up on"
                  name="dueOn"
                  hint="Required for a follow-up, and it then appears on the Follow-ups screen until it is done."
                >
                  <Input name="dueOn" type="date" />
                </Field>
              </AdminForm>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-[1.05rem]">History</h2>
            <ActivityTimeline activities={deal.activities} reference={deal.reference} />
          </section>
        </div>

        {/* ── the side column ───────────────────────────────────────────── */}
        <aside className="space-y-6">
          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Forecast</h2>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Expected value</dt>
                <dd className="font-medium text-graphite-900">
                  {deal.expectedValueMinor > 0
                    ? formatMoney(deal.expectedValueMinor, deal.currency)
                    : "Not set"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Weighted</dt>
                <dd className="text-graphite-900">
                  {formatMoney(weightedValue(deal), deal.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Expected close</dt>
                <dd className="text-graphite-900">
                  {deal.expectedCloseOn
                    ? deal.expectedCloseOn.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                    : "Not set"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Source</dt>
                <dd className="text-graphite-900">{DEAL_SOURCE_LABELS[deal.source]}</dd>
              </div>
            </dl>
            {/*
              Said plainly on the screen where the number is read. An expected
              value is somebody's estimate; the figures on a quotation are an
              offer this business stands behind. Confusing the two is how an
              internal forecast ends up quoted at a customer.
            */}
            <p className="mt-4 border-t border-line pt-3 text-meta leading-relaxed text-ink-500">
              A forecast, not a price. Nothing here is shown to the customer.
            </p>
          </section>

          {deal.quotes.length > 0 ? (
            <section className="rounded-[--radius-lg] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-graphite-900">Quotations</h2>
              <ul className="mt-3 space-y-2 text-[13px]">
                {deal.quotes.map((quote) => (
                  <li key={quote.reference} className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/admin/quotes/${quote.reference}`}
                      className="font-mono text-accent-700 hover:underline"
                    >
                      {quote.documentNo ?? quote.reference}
                    </Link>
                    <span className="text-ink-600">
                      {formatMoney(quote.totalMinor, quote.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">Details</h2>
            <div className="mt-4">
              <AdminForm
                action={updateDealAction}
                submitLabel="Save"
                pendingLabel="Saving…"
                hidden={{ reference: deal.reference }}
                compact
              >
                <Field label="Title" name="title" required>
                  <Input name="title" maxLength={160} defaultValue={deal.title} required />
                </Field>
                <Field label="Owner" name="ownerId">
                  <Select name="ownerId" defaultValue={deal.owner?.id ?? ""}>
                    <option value="">Nobody</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name ?? owner.email}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Source" name="source">
                  <Select name="source" defaultValue={deal.source}>
                    {DEAL_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {DEAL_SOURCE_LABELS[source]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Expected value (₹)" name="expectedValue">
                  <Input
                    name="expectedValue"
                    inputMode="decimal"
                    defaultValue={
                      deal.expectedValueMinor > 0 ? (deal.expectedValueMinor / 100).toFixed(2) : ""
                    }
                  />
                </Field>
                <Field label="Expected close" name="expectedCloseOn">
                  <Input name="expectedCloseOn" type="date" defaultValue={dateValue(deal.expectedCloseOn)} />
                </Field>
                <Field label="Contact" name="contactName">
                  <Input name="contactName" maxLength={120} defaultValue={deal.contactName ?? ""} />
                </Field>
                <Field label="Contact email" name="contactEmail">
                  <Input
                    name="contactEmail"
                    type="email"
                    maxLength={160}
                    defaultValue={deal.contactEmail ?? ""}
                  />
                </Field>
                <Field label="Contact phone" name="contactPhone">
                  <Input name="contactPhone" maxLength={40} defaultValue={deal.contactPhone ?? ""} />
                </Field>
                <Field label="Notes" name="notes">
                  <Textarea name="notes" rows={4} maxLength={4000} defaultValue={deal.notes ?? ""} />
                </Field>
              </AdminForm>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
