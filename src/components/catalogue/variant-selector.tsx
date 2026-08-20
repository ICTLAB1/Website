"use client";

import { useState } from "react";
import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { discountPercent, effectivePriceMinor, formatMoney, formatTerm, gstAmountMinor } from "@/lib/money";
import { cn, humanise } from "@/lib/utils";

export type SelectableVariant = {
  id: string;
  sku: string;
  name: string;
  licenceType: string;
  termMonths: number | null;
  seats: number;
  currency: string;
  listPriceMinor: number;
  salePriceMinor: number | null;
  gstRatePercent: number;
};

/**
 * Variant picker and pricing panel.
 *
 * Quantity is clamped here for usability, and clamped again on the server when
 * the enquiry is submitted - the browser value is never authoritative.
 */
export function VariantSelector({
  variants,
  productName,
  productSlug,
  brandName,
  purchaseMode,
}: {
  variants: SelectableVariant[];
  productName: string;
  productSlug: string;
  brandName: string;
  purchaseMode: "DIRECT" | "ENQUIRY" | "BOTH";
}) {
  const [selectedSku, setSelectedSku] = useState(variants[0]?.sku ?? "");
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((variant) => variant.sku === selectedSku) ?? variants[0];
  if (!selected) return null;

  const unitPrice = effectivePriceMinor(selected.listPriceMinor, selected.salePriceMinor);
  const saving = discountPercent(selected.listPriceMinor, selected.salePriceMinor);
  const quoteOnly = unitPrice <= 0 || purchaseMode === "ENQUIRY";
  const lineTotal = unitPrice * quantity;
  const gst = gstAmountMinor(lineTotal, selected.gstRatePercent);

  return (
    <div className="rounded-[--radius-lg] border border-line bg-white">
      {variants.length > 1 ? (
        <fieldset className="border-b border-line px-5 py-4">
          <legend className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            Licence option
          </legend>
          <div className="mt-3 space-y-2">
            {variants.map((variant) => {
              const price = effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor);
              const active = variant.sku === selected.sku;
              return (
                <label
                  key={variant.sku}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[--radius-md] border p-3 transition-colors",
                    active
                      ? "border-accent-600 bg-accent-50"
                      : "border-line-strong hover:border-ink-300",
                  )}
                >
                  <input
                    type="radio"
                    name="variant"
                    value={variant.sku}
                    checked={active}
                    onChange={() => setSelectedSku(variant.sku)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent-700)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-navy-900">
                      {variant.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-ink-500">
                      {variant.sku}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[13px] font-semibold text-navy-900">
                    {price > 0 ? formatMoney(price, variant.currency) : "On enquiry"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="px-5 py-5">
        <dl className="mb-4 grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <dt className="text-ink-400">SKU</dt>
            <dd className="mt-0.5 font-mono text-[12px] text-ink-700">{selected.sku}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Licence type</dt>
            <dd className="mt-0.5 text-ink-700">{humanise(selected.licenceType)}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Duration</dt>
            <dd className="mt-0.5 text-ink-700">{formatTerm(selected.termMonths)}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Users included</dt>
            <dd className="mt-0.5 text-ink-700">
              {selected.seats > 1 ? `${selected.seats} per unit` : "1 per unit"}
            </dd>
          </div>
        </dl>

        {quoteOnly ? (
          <div className="rounded-[--radius-md] border border-line bg-surface-muted p-4">
            <p className="text-[17px] font-semibold text-navy-900">Price on enquiry</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
              This product is quoted against your configuration and volume. Send us the
              requirement and we will return a written quotation.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-[28px] font-semibold leading-none text-navy-900">
                {formatMoney(unitPrice, selected.currency)}
              </span>
              {saving ? (
                <>
                  <span className="text-[15px] text-ink-400 line-through">
                    {formatMoney(selected.listPriceMinor, selected.currency)}
                  </span>
                  <Badge tone="success">Save {saving}%</Badge>
                </>
              ) : null}
            </div>
            <p className="mt-1.5 text-[13px] text-ink-500">
              per unit, excluding GST at {selected.gstRatePercent}%
            </p>

            <div className="mt-5 flex items-end gap-3">
              <div className="w-32">
                <label htmlFor="quantity" className="mb-1.5 block text-[13px] font-medium text-ink-800">
                  Quantity
                </label>
                <input
                  id="quantity"
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
              <div className="flex-1 rounded-[--radius-md] bg-surface-muted px-4 py-2.5 text-right">
                <p className="text-[12px] text-ink-500">
                  Subtotal {formatMoney(lineTotal, selected.currency)} + GST{" "}
                  {formatMoney(gst, selected.currency)}
                </p>
                <p className="text-[15px] font-semibold text-navy-900">
                  {formatMoney(lineTotal + gst, selected.currency)} incl. GST
                </p>
              </div>
            </div>
          </>
        )}

        <div className="mt-5 space-y-2.5">
          <ButtonLink href="/enquiry" size="lg" fullWidth>
            Request Enterprise Pricing
          </ButtonLink>
          <AddToEnquiryButton
            fullWidth
            quantity={quantity}
            line={{
              sku: selected.sku,
              productSlug,
              productName,
              brandName,
              variantName: selected.name,
              unitPriceMinor: unitPrice > 0 ? unitPrice : null,
              currency: selected.currency,
            }}
          />
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-ink-500">
          Prices shown are indicative and exclude GST. Final pricing, delivery timelines and
          licensing terms are confirmed on a written quotation before any order is placed.
        </p>
      </div>

      <div className="border-t border-line bg-navy-900 px-5 py-4 text-white">
        <p className="text-[14px] font-semibold">Buying 10+ licences?</p>
        <p className="mt-1 text-[13px] leading-relaxed text-navy-200">
          Volume pricing, consolidated renewals and deployment support are handled by our
          enterprise team.
        </p>
        <ButtonLink href="/enterprise" variant="onDark" size="sm" className="mt-3">
          Talk to an Enterprise Specialist
        </ButtonLink>
      </div>
    </div>
  );
}
