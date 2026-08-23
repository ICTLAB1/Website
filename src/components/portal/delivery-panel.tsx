import { Badge } from "@/components/ui/badge";
import {
  DELIVERY_STAGE_HINTS,
  DELIVERY_STAGE_LABELS,
  DELIVERY_STAGE_TONES,
  deliveryOverdue,
  deliveryStage,
  safeTrackingUrl,
} from "@/lib/delivery";
import { formatDate, formatDateTime } from "@/lib/utils";

export type DeliveryFacts = {
  status: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  dispatchedAt: Date | string | null;
  expectedAt: Date | string | null;
  deliveredAt: Date | string | null;
  deliveryNote: string | null;
};

/**
 * Where the customer's order is.
 *
 * Shows only what somebody entered. An order with no courier and no dates says
 * so plainly rather than displaying an empty three-step progress bar, which
 * reads as "step one complete" and is a claim nobody made.
 *
 * The tracking link is re-validated here as well as on write. Defence in depth
 * on the one field in this module that a staff account controls and a customer
 * clicks: a row that predates the validation, or one edited straight in the
 * database, still cannot become a `javascript:` link on a customer's screen.
 */
export function DeliveryPanel({ order }: { order: DeliveryFacts }) {
  const stage = deliveryStage(order);
  const overdue = deliveryOverdue(order);
  const tracking = safeTrackingUrl(order.trackingUrl);

  const facts: Array<[string, React.ReactNode]> = [];
  if (order.courier) facts.push(["Courier", order.courier]);
  if (order.trackingNumber) {
    facts.push([
      "Consignment",
      tracking ? (
        <a
          href={tracking}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="font-mono text-accent-700 underline underline-offset-2"
        >
          {order.trackingNumber}
        </a>
      ) : (
        <span className="font-mono">{order.trackingNumber}</span>
      ),
    ]);
  }
  if (order.dispatchedAt) facts.push(["Dispatched", formatDateTime(order.dispatchedAt)]);
  if (order.expectedAt) facts.push(["Expected", formatDate(order.expectedAt)]);
  if (order.deliveredAt) facts.push(["Delivered", formatDateTime(order.deliveredAt)]);

  return (
    <section className="rounded-[--radius-lg] border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-graphite-900">Delivery</h3>
        <Badge tone={DELIVERY_STAGE_TONES[stage]}>{DELIVERY_STAGE_LABELS[stage]}</Badge>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
        {DELIVERY_STAGE_HINTS[stage]}
      </p>

      {/*
        An estimate we have passed is stated, not hidden. The customer already
        knows the date has gone; a page that quietly drops it is a page they
        stop trusting.
      */}
      {overdue ? (
        <p className="mt-3 rounded-[--radius-md] border border-warning-600/40 bg-warning-50 px-4 py-3 text-[13px] leading-relaxed text-ink-700">
          This is past the date we expected. We are chasing it — contact us if you need it sooner
          and we will tell you what we know.
        </p>
      ) : null}

      {facts.length > 0 ? (
        <dl className="mt-4 space-y-2 text-[13px]">
          {facts.map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <dt className="w-28 shrink-0 text-ink-500">{label}</dt>
              <dd className="min-w-0 break-words text-ink-700">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {order.deliveryNote ? (
        <p className="mt-4 whitespace-pre-line rounded-[--radius-md] bg-surface-muted px-4 py-3 text-[13px] leading-relaxed text-ink-700">
          {order.deliveryNote}
        </p>
      ) : null}
    </section>
  );
}
