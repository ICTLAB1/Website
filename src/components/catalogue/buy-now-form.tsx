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

/**
 * Direct purchase against a purchase order.
 *
 * The totals shown here are a client-side preview for the buyer's benefit. The
 * request carries only the SKU and quantity; the server re-prices from the
 * catalogue, so nothing displayed or edited here determines what is charged.
 */
export function BuyNowForm({
  sku,
  productName,
  variantName,
  unitPriceMinor,
  gstRatePercent,
  currency,
  prefill,
}: {
  sku: string;
  productName: string;
  variantName: string;
  unitPriceMinor: number;
  gstRatePercent: number;
  currency: string;
  prefill: { contactName: string; contactEmail: string; companyName: string; phone: string };
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const net = unitPriceMinor * quantity;
  const gst = gstAmountMinor(net, gstRatePercent);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCorrelationId(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const result = await postJson<{ reference: string }>("/api/orders", {
      sku,
      quantity,
      contactName: String(form.get("contactName") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      contactPhone: String(form.get("contactPhone") ?? ""),
      gstin: String(form.get("gstin") ?? "").toUpperCase(),
      poNumber: String(form.get("poNumber") ?? ""),
      billingAddress: String(form.get("billingAddress") ?? ""),
      website: String(form.get("website") ?? ""),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error.message);
      setCorrelationId(result.error.correlationId ?? null);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }

    router.push(`/buy/confirmed?ref=${encodeURIComponent(result.data.reference)}`);
  }

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form onSubmit={onSubmit} noValidate className="space-y-8">
        {error ? (
          <FormError>
            {error}
            {correlationId ? (
              <span className="mt-1 block font-mono text-[11px]">Reference: {correlationId}</span>
            ) : null}
          </FormError>
        ) : null}

        <section className="rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-navy-900">{productName}</h2>
          <p className="mt-1 text-[13px] text-ink-600">{variantName}</p>
          <p className="mt-1 font-mono text-[11px] text-ink-500">{sku}</p>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="w-32">
              <label htmlFor="buy-quantity" className="mb-1.5 block text-[13px] font-medium text-ink-800">
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
            <dl className="flex-1 rounded-[--radius-md] bg-surface-muted px-4 py-3 text-right text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(net, currency)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">GST ({gstRatePercent}%)</dt>
                <dd className="tabular-nums">{formatMoney(gst, currency)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-3 border-t border-line pt-1 font-semibold text-navy-900">
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
              <Input name="gstin" maxLength={15} placeholder="22AAAAA0000A1Z5" className="uppercase" />
            </Field>
            <Field label="Purchase order number" name="poNumber">
              <Input name="poNumber" maxLength={64} />
            </Field>
          </div>
          <Field label="Billing address" name="billingAddress">
            <Textarea name="billingAddress" rows={3} maxLength={400} autoComplete="street-address" />
          </Field>
        </Fieldset>

        <Honeypot />

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Placing order…" : "Place order"}
          </Button>
          <p className="max-w-md text-[12px] leading-relaxed text-ink-500">
            No payment is taken now. We confirm availability, provision the licence and issue a
            GST invoice against your purchase order. See our{" "}
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
