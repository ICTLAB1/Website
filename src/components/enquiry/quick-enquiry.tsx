import { RequirementForm } from "@/components/enquiry/requirement-form";
import { getSiteConfig } from "@/lib/site-config";

/**
 * The enquiry form, on the page the visitor is already reading.
 *
 * The landing pages an advert points at described a product, gave its price,
 * and offered no way to ask for it: the only forms on them were site search
 * and the currency switcher. Asking meant leaving the page. Six hundred paid
 * clicks produced no enquiries, and this is the most direct reason available.
 *
 * This is the compact requirement form — one line, a notes box, four contact
 * fields — with the sales number beside it for the buyer who would rather
 * talk. It posts to the same action as `/requirement`, so an enquiry from here
 * is an ordinary enquiry: same reference, same email, same conversion event.
 *
 * No prefill from the session, deliberately. Reading it here would be one more
 * query on the busiest pages for the benefit of somebody who is already a
 * customer and has an account page that does this properly.
 */
export async function QuickEnquiry({
  subject,
  source,
  heading = "Get a written quotation",
  contained = true,
}: {
  /** False where the caller is already inside the page container. */
  contained?: boolean;
  /** Prefills "what you need". A product page passes the product's name. */
  subject?: string;
  /** Reported with the conversion, so a report can tell the forms apart. */
  source: string;
  heading?: string;
}) {
  const config = await getSiteConfig();
  const phone = config.phone.sales;

  return (
    <section
      id="quote"
      aria-labelledby="quote-heading"
      className={contained ? "container-page scroll-mt-32 pb-14 lg:pb-18" : "mt-16 scroll-mt-32"}
    >
      <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
          <div>
            <h2 id="quote-heading" className="text-section">
              {heading}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
              Tell us the product and the number of users. We reply with an itemised quotation
              and a GST invoice follows the order. Nothing is ordered or charged by sending this.
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
            <RequirementForm compact slots={1} subject={subject} source={source} defaults={{}} />
          </div>
        </div>
      </div>
    </section>
  );
}
