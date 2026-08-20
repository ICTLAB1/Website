import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthBenefits, AuthForm, AuthLayout } from "@/components/auth/auth-form";
import { Field, FormSuccess, Input } from "@/components/ui/form";
import { getSessionUser } from "@/lib/auth/session";
import { buildMetadata } from "@/lib/seo";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to track enquiries, quotations, orders, licences and renewals.",
  path: "/login",
  noIndex: true,
});

type PageProps = { searchParams: Promise<{ next?: string | string[]; registered?: string }> };

export default async function LoginPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "CUSTOMER" ? "/account" : "/admin");

  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  // Only same-site relative paths survive, so `?next=` cannot become an open
  // redirect to an attacker's domain.
  const next = safeRedirectPath(rawNext, "");

  return (
    <AuthLayout
      title="Sign in"
      description="Access your enquiries, quotations, licences and renewal calendar."
      aside={<AuthBenefits />}
    >
      {params.registered ? (
        <div className="mb-5">
          <FormSuccess>
            If that email address was available, your account is ready. Sign in below.
          </FormSuccess>
        </div>
      ) : null}

      <AuthForm
        action="/api/auth/login"
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        buildPayload={(form) => ({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
          ...(next ? { next } : {}),
        })}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[13px]">
            <Link href="/forgot-password" className="text-accent-700 hover:underline">
              Forgot your password?
            </Link>
            <span className="text-ink-500">
              No account?{" "}
              <Link href="/register" className="text-accent-700 hover:underline">
                Create one
              </Link>
            </span>
          </div>
        }
      >
        {({ fieldErrors }) => (
          <>
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
            <Field label="Password" required error={fieldErrors.password?.[0]}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  name="password"
                  type="password"
                  autoComplete="current-password"
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
