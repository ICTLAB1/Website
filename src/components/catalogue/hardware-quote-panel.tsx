import Link from "next/link";

import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";

/**
 * The buying panel on a hardware page.
 *
 * Stands in for the variant selector, which exists to compare licence terms and
 * show what each costs. Neither applies here: a commercial laptop is configured
 * to a requirement and quoted against a quantity, so there is nothing to choose
 * between and nothing to price on a public page.
 *
 * What replaces it is the thing that actually moves the sale — adding the model
 * to an enquiry that can also hold licences, so one request produces one
 * quotation covering the laptops and the Microsoft 365 that goes on them.
 *
 * There is no price prop and no way to pass one in. That is the guarantee, in
 * the shape of the component rather than in a comment about it.
 */
export function HardwareQuotePanel({
  partNumber,
  productName,
  productSlug,
  brandName,
  supplierName,
}: {
  /** The manufacturer's part number, where the record carries one. */
  partNumber: string | null;
  productName: string;
  productSlug: string;
  brandName: string;
  supplierName: string;
}) {
  return (
    <div className="rounded-[--radius-lg] border border-line bg-white p-6">
      <h2 className="text-subsection font-semibold text-graphite-900">Request a quote</h2>
      <p className="mt-2 text-meta leading-relaxed text-ink-600">
        Configured to your requirement and priced against your quantity. Quotations are itemised,
        carry GST, and can cover several manufacturers on one document.
      </p>

      {partNumber ? (
        <dl className="mt-5 border-t border-line pt-4 text-label">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">Part number</dt>
            <dd className="font-mono text-ink-700">{partNumber}</dd>
          </div>
          <div className="mt-2 flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">Manufacturer</dt>
            <dd className="text-ink-700">{brandName}</dd>
          </div>
          <div className="mt-2 flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">Supplied by</dt>
            <dd className="text-ink-700">{supplierName}</dd>
          </div>
        </dl>
      ) : null}

      <div className="mt-6 space-y-3">
        {/*
          The enquiry basket first, because it is the one that scales: a
          procurement officer specifying forty laptops and the licensing to go
          with them needs them on one document, and that only happens if each
          one is added to the same basket.
        */}
        <AddToEnquiryButton
          line={{
            sku: partNumber ?? productSlug,
            productSlug,
            productName,
            brandName,
            variantName: "As configured",
            // Null, always. The enquiry records what was asked for, not what it
            // costs; the figure is put on the quotation by a person.
            unitPriceMinor: null,
            currency: "INR",
          }}
          label="Add to enquiry"
          fullWidth
        />
        <Link
          href={`/enquiry?product=${encodeURIComponent(productSlug)}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-[--radius-md] border border-line-strong text-meta font-medium text-graphite-900 hover:border-graphite-400 hover:bg-graphite-50"
        >
          Request enterprise quote
        </Link>
      </div>

      <p className="mt-4 text-label leading-relaxed text-ink-500">
        Bulk quantities, government and PSU procurement, and staged delivery schedules are all
        handled on the same quotation.
      </p>
    </div>
  );
}
