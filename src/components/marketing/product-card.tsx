import Link from "next/link";
import { RevealGroup } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { AddToEnquiryButton } from "@/components/enquiry/add-to-enquiry-button";
import { discountPercent, effectivePriceMinor, formatTerm } from "@/lib/money";
import { showPrice, statesTaxSeparately, type PriceDisplay } from "@/lib/price-display";
import { getDisplayCurrency } from "@/lib/display-currency";
import { humanise } from "@/lib/utils";
import { hardwareClassLabel, isHardware } from "@/lib/catalogue/hardware";
import { ProductPhoto } from "@/components/catalogue/product-photo";
import type { ProductListItem } from "@/lib/queries/catalogue";

/**
 * Catalogue product card.
 *
 * Shows brand, name, SKU, licence type, term, price and the GST position, and
 * offers both "View details" and a direct add to the enquiry basket.
 */
export function ProductCard({
  product,
  display,
}: {
  product: ProductListItem;
  /**
   * The currency this visitor is reading in. Optional so the many callers that
   * only ever show rupees need not thread it through; absent means rupees.
   */
  display?: PriceDisplay;
}) {
  const variant = product.variants[0];
  const price = variant ? effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) : 0;
  const saving = variant ? discountPercent(variant.listPriceMinor, variant.salePriceMinor) : null;
  const hardware = isHardware(product);

  /*
   * Hardware is quote-only here, not merely quote-only by configuration.
   *
   * A hardware row is imported with `purchaseMode: ENQUIRY` and no price, so
   * the general test below would already catch it. This adds `hardware ||`
   * anyway, because "no price on hardware" is a requirement of the business
   * rather than a property of a row: one mis-imported record, or one price set
   * by hand in the admin panel to note a cost, and the general test would put a
   * figure on a public card. The card cannot be made to show one.
   */
  const quoteOnly = hardware || !variant || price <= 0 || product.purchaseMode === "ENQUIRY";
  const canBuyDirect = !quoteOnly && variant != null;

  /*
   * Hardware and licensing on one card.
   *
   * The differences are narrow and worth keeping in one component: a
   * photograph, and series and form factor where a licence type and term would
   * be. Everything else — the brand line, the name, the description, the
   * enquiry button — is identical, and a second card component would be two
   * copies of that drifting apart. The homepage, brand pages and search results
   * all render mixed grids, so this has to hold both anyway.
   */
  return (
    <article className="group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white transition-colors hover:border-line-strong">
      {hardware ? (
        <div className="border-b border-line p-4 pb-0">
          <ProductPhoto src={product.imageUrl} alt={product.name} />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/brands/${product.brand.slug}`}
            className="text-label font-semibold uppercase tracking-wide text-accent-700 hover:underline"
          >
            {product.brand.name}
          </Link>
          {saving ? <Badge tone="success">{saving}% off</Badge> : null}
        </div>

        <h3 className="mt-2 text-body font-semibold leading-snug text-graphite-900">
          <Link href={`/products/${product.slug}`} className="hover:text-accent-700">
            {/* Stretching the link would swallow the buttons below, so the
                anchor stays on the title only. */}
            {product.name}
          </Link>
        </h3>

        <p className="clamp-2 mt-2 text-meta leading-relaxed text-ink-600">
          {product.shortDescription}
        </p>

        {hardware ? (
          <dl className="mt-4 space-y-1 text-label">
            {product.series ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-ink-500">Series</dt>
                <dd className="text-ink-600">{product.series}</dd>
              </div>
            ) : null}
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-500">Type</dt>
              <dd className="text-ink-600">{hardwareClassLabel(product.formFactor!)}</dd>
            </div>
            {variant ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-ink-500">Part no.</dt>
                {/*
                  `min-w-0` is what makes `truncate` work here. A flex item
                  defaults to `min-width: auto`, so an unbreakable string — a
                  part number is exactly that — grows the row past its container
                  however much overflow is hidden. Two pixels of sideways scroll
                  on a phone, from one card in a grid of six.
                */}
                <dd className="min-w-0 truncate font-mono text-ink-600">{variant.sku}</dd>
              </div>
            ) : null}
          </dl>
        ) : variant ? (
          <dl className="mt-4 space-y-1 text-label">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-ink-500">SKU</dt>
              <dd className="min-w-0 truncate font-mono text-ink-600">{variant.sku}</dd>
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
            <p className="text-body font-semibold text-graphite-900">
              {hardware ? "Request a quote" : "Price on enquiry"}
              <span className="mt-0.5 block text-label font-normal text-ink-500">
                {hardware
                  ? "Priced to your configuration and quantity"
                  : "Quoted against your configuration"}
              </span>
            </p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-2">
              <span className="text-subsection font-semibold text-graphite-900">
                {showPrice(price, variant!.gstRatePercent, display)}
              </span>
              {saving ? (
                <span className="text-meta text-ink-500 line-through">
                  {showPrice(variant!.listPriceMinor, variant!.gstRatePercent, display)}
                </span>
              ) : null}
              {/*
                "Indicative" belongs on the card, not only on the pages that
                happen to carry a note. The catalogue and the product page both
                explain that a price is confirmed on a written quotation — but
                this card also appears in home-page grids, on brand pages and on
                service pages, where nothing around it says so.
              */}
              <span className="w-full text-label text-ink-500">
                {/*
                  The GST wording appears in rupees only.
                  A converted figure is the whole amount owed, so carrying
                  "excl. GST" across would state the opposite of what the number
                  is. It is removed rather than replaced: one figure, and no
                  claim about tax in either direction.
                */}
                Indicative
                {statesTaxSeparately(display) ? `, excl. GST (${variant!.gstRatePercent}%)` : ""}{" "}
                &middot; {variant!.seats > 1 ? `${variant!.seats} seats` : "per seat"}
                {canBuyDirect ? (
                  <>
                    {" · "}
                    <Link
                      href={`/buy?sku=${encodeURIComponent(variant!.sku)}`}
                      className="font-medium text-accent-700 underline underline-offset-2"
                    >
                      Buy now
                    </Link>
                  </>
                ) : null}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-line p-3">
        <Link
          href={`/products/${product.slug}`}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-[--radius-md] border border-line-strong text-meta font-medium text-graphite-900 hover:border-graphite-400 hover:bg-graphite-50"
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

/**
 * The shared product grid.
 *
 * Cards reveal in a short stagger. The stagger is capped inside `RevealGroup`
 * so a full catalogue page does not leave the last card waiting noticeably
 * after the first - a stagger that scales with list length stops reading as
 * polish and starts reading as slowness.
 */
/**
 * A grid of cards, priced in whatever currency the visitor is reading.
 *
 * The currency is resolved here rather than passed in. Five pages render this
 * grid today and any of them could have been given the prop and forgotten —
 * and a page that forgot would show rupee figures under a dollar sign, which
 * is a worse failure than not offering the currency at all. Reading it here
 * makes that unrepresentable, and costs nothing: `getDisplayCurrency` is
 * request-cached, so a page with three grids on it still reads the cookie once.
 */
export async function ProductGrid({ products }: { products: ProductListItem[] }) {
  const display = await getDisplayCurrency();

  return (
    /*
     * `grid-cols-1` is not redundant.
     *
     * With no column class at the base width the grid has no explicit template,
     * so the implicit column is sized `auto` — which means max-content, and a
     * card wide enough pushes the track past its container. Tailwind's
     * `grid-cols-*` expand to `repeat(n, minmax(0, 1fr))`, and it is the
     * `minmax(0, …)` that caps it. Software cards happened to fit; hardware
     * cards, which carry a photograph, did not, and the page scrolled two
     * pixels sideways on a phone.
     */
    <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" step={50} max={200}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} display={display} />
      ))}
    </RevealGroup>
  );
}
