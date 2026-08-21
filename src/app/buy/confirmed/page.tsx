import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { getSessionUser } from "@/lib/auth/session";
import { confirmationOutcome } from "@/lib/payments/service";

export const metadata: Metadata = buildMetadata({
  title: "Order received",
  description: "Your order has been received.",
  path: "/buy/confirmed",
  noIndex: true,
});

type PageProps = { searchParams: Promise<{ ref?: string | string[] }> };

/**
 * Confirmation screen.
 *
 * Says as little as it can. By default it echoes back the reference just issued
 * and nothing else, so a guessed or altered reference in the URL discloses
 * nothing about anyone's order.
 *
 * The one thing it will confirm is that a payment arrived, and only for a
 * visitor who owns the order or one whose payment completed minutes ago —
 * see `confirmationOutcome`, where that trade-off is set out. A customer who
 * has just paid by card must not be told "no payment has been taken".
 */
export default async function BuyConfirmedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const reference = raw && /^ORD-\d{4}-[A-Z0-9]{6}$/.test(raw) ? raw : null;
  const user = await getSessionUser();
  const [config, outcome] = await Promise.all([
    getSiteConfig(),
    reference ? confirmationOutcome(reference, user?.id ?? null) : Promise.resolve("unknown" as const),
  ]);
  const paid = outcome === "paid";

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

        <h1 className="mt-6 text-3xl sm:text-[2.25rem]">
          {paid ? "Payment received" : "Order received"}
        </h1>

        {reference ? (
          <div className="mt-6 inline-block rounded-[--radius-lg] border border-line bg-surface-muted px-6 py-4">
            <p className="text-[12px] uppercase tracking-wide text-ink-500">Your order reference</p>
            <p className="mt-1 font-mono text-[20px] font-semibold text-graphite-900">{reference}</p>
          </div>
        ) : null}

        <p className="mt-6 text-[15px] leading-relaxed text-ink-600">
          {paid
            ? "Thank you. Your payment has cleared and your order is confirmed. We have sent a receipt to the email address you gave us."
            : outcome === "awaiting_payment"
              ? "Thank you. We have sent a confirmation to the email address you gave us. Your payment has not completed, so this order is waiting to be paid \u2014 by card again, or against the invoice we will issue."
              : "Thank you. We have sent a confirmation to the email address you gave us."}
        </p>

        <div className="mt-8 rounded-[--radius-lg] border border-line bg-white p-6 text-left">
          <h2 className="text-[15px] font-semibold text-graphite-900">What happens next</h2>
          <ol className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-600">
            <li className="flex gap-3">
              <span className="font-semibold text-accent-700">1.</span>
              We confirm availability and the licensing terms for your configuration.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-accent-700">2.</span>
              The licence is provisioned into your tenant or publisher account, and we confirm
              assignment with your IT contact.
            </li>
            <li className="flex gap-3">
              <span className="font-semibold text-accent-700">3.</span>
              {paid
                ? "We issue your GST invoice, marked paid, with your GSTIN recorded for input credit."
                : "We issue a GST invoice against your purchase order, with your GSTIN recorded for input credit."}
            </li>
          </ol>
        </div>

        {config.email.sales ? (
          <p className="mt-6 text-[14px] text-ink-600">
            Questions?{" "}
            <a
              href={`mailto:${config.email.sales}`}
              className="font-medium text-accent-700 underline underline-offset-2"
            >
              {config.email.sales}
            </a>
            {reference ? ", quoting your reference." : "."}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/account/orders">View my orders</ButtonLink>
          <ButtonLink href="/products" variant="outline">
            Continue browsing
          </ButtonLink>
        </div>

        <p className="mt-6 text-[13px] text-ink-500">
          Ordered without an account?{" "}
          <Link href="/register" className="text-accent-700 underline underline-offset-2">
            Create one
          </Link>{" "}
          to track orders, licences and renewals in one place.
        </p>
      </div>
    </div>
  );
}
