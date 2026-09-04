"use client";

import { useState } from "react";
import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { discountPercent, effectivePriceMinor, formatMoney, formatTerm, gstAmountMinor } from "@/lib/money";
import {
  showInclusive,
  showPrice,
  statesTaxSeparately,
  type PriceDisplay,
} from "@/lib/price-display";
import { CATALOGUE_IS_QUOTE_ONLY, DIRECT_PURCHASE_ENABLED } from "@/lib/catalogue/quote-only";
import { cn, humanise } from "@/lib/utils";
import { audienceNote, isDirectlyPurchasable } from "@/lib/catalogue/audience";
import type { VariantAudience } from "@prisma/client";

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
  audience: VariantAudience;
  /** The publisher's own product number. Never invented — null when the source named none. */
  partNumber: string | null;
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
  display,
}: {
  variants: SelectableVariant[];
  productName: string;
  productSlug: string;
  brandName: string;
  purchaseMode: "DIRECT" | "ENQUIRY" | "BOTH";
  /** Resolved on the server. Absent means rupees. */
  display?: PriceDisplay;
}) {
  const [selectedSku, setSelectedSku] = useState(variants[0]?.sku ?? "");
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((variant) => variant.sku === selectedSku) ?? variants[0];
  if (!selected) return null;

  const unitPrice = effectivePriceMinor(selected.listPriceMinor, selected.salePriceMinor);
  const saving = discountPercent(selected.listPriceMinor, selected.salePriceMinor);
  /*
   * A restricted price cannot be bought here.
   *
   * Academic and non-profit rates belong to organisations that qualify, and
   * nothing on this site establishes that somebody does. The option stays
   * selectable and priced — a school comparing rates needs to see it — but the
   * route out is an enquiry, where a person checks eligibility before a licence
   * is ordered. The server refuses these lines regardless; this is so the page
   * does not offer a button that would fail.
   */
  const restricted = !isDirectlyPurchasable(selected.audience);
  const eligibility = audienceNote(selected.audience);

  /*
     The catalogue quotes rather than prices — see `lib/catalogue/quote-only`.
     The two per-row conditions stay beside the switch rather than behind
     `isQuoteOnly`, because this component is handed a variant and a mode, not
     a product, and inventing a product shape to ask the question would be
     more code than the question.
  */
  const quoteOnly = CATALOGUE_IS_QUOTE_ONLY || unitPrice <= 0 || purchaseMode === "ENQUIRY";
  /*
   * Showing a price and accepting a card for it are different decisions —
   * see `DIRECT_PURCHASE_ENABLED`. A priced, eligible variant still cannot
   * check out here while that flag is off; the route it offers instead is
   * "Request Enterprise Pricing", never a dead end.
   */
  const canBuyDirect =
    DIRECT_PURCHASE_ENABLED &&
    !quoteOnly &&
    !restricted &&
    (purchaseMode === "DIRECT" || purchaseMode === "BOTH") &&
    unitPrice > 0;
  const lineTotal = unitPrice * quantity;
  const gst = gstAmountMinor(lineTotal, selected.gstRatePercent);

  return (
    <div className="rounded-[--radius-lg] border border-line bg-white">
      {variants.length > 1 ? (
        <fieldset className="border-b border-line px-5 py-4">
          <legend className="text-label font-semibold uppercase tracking-[0.1em] text-ink-500">
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
                    <span className="block text-meta font-medium text-graphite-900">
                      {variant.name}
                    </span>
                    <span className="mt-0.5 block font-mono text-label text-ink-600">
                      {variant.sku}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-meta font-semibold text-graphite-900">
                    {!quoteOnly && price > 0
                      ? showPrice(price, variant.gstRatePercent, display)
                      : "On enquiry"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="px-5 py-5">
        <dl className="mb-4 grid grid-cols-2 gap-3 text-meta">
          <div>
            <dt className="text-ink-500">SKU</dt>
            <dd className="mt-0.5 font-mono text-label text-ink-700">{selected.sku}</dd>
          </div>
          {/*
            The publisher's number, or nothing — same rule as a hardware part
            number (see the product page). `sku` above is this site's own key
            and stays whether or not the source names one of its own; this row
            does not, because a blank "Product number" would read as a missing
            fact rather than an absent one.
          */}
          {selected.partNumber ? (
            <div>
              <dt className="text-ink-500">Product number</dt>
              <dd className="mt-0.5 font-mono text-label text-ink-700">{selected.partNumber}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-ink-500">Licence type</dt>
            <dd className="mt-0.5 text-ink-700">{humanise(selected.licenceType)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Duration</dt>
            <dd className="mt-0.5 text-ink-700">{formatTerm(selected.termMonths)}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Users included</dt>
            <dd className="mt-0.5 text-ink-700">
              {selected.seats > 1 ? `${selected.seats} per unit` : "1 per unit"}
            </dd>
          </div>
        </dl>

        {quoteOnly ? (
          <div className="rounded-[--radius-md] border border-line bg-surface-muted p-4">
            <p className="text-lead font-semibold text-graphite-900">Price on enquiry</p>
            <p className="mt-1 text-meta leading-relaxed text-ink-600">
              This product is quoted against your configuration and volume. Send us the
              requirement and we will return a written quotation.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="text-[28px] font-semibold leading-none text-graphite-900">
                {showPrice(unitPrice, selected.gstRatePercent, display)}
              </span>
              {saving ? (
                <>
                  <span className="text-body text-ink-500 line-through">
                    {showPrice(selected.listPriceMinor, selected.gstRatePercent, display)}
                  </span>
                  <Badge tone="success">Save {saving}%</Badge>
                </>
              ) : null}
            </div>
            <p className="mt-1.5 text-meta text-ink-500">
              {/* GST is named in rupees only — see lib/price-display. */}
              {statesTaxSeparately(display)
                ? `per unit, excluding GST at ${selected.gstRatePercent}%`
                : "per unit"}
            </p>

          </>
        )}

        {/*
          Quantity, whether or not there is a price beside it.

          It used to live inside the priced branch, so making the catalogue
          quote-only took the field away along with the figure — and every
          enquiry would then have arrived asking for a single seat. Quantity
          matters more here, not less: it is the main thing a quotation is
          priced against. The lifecycle suite caught its absence within the
          minute, which is the entire argument for that suite.
        */}
        <div className="mt-5 flex items-end gap-3">
          <div className="w-32">
            <label htmlFor="quantity" className="mb-1.5 block text-meta font-medium text-ink-800">
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
          {quoteOnly ? null : (
            <div className="flex-1 rounded-[--radius-md] bg-surface-muted px-4 py-2.5 text-right">
              {/*
                In rupees: the subtotal, the GST on it, and the total —
                the breakdown an Indian buyer needs for input credit.
                In any other currency: the total alone, with no tax wording,
                because that figure already contains it.
              */}
              {statesTaxSeparately(display) ? (
                <>
                  <p className="text-label text-ink-500">
                    Subtotal {formatMoney(lineTotal, "INR")} + GST {formatMoney(gst, "INR")}
                  </p>
                  <p className="text-body font-semibold text-graphite-900">
                    {formatMoney(lineTotal + gst, "INR")} incl. GST
                  </p>
                </>
              ) : (
                <>
                  <p className="text-label text-ink-500">
                    {quantity} &times; {showPrice(unitPrice, selected.gstRatePercent, display)}
                  </p>
                  <p className="text-body font-semibold text-graphite-900">
                    {showInclusive(lineTotal + gst, display)}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/*
          Who this price is for, stated beside it rather than in small print.
          A figure with no eligibility note reads as an offer, and an academic
          rate can be a fraction of the commercial one — a buyer who does not
          qualify should learn that here, not after ordering.
        */}
        {eligibility ? (
          <p className="mt-4 rounded-[--radius-md] border border-warning-600/40 bg-warning-50 p-3 text-meta leading-relaxed text-graphite-900">
            {eligibility}
          </p>
        ) : null}

        <div className="mt-5 space-y-2.5">
          {/* Direct purchase is offered only where `DIRECT_PURCHASE_ENABLED`
              is on, the product's mode permits it and the SKU carries a real
              price. The route and the API both re-check this server-side,
              independently of what this component decides to render. */}
          {canBuyDirect ? (
            <ButtonLink
              href={`/buy?sku=${encodeURIComponent(selected.sku)}`}
              size="lg"
              fullWidth
            >
              Buy now
            </ButtonLink>
          ) : null}
          <ButtonLink
            href="/enquiry"
            size="lg"
            fullWidth
            variant={canBuyDirect ? "outline" : "primary"}
          >
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
              /*
                No price into the basket for a variant that has none to give
                — hardware, an enquiry-only mode, or a zero-priced row. A
                priced software variant carries its tentative figure into the
                basket and the enquiry, exactly as the page shows it.
              */
              unitPriceMinor: quoteOnly || unitPrice <= 0 ? null : unitPrice,
              currency: selected.currency,
            }}
          />
        </div>

        {/*
          The note has to match what is above it.
          While the catalogue quotes rather than prices there are no figures on
          this page, so "prices shown are indicative" describes nothing — and a
          currency-conversion caveat under a page with no currency on it is
          worse than no note at all.
        */}
        <p className="mt-4 text-label leading-relaxed text-ink-500">
          {quoteOnly ? (
            <>
              Pricing depends on licensing programme, term, quantity and your existing
              entitlement, so it is quoted rather than listed. Send the requirement and we
              return a written quotation with the figure, the delivery timeline and the
              licensing terms on it.
            </>
          ) : (
            <>
              {/*
                "Tentative" is the word the business asked for, put beside the
                figure rather than only in a shared constant: a buyer reading
                this panel should not have to know that `TENTATIVE_PRICE_NOTE`
                exists elsewhere to learn the number can move.
              */}
              {statesTaxSeparately(display)
                ? "Tentative price, excluding GST — subject to confirmation."
                : "Tentative price, converted from our rupee list price at the rate we publish — subject to confirmation."}{" "}
              Final pricing, delivery timelines and licensing terms are fixed on a written
              quotation before any order is placed.
              {statesTaxSeparately(display) ? "" : " Orders are placed and invoiced in Indian rupees."}
            </>
          )}
        </p>
      </div>

      <div className="border-t border-line bg-graphite-900 px-5 py-4 text-white">
        <p className="text-body font-semibold">Buying 10+ licences?</p>
        <p className="mt-1 text-meta leading-relaxed text-graphite-200">
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
