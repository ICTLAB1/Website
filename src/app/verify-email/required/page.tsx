import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminForm } from "@/components/admin/admin-form";
import { ButtonLink } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { requireUser } from "@/lib/auth/guards";
import { verificationEnforced } from "@/lib/auth/email-verification";
import { Field, Input } from "@/components/ui/form";
import { CODE_TTL_MINUTES } from "@/lib/auth/otp";
import {
  confirmVerificationCode,
  resendVerificationEmail,
} from "@/app/verify-email/required/actions";

export const metadata: Metadata = buildMetadata({
  title: "Confirm your email",
  description: "Confirm your email address to request quotations and place orders.",
  path: "/verify-email/required",
  noIndex: true,
});

/**
 * Where an unverified account lands when it tries to transact.
 *
 * The job of this page is to be a door, not a wall. It says what is blocked,
 * why, and offers the one action that fixes it — and it is honest that browsing
 * and the account itself are unaffected, so nobody thinks they have been locked
 * out of something they have already paid for.
 *
 * A verified user who arrives here by an old link or the back button is sent
 * on rather than shown a page about a problem they do not have.
 */
export default async function VerificationRequiredPage() {
  const user = await requireUser("/verify-email/required");

  if (!(await verificationEnforced()) || user.emailVerified) redirect("/account");

  return (
    <div className="container-page pb-16">
      <div className="mx-auto max-w-xl py-10">
        <p className="text-[13px] font-medium uppercase tracking-wide text-ink-500">
          One step left
        </p>
        <h1 className="mt-3 text-3xl">Confirm your email address</h1>

        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          We emailed a six-digit code to{" "}
          <strong className="text-graphite-900">{user.email}</strong> when you registered. Enter
          it below, or open the link in the same message.
        </p>

        {/*
          The code first, and the link second, because the code is the faster
          path on the device most people register on. Somebody reading their
          email on a phone and filling this form on a laptop cannot follow a
          link across the gap; they can read six digits across it.
        */}
        <div className="mt-8 rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-graphite-900">Enter your code</h2>
          <AdminForm
            action={confirmVerificationCode}
            submitLabel="Confirm"
            pendingLabel="Checking…"
            compact
          >
            <Field
              label="Six-digit code"
              name="code"
              required
              hint={`It expires ${CODE_TTL_MINUTES} minutes after we send it. Spaces and dashes are fine.`}
            >
              <Input
                name="code"
                /*
                  `inputMode="numeric"` brings up the number pad on a phone, and
                  `autoComplete="one-time-code"` is what lets iOS and Android
                  offer the code straight from the notification — the single
                  thing that makes an OTP pleasant rather than a chore. Not
                  `type="number"`, which adds spinners and drops leading zeros.
                */
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={16}
                required
                autoFocus
                placeholder="123 456"
                className="max-w-[12rem] font-mono text-lg tracking-[0.3em]"
              />
            </Field>
          </AdminForm>
        </div>

        <div className="mt-8 rounded-[--radius-lg] border border-line bg-white p-5">
          <h2 className="text-[15px] font-semibold text-graphite-900">Why we ask</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            Quotations, order confirmations, invoices and licence keys are all sent to this
            address. A single mistyped character would send yours to somebody else, or nowhere
            at all — so we confirm it before anything is issued.
          </p>
        </div>

        <div className="mt-6 rounded-[--radius-lg] border border-line bg-surface-muted p-5">
          <h2 className="text-[15px] font-semibold text-graphite-900">
            What you can still do
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
            Everything except transacting. Browse the catalogue, build an enquiry basket and use
            your account as normal. Only submitting an enquiry, accepting a quotation and
            placing an order wait for confirmation.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold text-graphite-900">
            Not arrived, or expired?
          </h2>
          <p className="mb-4 text-[14px] leading-relaxed text-ink-600">
            Check your spam folder first — that is where it usually is. Otherwise we will send a
            new code, which replaces the old one.
          </p>
          <AdminForm
            action={resendVerificationEmail}
            submitLabel="Send a new code"
            pendingLabel="Sending…"
            variant="outline"
            compact
          />
        </div>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
          <ButtonLink href="/products" variant="outline">
            Browse the catalogue
          </ButtonLink>
          <ButtonLink href="/support" variant="ghost">
            Contact support
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
