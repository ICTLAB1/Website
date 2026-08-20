import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";
import { discountPercent, effectivePriceMinor, formatMoney, formatTerm } from "@/lib/money";
import { humanise } from "@/lib/utils";
import type { ProductListItem } from "@/lib/queries/catalogue";

/**
 * Catalogue product card.
 *
 * Shows brand, name, SKU, licence type, term, price and the GST position, and
 * offers both "View details" and a direct add to the enquiry basket.
 */
export function ProductCard({ product }: { product: ProductListItem }) {
  const variant = product.variants[0];
  const price = variant ? effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) : 0;
  const saving = variant ? discountPercent(variant.listPriceMinor, variant.salePriceMinor) : null;
  const quoteOnly = !variant || price <= 0 || product.purchaseMode === "ENQUIRY";

  return (
    <article className="group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white transition-colors hover:border-line-strong">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/brands/${product.brand.slug}`}
            className="text-[12px] font-semibold uppercase tracking-wide text-accent-700 hover:underline"
          >
            {product.brand.name}
          </Link>
          {saving ? <Badge tone="success">{saving}% off</Badge> : null}
        </div>

        <h3 className="mt-2 text-[15px] font-semibold leading-snug text-navy-900">
          <Link href={`/products/${product.slug}`} className="hover:text-accent-700">
            {/* Stretching the link would swallow the buttons below, so the
                anchor stays on the title only. */}
            {product.name}
          </Link>
        </h3>

        <p className="clamp-2 mt-2 text-[13px] leading-relaxed text-ink-600">
          {product.shortDescription}
        </p>

        {variant ? (
          <dl className="mt-4 space-y-1 text-[12px]">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-500">SKU</dt>
              <dd className="truncate font-mono text-ink-600">{variant.sku}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-500">Licence</dt>
              <dd className="text-ink-600">{humanise(variant.licenceType)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-500">Term</dt>
              <dd className="text-ink-600">{formatTerm(variant.termMonths)}</dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-auto pt-5">
          {quoteOnly ? (
            <p className="text-[15px] font-semibold text-navy-900">
              Price on enquiry
              <span className="mt-0.5 block text-[12px] font-normal text-ink-500">
                Quoted against your configuration
              </span>
            </p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-[19px] font-semibold text-navy-900">
                {formatMoney(price, variant!.currency)}
              </span>
              {saving ? (
                <span className="text-[13px] text-ink-500 line-through">
                  {formatMoney(variant!.listPriceMinor, variant!.currency)}
                </span>
              ) : null}
              <span className="w-full text-[12px] text-ink-500">
                excl. GST ({variant!.gstRatePercent}%) &middot;{" "}
                {variant!.seats > 1 ? `${variant!.seats} seats` : "per seat"}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <Link
          href={`/products/${product.slug}`}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-[--radius-md] border border-line-strong text-[13px] font-medium text-navy-900 hover:border-navy-400 hover:bg-navy-50"
        >
          View details
        </Link>
        {variant ? (
          <AddToEnquiryButton
            line={{
              sku: variant.sku,
              productSlug: product.slug,
              productName: product.name,
              brandName: product.brand.name,
              variantName: variant.name,
              unitPriceMinor: price > 0 ? price : null,
              currency: variant.currency,
            }}
            compact
          />
        ) : null}
      </div>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductListItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
