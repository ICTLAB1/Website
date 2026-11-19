import { LandingEnquiryForm } from "@/components/enquiry/landing-enquiry-form";
import { leadPageFor } from "@/lib/lead-pages";
import { getSiteConfig } from "@/lib/site-config";

/**
 * The enquiry form, directly under the page's opening.
 *
 * Placed by `CmsPage` straight after the first block rather than at the foot of
 * the page, which is where the older `QuickEnquiry` sits. A visitor from an
 * advert reads a headline and, if it is what they searched for, should be able
 * to ask without scrolling past a page of explanation first. The explanation is
 * still there, below, for the ones who want it.
 *
 * `id="quote"` is the anchor the page's own buttons and closing banner already
 * point at, so every "Get a quotation" on these pages lands here.
 */
export async function LandingEnquiry({ slug }: { slug: string }) {
  const page = leadPageFor(slug);
  if (!page) return null;

  const config = await getSiteConfig();
  const phone = config.phone.sales;

  return (
    <section
      id="quote"
      aria-labelledby="quote-heading"
      className="container-page scroll-mt-32 py-8 lg:py-12"
    >
      <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-5 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] lg:gap-12">
          <div>
            <h2 id="quote-heading" className="text-section">
              {page.heading}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
              Tell us who you are and what you need. We reply with an itemised quotation, and a
              GST invoice follows the order. Nothing is ordered or charged by sending this.
            </p>
            {phone ? (
              <p className="mt-5 text-[15px] leading-relaxed text-ink-600">
                Prefer to talk?{" "}
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="font-medium whitespace-nowrap text-accent-700 underline underline-offset-2"
                >
                  Call {phone}
                </a>
              </p>
            ) : null}
          </div>
          <div className="rounded-[--radius-md] border border-line bg-white p-5 sm:p-6">
            <LandingEnquiryForm products={page.products} source={page.source} />
          </div>
        </div>
      </div>
    </section>
  );
}
