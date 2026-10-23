import Link from "next/link";

import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";
import { TENTATIVE_PRICE_NOTE } from "@/lib/catalogue/quote-only";
import { formatMoney } from "@/lib/money";

/**
 * The buying panel on a hardware page.
 *
 * Stands in for the variant selector, which exists to compare licence terms:
 * that part does not apply here, because a server or a laptop is configured to
 * a requirement rather than chosen from a list of licence lengths. Adding the
 * model to an enquiry that can also hold licences is what moves the sale, so
 * one request produces one quotation covering the laptops and the Microsoft 365
 * that goes on them.
 *
 * ## It shows a price where one is recorded
 *
 * It used to take no price and have no way to accept one — "the guarantee, in
 * the shape of the component rather than in a comment about it", written when
 * hardware was quote-only by standing rule. The business has since asked for a
 * price on every listing, and that shape became the reason a priced server
 * showed its figure on its catalogue card and in its structured data but not
 * on its own page.
 *
 * Three surfaces, two agreeing and one silent, is worse than any of the three
 * policies: a shopper sees a price in a listing, clicks through, and the page
 * it came from does not mention it. Found by putting a price on one server
 * locally and running `verify:prices`, which is the state the catalogue will be
 * in once the business fills in the figures.
 *
 * `fromPriceMinor` is null where nothing is recorded, and then this reads
 * exactly as it did before.
 */
export function HardwareQuotePanel({
  partNumber,
  productName,
  productSlug,
  brandName,
  supplierName,
  fromPriceMinor,
}: {
  /** The manufacturer's part number, where the record carries one. */
  partNumber: string | null;
  productName: string;
  productSlug: string;
  brandName: string;
  supplierName: string;
  /**
   * The lowest configuration price on record, in paise, or null where none is.
   *
   * "From", not "the price": a build is one of several configurations and the
   * cheapest is the only figure that is true of the product rather than of one
   * variant of it. Quoting a single number for a machine that comes six ways
   * would be the kind of price a buyer holds you to.
   */
  fromPriceMinor: number | null;
}) {
  return (
    <div className="rounded-[--radius-lg] border border-line bg-white p-6">
      <h2 className="text-subsection font-semibold text-graphite-900">Request a quote</h2>

      {fromPriceMinor !== null ? (
        <div className="mt-3">
          <p className="flex items-baseline gap-2">
            <span className="text-label uppercase tracking-wide text-ink-500">From</span>
            <span className="text-[1.75rem] font-semibold leading-none text-graphite-900">
              {formatMoney(fromPriceMinor, "INR")}
            </span>
          </p>
          {/*
            The shared sentence, so a buyer comparing a laptop with the licences
            for it is not told the two figures mean different things. The
            configuration clause is the one thing true here and nowhere else.
          */}
          <p className="mt-2 text-label leading-relaxed text-ink-500">
            {TENTATIVE_PRICE_NOTE} Hardware is quoted against the configuration and quantity you
            need.
          </p>
        </div>
      ) : null}

      <p className="mt-2 text-meta leading-relaxed text-ink-600">
        Configured to your requirement and priced against your quantity. Quotations are itemised,
        carry GST, and can cover several manufacturers on one document.
      </p>

      {/*
        Manufacturer and supplier always; the part number only where the source
        names one. The first two are the relationship statement — who makes this
        and who sells it — and hiding them because a build has no part number
        would drop the sentence the whole catalogue can be misread without.
      */}
      <dl className="mt-5 border-t border-line pt-4 text-label">
        {partNumber ? (
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-500">Part number</dt>
            <dd className="font-mono text-ink-700">{partNumber}</dd>
          </div>
        ) : null}
        <div className={`flex gap-3${partNumber ? " mt-2" : ""}`}>
          <dt className="w-24 shrink-0 text-ink-500">Manufacturer</dt>
          <dd className="text-ink-700">{brandName}</dd>
        </div>
        <div className="mt-2 flex gap-3">
          <dt className="w-24 shrink-0 text-ink-500">Supplied by</dt>
          <dd className="text-ink-700">{supplierName}</dd>
        </div>
      </dl>

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
