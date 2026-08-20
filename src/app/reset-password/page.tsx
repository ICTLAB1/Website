import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm, AuthLayout } from "@/components/auth/auth-form";
import { Field, Input } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Set a new password",
  description: "Choose a new password for your account.",
  path: "/reset-password",
  noIndex: true,
});

type PageProps = { searchParams: Promise<{ token?: string | string[] }> };

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  // The token is only ever validated server-side, on submission. Rendering the
  // form does not confirm whether a token is genuine.
  if (!token || token.length < 20) {
    return (
      <AuthLayout
        title="This reset link is not valid"
        description="The link is incomplete or has already been used. Request a new one and use the most recent email we send."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/forgot-password">Request a new link</ButtonLink>
          <ButtonLink href="/login" variant="outline">
            Back to sign in
          </ButtonLink>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      description="Choose a password you do not use anywhere else. Signing in elsewhere will be ended when you change it."
    >
      <AuthForm
        action="/api/auth/reset-password"
        submitLabel="Change password"
        pendingLabel="Changing password…"
        buildPayload={(form) => ({
          token: String(form.get("token") ?? ""),
          password: String(form.get("password") ?? ""),
        })}
        onSuccessMessage={(data) =>
          data.message ?? "Your password has been changed. You can now sign in."
        }
        footer={
          <p className="pt-1 text-[13px] text-ink-500">
            <Link href="/login" className="text-accent-700 hover:underline">
              Go to sign in
            </Link>
          </p>
        }
      >
        {({ fieldErrors }) => (
          <>
            <input type="hidden" name="token" value={token} />
            <Field
              label="New password"
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
                  autoFocus
                  required
                  aria-describedby={describedBy}
                  invalid={invalid}
                />
              )}
            </Field>
          </>
        )}
      </AuthForm>
    </AuthLayout>
  );
}
