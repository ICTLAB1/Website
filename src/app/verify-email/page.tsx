import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = buildMetadata({
  title: "Confirm your email",
  description: "Confirm your email address.",
  path: "/verify-email",
  noIndex: true,
});

/**
 * The target of the link in the verification email.
 *
 * Every outcome gets its own words, because each needs a different action from
 * the reader: request a new link, sign in, or check they opened the newest
 * message. A single "something went wrong" would leave all three stuck.
 *
 * Nothing here reveals whether an account exists. A token that was never issued
 * simply does not match a stored hash, so an invented one is indistinguishable
 * from an expired one — which is the same property the password reset flow has.
 */

type PageProps = { searchParams: Promise<{ token?: string }> };

const OUTCOMES = {
  invalid: {
    heading: "This link is not valid",
    body: "It may have been copied incompletely, or it belongs to an account that no longer exists. Signing in and asking for a new one is the quickest way forward.",
  },
  expired: {
    heading: "This link has expired",
    body: "Verification links last 48 hours. Sign in and we will send you a fresh one straight away.",
  },
  used: {
    heading: "This link has already been used",
    body: "Each link works once. If your address is still unconfirmed, sign in and request a new one.",
  },
  address_changed: {
    heading: "This link was sent to a different address",
    body: "The email address on this account has changed since the link was sent, so it no longer proves anything about the current one. Sign in and request a new one.",
  },
} as const;

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const user = await getSessionUser();

  const result = await verifyEmailToken(token ?? "");

  if (result.ok) {
    return (
      <div className="container-page flex min-h-[55vh] items-center pb-16">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-[13px] font-medium uppercase tracking-wide text-success-700">
            {result.alreadyVerified ? "Already confirmed" : "Confirmed"}
          </p>
          <h1 className="mt-3 text-3xl">
            {result.alreadyVerified
              ? "This address was already confirmed"
              : "Your email address is confirmed"}
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
            {result.alreadyVerified
              ? "Nothing more to do. You can carry on where you left off."
              : "Thank you. You can now request quotations and place orders, and we can send you quotations, order confirmations and licence details."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href={user ? "/account" : "/login"}>
              {user ? "Go to my account" : "Sign in"}
            </ButtonLink>
            <ButtonLink href="/products" variant="outline">
              Browse the catalogue
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  const outcome = OUTCOMES[result.reason];

  return (
    <div className="container-page flex min-h-[55vh] items-center pb-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-[13px] font-medium uppercase tracking-wide text-ink-500">
          Email confirmation
        </p>
        <h1 className="mt-3 text-3xl">{outcome.heading}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">{outcome.body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={user ? "/verify-email/required" : "/login"}>
            {user ? "Send me a new link" : "Sign in"}
          </ButtonLink>
          <Link
            href="/support"
            className="inline-flex h-11 items-center px-2 text-[14px] font-medium text-accent-700 hover:underline"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}
