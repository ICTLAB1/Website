"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useBasket } from "@/components/enquiry/basket-provider";
import { Button } from "@/components/ui/button";
import {
  Field,
  Fieldset,
  FormError,
  FormStateProvider,
  Honeypot,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { postJson } from "@/lib/csrf-client";
import { cn } from "@/lib/utils";

/**
 * The B2B enquiry basket and quote request.
 *
 * Only SKU and quantity are submitted. Totals shown here are an indicative
 * client-side sum for the customer's benefit; the server recomputes everything
 * from the catalogue, so the displayed figures carry no authority.
 */

const TIMELINES = [
  { value: "IMMEDIATE", label: "Immediately" },
  { value: "WITHIN_30_DAYS", label: "Within 30 days" },
  { value: "WITHIN_90_DAYS", label: "Within 90 days" },
  { value: "EXPLORING", label: "Still exploring options" },
];

type FieldErrors = Record<string, string[]>;

export function EnquiryBasket({
  prefill,
}: {
  prefill: { contactName: string; contactEmail: string; companyName: string; phone: string };
}) {
  const { lines, setQuantity, setNote, remove, clear, ready, totalQuantity } = useBasket();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const indicativeTotal = lines.reduce(
    (sum, line) => sum + (line.unitPriceMinor ?? 0) * line.quantity,
    0,
  );
  const hasQuoteOnly = lines.some((line) => line.unitPriceMinor === null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lines.length === 0) return;

    setSubmitting(true);
    setFormError(null);
    setCorrelationId(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const userCountRaw = String(form.get("userCount") ?? "").trim();

    const payload = {
      contactName: String(form.get("contactName") ?? ""),
      companyName: String(form.get("companyName") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      contactPhone: String(form.get("contactPhone") ?? ""),
      gstin: String(form.get("gstin") ?? "").toUpperCase(),
      country: String(form.get("country") ?? "India"),
      city: String(form.get("city") ?? ""),
      ...(userCountRaw ? { userCount: Number(userCountRaw) } : {}),
      requirements: String(form.get("requirements") ?? ""),
      timeline: String(form.get("timeline") ?? "EXPLORING"),
      website: String(form.get("website") ?? ""),
      items: lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        ...(line.note ? { note: line.note } : {}),
      })),
    };

    const result = await postJson<{ reference: string }>("/api/enquiries", payload);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error.message);
      setCorrelationId(result.error.correlationId ?? null);
      setFieldErrors(result.error.fieldErrors ?? {});
      document.getElementById("enquiry-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    clear();
    router.push(`/enquiry/submitted?ref=${encodeURIComponent(result.data.reference)}`);
  }

  if (!ready) {
    return (
      <div className="py-16" role="status" aria-live="polite">
        <span className="text-sm text-ink-500">Loading your enquiry…</span>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        title="Your enquiry basket is empty"
        description="Add products from the catalogue to build a multi-brand enquiry, then request a consolidated quotation covering all of them."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/products"
              className="inline-flex h-11 items-center justify-center rounded-[--radius-md] bg-accent-700 px-5 text-sm font-medium text-white hover:bg-accent-800"
            >
              Browse catalogue
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-[--radius-md] border border-line-strong px-5 text-sm font-medium text-graphite-900 hover:bg-graphite-50"
            >
              Describe a requirement instead
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      <div className="min-w-0">
        {/* ------------------------------------------------ basket lines */}
        <section aria-labelledby="basket-heading" className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="basket-heading" className="text-[1.25rem]">
              Products ({lines.length})
            </h2>
            <button
              type="button"
              onClick={clear}
              className="text-[13px] font-medium text-ink-500 hover:text-danger-700 hover:underline"
            >
              Clear all
            </button>
          </div>

          <ul className="divide-y divide-line rounded-[--radius-lg] border border-line bg-white">
            {lines.map((line) => (
              <li key={line.sku} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-700">
                      {line.brandName}
                    </p>
                    <h3 className="mt-1 text-[15px] font-semibold text-graphite-900">
                      <Link href={`/products/${line.productSlug}`} className="hover:underline">
                        {line.productName}
                      </Link>
                    </h3>
                    <p className="mt-1 text-[13px] text-ink-600">{line.variantName}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink-500">{line.sku}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <label
                        htmlFor={`qty-${line.sku}`}
                        className="mb-1 block text-[12px] font-medium text-ink-600"
                      >
                        Quantity
                      </label>
                      <input
                        id={`qty-${line.sku}`}
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        value={line.quantity}
                        onChange={(event) => {
                          const parsed = Number.parseInt(event.target.value, 10);
                          setQuantity(line.sku, Number.isFinite(parsed) ? parsed : 1);
                        }}
                        className="h-10 w-24 rounded-[--radius-md] border border-line-strong px-2.5 text-sm tabular-nums"
                      />
                    </div>

                    <div className="min-w-24 text-right">
                      <p className="text-[12px] text-ink-500">Indicative</p>
                      <p className="text-[15px] font-semibold text-graphite-900">
                        {line.unitPriceMinor === null
                          ? "On quote"
                          : formatMoney(line.unitPriceMinor * line.quantity, line.currency)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(line.sku)}
                      className="rounded-[--radius-sm] p-2 text-ink-500 hover:bg-danger-50 hover:text-danger-700"
                    >
                      <span className="sr-only">Remove {line.productName}</span>
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M7 2h6v2h4v2H3V4h4zM5 7h10l-.8 10.1a1 1 0 0 1-1 .9H6.8a1 1 0 0 1-1-.9z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-[12px] font-medium text-accent-700">
                    {line.note ? "Edit note" : "Add a note for this line"}
                  </summary>
                  <textarea
                    value={line.note ?? ""}
                    onChange={(event) => setNote(line.sku, event.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Existing entitlements, required start date, edition preference…"
                    className="mt-2 w-full rounded-[--radius-md] border border-line-strong px-3 py-2 text-[13px]"
                  />
                </details>
              </li>
            ))}
          </ul>
        </section>

        {/* -------------------------------------------------------- form */}
        <section id="enquiry-form" className="scroll-mt-32">
          <h2 className="text-[1.25rem]">Request Enterprise Quote</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
            Tell us who to send the quotation to. We reply with a written, itemised
            quotation — not an automated price list.
          </p>

          <FormStateProvider fieldErrors={fieldErrors}>
            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-8">
            {formError ? (
              <FormError>
                {formError}
                {correlationId ? (
                  <span className="mt-1 block font-mono text-[11px]">Reference: {correlationId}</span>
                ) : null}
              </FormError>
            ) : null}

            <Fieldset legend="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="contactName" label="Full name" required>
<Input
                      name="contactName"
                      autoComplete="name"
                      defaultValue={prefill.contactName}
                      required
                    />
</Field>
                <Field name="companyName" label="Company name" required>
<Input
                      name="companyName"
                      autoComplete="organization"
                      defaultValue={prefill.companyName}
                      required
                    />
</Field>
                <Field name="contactEmail" label="Business email" required>
<Input
                      name="contactEmail"
                      type="email"
                      autoComplete="email"
                      defaultValue={prefill.contactEmail}
                      required
                    />
</Field>
                <Field name="contactPhone" label="Phone" required>
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
              legend="Billing and location"
              description="GSTIN is optional, but providing it now means every invoice carries it correctly from the start."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field name="gstin"
                  label="GSTIN"
                  hint="15 characters"
                >
<Input
                      name="gstin"
                      maxLength={15}
                      placeholder="22AAAAA0000A1ZC"
                      className="uppercase"
                    />
</Field>
                <Field name="city" label="City">
<Input
                      name="city"
                      autoComplete="address-level2"
                    />
</Field>
                <Field name="country" label="Country" required>
<Input
                      name="country"
                      defaultValue="India"
                      autoComplete="country-name"
                      required
                    />
</Field>
              </div>
            </Fieldset>

            <Fieldset legend="About the requirement">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="userCount"
                  label="Total number of users"
                  hint="Across the whole organisation, if known"
                >
<Input
                      name="userCount"
                      type="number"
                      min={1}
                      max={1000000}
                    />
</Field>
                <Field name="timeline" label="Expected purchase timeline">
<Select name="timeline" defaultValue="EXPLORING">
                      {TIMELINES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
</Field>
              </div>
              <Field name="requirements"
                label="Requirements and context"
                hint="Existing licences, renewal dates, deployment needs, or anything else that affects the quotation."
              >
<Textarea
                    name="requirements"
                    rows={5}
                    maxLength={4000}
                  />
</Field>
            </Fieldset>

            {/* Honeypot: hidden from people, tempting to bots. */}
            <Honeypot />

            <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Submitting…" : "Request Enterprise Quote"}
              </Button>
              <p className="text-[12px] leading-relaxed text-ink-500">
                We use these details only to prepare and send your quotation. See our{" "}
                <Link href="/privacy" className="text-accent-700 underline">
                  privacy policy
                </Link>
                .
              </p>
            </div>
            </form>
          </FormStateProvider>
        </section>
      </div>

      {/* ---------------------------------------------------------- summary */}
      <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
        <div className="rounded-[--radius-lg] border border-line bg-white">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold text-graphite-900">Enquiry summary</h2>
          </div>
          <dl className="space-y-3 px-5 py-4 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Line items</dt>
              <dd className="font-medium text-graphite-900">{lines.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Total quantity</dt>
              <dd className="font-medium tabular-nums text-graphite-900">{totalQuantity}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-3">
              <dt className="text-ink-500">Indicative subtotal</dt>
              <dd className={cn("font-semibold text-graphite-900", hasQuoteOnly && "text-[13px]")}>
                {indicativeTotal > 0 ? formatMoney(indicativeTotal) : "—"}
              </dd>
            </div>
          </dl>
          <div className="border-t border-line bg-surface-muted px-5 py-4">
            <p className="text-[12px] leading-relaxed text-ink-600">
              {hasQuoteOnly
                ? "Some items in this enquiry are quoted against configuration, so no subtotal can be shown for them."
                : "Indicative only, excluding GST."}{" "}
              Final pricing is confirmed on the written quotation.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[--radius-lg] border border-line bg-graphite-900 p-5 text-white">
          <p className="text-[14px] font-semibold">Prefer to talk it through?</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-graphite-200">
            Complex or multi-brand requirements are often faster to scope in a conversation.
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-[--radius-md] border border-white/30 px-4 text-[13px] font-medium text-white hover:bg-white/10"
          >
            Contact enterprise sales
          </Link>
        </div>
      </aside>
    </div>
  );
}
