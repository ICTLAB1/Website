import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthBenefits, AuthForm, AuthLayout } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Create an account",
  description:
    "Create a business account to track enquiries, quotations, licences and renewals across vendors.",
  path: "/register",
  noIndex: true,
});

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) redirect("/account");

  return (
    <AuthLayout
      title="Create an account"
      description="For organisations buying software licensing. One account covers your enquiries, quotations, orders and renewals."
      aside={<AuthBenefits />}
    >
      <AuthForm
        action="/api/auth/register"
        submitLabel="Create account"
        pendingLabel="Creating account…"
        buildPayload={(form) => ({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          companyName: String(form.get("companyName") ?? ""),
          phone: String(form.get("phone") ?? ""),
        })}
        footer={
          <p className="pt-1 text-[13px] text-ink-500">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-700 hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        {({ fieldErrors }) => (
          <>
            <Field label="Full name" required error={fieldErrors.name?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="name" autoComplete="name" required autoFocus aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field label="Company name" required error={fieldErrors.companyName?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="companyName" autoComplete="organization" required aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field label="Business email" required error={fieldErrors.email?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="email" type="email" autoComplete="email" required aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field label="Phone" error={fieldErrors.phone?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="phone" type="tel" autoComplete="tel" aria-describedby={describedBy} invalid={invalid} />
              )}
            </Field>
            <Field
              label="Password"
              required
              hint={`At least ${PASSWORD_MIN_LENGTH} characters, with upper and lower case letters and a number.`}
              error={fieldErrors.password?.[0]}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  required
                  aria-describedby={describedBy}
                  invalid={invalid}
                />
              )}
            </Field>
            <p className="text-[12px] leading-relaxed text-ink-500">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-accent-700 underline">
                terms of service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-accent-700 underline">
                privacy policy
              </Link>
              .
            </p>
          </>
        )}
      </AuthForm>
    </AuthLayout>
  );
}
