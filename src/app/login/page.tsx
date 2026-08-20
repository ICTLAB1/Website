import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthBenefits, AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { FormSuccess } from "@/components/ui/form";
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

      <LoginForm next={next || undefined} />
    </AuthLayout>
  );
}
