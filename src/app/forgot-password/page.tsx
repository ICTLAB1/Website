import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, AuthLayout } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Reset your password",
  description: "Request a password reset link for your account.",
  path: "/forgot-password",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email address on your account and we will send a link to set a new password. The link is valid for 30 minutes."
      aside={
        <>
          <h2 className="text-[1.15rem]">Not receiving the email?</h2>
          <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-600">
            <li>Check the spam or quarantine folder — reset emails are often filtered.</li>
            <li>Confirm you are using the address the account was created with.</li>
            <li>Only the most recent link works; earlier ones are invalidated.</li>
          </ul>
          <p className="mt-6 border-t border-line pt-5 text-[13px] text-ink-500">
            Still stuck?{" "}
            <Link href="/contact" className="text-accent-700 hover:underline">
              Contact support
            </Link>
            .
          </p>
        </>
      }
    >
      <AuthForm
        action="/api/auth/forgot-password"
        submitLabel="Send reset link"
        pendingLabel="Sending…"
        buildPayload={(form) => ({ email: String(form.get("email") ?? "") })}
        onSuccessMessage={(data) =>
          data.message ??
          "If that email address has an account, we have sent a reset link."
        }
        footer={
          <p className="pt-1 text-[13px] text-ink-500">
            Remembered it?{" "}
            <Link href="/login" className="text-accent-700 hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        {({ fieldErrors }) => (
          <Field label="Business email" required error={fieldErrors.email?.[0]}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </Field>
        )}
      </AuthForm>
    </AuthLayout>
  );
}
