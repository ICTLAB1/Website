"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  Fieldset,
  FormError,
  FormStateProvider,
  Honeypot,
  Input,
  Textarea,
} from "@/components/ui/form";
import { postJson } from "@/lib/csrf-client";
import { formatMoney, gstAmountMinor } from "@/lib/money";
import type { PaymentGateway } from "@/lib/payments/config";

const GATEWAY_LABEL: Record<PaymentGateway, string> = {
  stripe: "Card, UPI or net banking",
  ccavenue: "CCAvenue",
};

/**
 * Direct purchase, paid by card or raised against a purchase order.
 *
 * The totals shown here are a client-side preview for the buyer's benefit. The
 * request carries only the SKU, the quantity and which route was chosen; the
 * server re-prices from the catalogue and tells the gateway what to charge, so
 * nothing displayed or edited here determines what is paid.
 *
 * The order is created either way, and it is created first. Paying by card is
 * a second step against an order that already exists, which is what makes an
 * abandoned or failed payment harmless: the order stands, the customer has the
 * confirmation email, and they can pay it by transfer instead.
 */
export function BuyNowForm({
  sku,
  productName,
  variantName,
  unitPriceMinor,
  gstRatePercent,
  currency,
  cardPaymentsAvailable,
  gateways,
  prefill,
}: {
  sku: string;
  productName: string;
  variantName: string;
  unitPriceMinor: number;
  gstRatePercent: number;
  currency: string;
  /** Decided on the server. False hides the option entirely. */
  cardPaymentsAvailable: boolean;
  /** Which gateways are actually usable, in display order. */
  gateways: PaymentGateway[];
  prefill: { contactName: string; contactEmail: string; companyName: string; phone: string };
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [payWithCard, setPayWithCard] = useState(cardPaymentsAvailable);
  const [gateway, setGateway] = useState<PaymentGateway>(gateways[0] ?? "stripe");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const net = unitPriceMinor * quantity;
  const gst = gstAmountMinor(net, gstRatePercent);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);
    setCorrelationId(null);
    setFieldErrors({});

    const wantsCard = cardPaymentsAvailable && payWithCard;

    /*
     * There is no script to fetch any more.
     *
     * The gateway is Stripe's hosted Checkout, so paying is a redirect. The
     * whole class of failure this used to guard against — an ad blocker, a
     * corporate proxy, a bad moment on the network while a third-party script
     * loads — does not exist, and neither does the pre-flight that existed to
     * catch it before an order was raised against a checkout that could not
     * open.
     */
    const form = new FormData(event.currentTarget);
    const result = await postJson<{
      reference: string;
      payment: { checkoutUrl: string } | null;
    }>("/api/orders", {
      sku,
      quantity,
      contactName: String(form.get("contactName") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      contactPhone: String(form.get("contactPhone") ?? ""),
      gstin: String(form.get("gstin") ?? "").toUpperCase(),
      poNumber: String(form.get("poNumber") ?? ""),
      billingAddress: String(form.get("billingAddress") ?? ""),
      payWithCard: wantsCard,
      gateway,
      website: String(form.get("website") ?? ""),
    });

    if (!result.ok) {
      setPending(false);
      setError(result.error.message);
      setCorrelationId(result.error.correlationId ?? null);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }

    const { reference, payment } = result.data;
    const confirmed = `/buy/confirmed?ref=${encodeURIComponent(reference)}`;

    /*
     * From here on the order exists.
     *
     * Every remaining branch ends at the confirmation page, and none of them
     * shows an error, because there is nothing wrong: the order was placed. The
     * confirmation page reads the order's real state and says whether it has
     * been paid, so the customer is told the truth by the page that knows it
     * rather than by this form guessing.
     */
    if (!payment) {
      router.push(confirmed);
      return;
    }

    setStatus("Opening secure payment…");
    /*
     * The page leaves for Stripe here, and the order is already placed.
     *
     * Whatever happens next — paid, abandoned, a card declined three times —
     * the customer returns to the confirmation page, which reads the order's
     * real state rather than being told it by this form. Both return addresses
     * were fixed by the server when the session was opened, from `appUrl` and
     * never from anything the browser supplied.
     */
    window.location.assign(payment.checkoutUrl);
  }

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {error ? (
          <FormError>
            {error}
            {correlationId ? (
              <span className="mt-1 block font-mono text-label">Reference: {correlationId}</span>
            ) : null}
          </FormError>
        ) : null}

        <section className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-body font-semibold text-graphite-900">{productName}</h2>
          <p className="mt-1 text-meta text-ink-600">{variantName}</p>
          <p className="mt-1 font-mono text-label text-ink-500">{sku}</p>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="w-32">
              <label htmlFor="buy-quantity" className="mb-1.5 block text-meta font-medium text-ink-800">
                Quantity
              </label>
              <input
                id="buy-quantity"
                type="number"
                min={1}
                max={100000}
                step={1}
                value={quantity}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  setQuantity(Number.isFinite(parsed) ? Math.min(100000, Math.max(1, parsed)) : 1);
                }}
                className="h-11 w-full rounded-[--radius-md] border border-line-strong px-3 text-sm tabular-nums"
              />
            </div>
            <dl className="flex-1 rounded-[--radius-md] bg-surface-muted px-4 py-3 text-right text-meta">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(net, currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">GST ({gstRatePercent}%)</dt>
                <dd className="tabular-nums">{formatMoney(gst, currency)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-3 border-t border-line pt-1 font-semibold text-graphite-900">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(net + gst, currency)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <Fieldset legend="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="contactName" required>
              <Input name="contactName" autoComplete="name" defaultValue={prefill.contactName} required />
            </Field>
            <Field
              label="Registered legal name"
              name="companyName"
              required
              hint="As it appears on your GST registration — this is the name on the invoice."
            >
              <Input
                name="companyName"
                autoComplete="organization"
                defaultValue={prefill.companyName}
                required
              />
            </Field>
            <Field label="Business email" name="contactEmail" required>
              <Input
                name="contactEmail"
                type="email"
                autoComplete="email"
                defaultValue={prefill.contactEmail}
                required
              />
            </Field>
            <Field label="Phone" name="contactPhone" required>
              <Input
                name="contactPhone"
                type="tel"
                autoComplete="tel"
                defaultValue={prefill.phone}
                required
              />
            </Field>
          </div>
        </Fieldset>

        <Fieldset
          legend="Invoicing"
          description="Providing your GSTIN now means the invoice carries it correctly from the start."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="GSTIN" name="gstin" hint="15 characters">
              <Input name="gstin" maxLength={15} placeholder="22AAAAA0000A1ZC" className="uppercase" />
            </Field>
            <Field label="Purchase order number" name="poNumber">
              <Input name="poNumber" maxLength={64} />
            </Field>
          </div>
          <Field label="Billing address" name="billingAddress">
            <Textarea name="billingAddress" rows={3} maxLength={400} autoComplete="street-address" />
          </Field>
        </Fieldset>

        {cardPaymentsAvailable ? (
          <Fieldset
            legend="How would you like to pay?"
            description="Both routes place the same order. Many government and enterprise buyers cannot pay by card, so the invoice route is always available."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <PaymentChoice
                selected={payWithCard}
                onSelect={() => setPayWithCard(true)}
                title="Pay now by card"
                detail="Card, UPI or net banking, through our payment provider. Your order is confirmed straight away."
              />
              <PaymentChoice
                selected={!payWithCard}
                onSelect={() => setPayWithCard(false)}
                title="Invoice me"
                detail="We issue a GST invoice against your purchase order and you pay by transfer."
              />
            </div>

            {payWithCard && gateways.length > 1 ? (
              <div
                role="radiogroup"
                aria-label="Payment provider"
                className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3"
              >
                {gateways.map((option) => (
                  <label
                    key={option}
                    className={`flex cursor-pointer items-center gap-2 rounded-[--radius-sm] border px-3 py-1.5 text-meta ${
                      gateway === option
                        ? "border-accent-600 bg-accent-50/60 text-graphite-900"
                        : "border-line-strong text-ink-600 hover:bg-surface-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="gatewayChoice"
                      checked={gateway === option}
                      onChange={() => setGateway(option)}
                      className="h-3.5 w-3.5 accent-accent-700"
                    />
                    {GATEWAY_LABEL[option]}
                  </label>
                ))}
              </div>
            ) : null}
          </Fieldset>
        ) : null}

        <Honeypot />

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <Button type="submit" size="lg" disabled={pending}>
            {pending
              ? (status ?? "Placing order…")
              : cardPaymentsAvailable && payWithCard
                ? `Pay ${formatMoney(net + gst, currency)}`
                : "Place order"}
          </Button>
          <p className="max-w-md text-label leading-relaxed text-ink-500">
            {cardPaymentsAvailable && payWithCard
              ? "Your card details are entered on our payment provider's own secure form and never reach this site."
              : "No payment is taken now. We confirm availability, provision the licence and issue a GST invoice against your purchase order."}{" "}
            See our{" "}
            <Link href="/terms" className="text-accent-700 underline underline-offset-2">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/refund-policy" className="text-accent-700 underline underline-offset-2">
              refund policy
            </Link>
            .
          </p>
        </div>
      </form>
    </FormStateProvider>
  );
}

/**
 * One of the two payment routes, as a radio in everything but appearance.
 *
 * A real `<input type="radio">` underneath rather than a styled `<div>` with a
 * click handler: it is what makes arrow keys move between the options, what
 * puts the choice into the accessibility tree as a choice, and what a screen
 * reader announces as selected. The label wraps the input so the whole card is
 * the hit target without any of that having to be rebuilt by hand.
 */
function PaymentChoice({
  selected,
  onSelect,
  title,
  detail,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-[--radius-md] border p-4 transition-colors duration-150 ${
        selected
          ? "border-accent-600 bg-accent-50/60"
          : "border-line-strong bg-white hover:border-line-strong hover:bg-surface-muted"
      }`}
    >
      <input
        type="radio"
        name="paymentRoute"
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent-700"
      />
      <span>
        <span className="block text-body font-semibold text-graphite-900">{title}</span>
        <span className="mt-1 block text-label leading-relaxed text-ink-600">{detail}</span>
      </span>
    </label>
  );
}
