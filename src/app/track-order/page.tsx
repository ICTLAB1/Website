import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = buildMetadata({
  title: "Track an Order",
  description: "Check the status of an order, quotation or enquiry.",
  path: "/track-order",
  noIndex: true,
});

/**
 * Order tracking deliberately requires signing in.
 *
 * A reference-only lookup form would let anyone who guessed or intercepted a
 * reference read another organisation's order, so status is only shown inside
 * the account area where every query is scoped to the signed-in user.
 */
export default async function TrackOrderPage() {
  const user = await getSessionUser();

  return (
    <div className="container-page flex min-h-[55vh] items-center pb-16">
      <div className="mx-auto max-w-2xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Track order" }]} />

        <h1 className="mt-4 text-3xl sm:text-4xl">Track an order</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Order, quotation and enquiry status is shown inside your account, where it is tied to
          the signed-in user.
        </p>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-600">
          We deliberately do not offer a reference-only lookup. A form that returned order
          details for any reference typed into it would expose one customer&rsquo;s order to
          anyone who guessed or intercepted that reference.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {user ? (
            <>
              <ButtonLink href="/account/orders">View my orders</ButtonLink>
              <ButtonLink href="/account/enquiries" variant="outline">
                View my enquiries
              </ButtonLink>
            </>
          ) : (
            <>
              <ButtonLink href="/login?next=/account/orders">Sign in to track</ButtonLink>
              <ButtonLink href="/register" variant="outline">
                Create an account
              </ButtonLink>
            </>
          )}
        </div>

        <p className="mt-8 border-t border-line pt-6 text-[14px] text-ink-600">
          Placed an order without an account, or cannot sign in?{" "}
          <Link href="/contact" className="font-medium text-accent-700 underline underline-offset-2">
            Contact us with your reference
          </Link>{" "}
          and we will confirm the status directly.
        </p>
      </div>
    </div>
  );
}
