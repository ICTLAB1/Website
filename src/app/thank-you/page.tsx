import type { Metadata } from "next";

import { ThankYouTracker } from "@/components/analytics/thank-you-tracker";
import { ButtonLink } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Thank you",
  description: "Your enquiry has been received.",
  path: "/thank-you",
  noIndex: true,
});

/**
 * Where every enquiry form lands after it is accepted.
 *
 * It performs no lookup and reads nothing from the address, for the reason the
 * basket's confirmation page gives: a page that trusted its URL could be made to
 * report a lead nobody sent. The reference and the conversion report come from
 * what the form stored in the visitor's own tab; see `ThankYouTracker`.
 */
export default async function ThankYouPage() {
  const config = await getSiteConfig();
  const email = config.email.sales ?? "sales@techzoidtechnologies.com";

  return (
    <div className="container-page flex min-h-[60vh] items-center py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-50 text-success-700"
        >
          <svg width="28" height="28" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.2 13.6 4.6 10l1.3-1.3 2.3 2.3 5.9-5.9L15.4 6z" />
          </svg>
        </span>

        <h1 className="mt-6 text-3xl sm:text-[2.25rem]">Thanks — our team will contact you shortly</h1>

        <ThankYouTracker />

        <p className="mt-6 text-[15px] leading-relaxed text-ink-600">
          We have your details and will come back with a written quotation. Need it sooner? Write
          to us at{" "}
          <a
            href={`mailto:${email}`}
            className="font-medium text-accent-700 underline underline-offset-2"
          >
            {email}
          </a>
          .
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
        </div>
      </div>
    </div>
  );
}
