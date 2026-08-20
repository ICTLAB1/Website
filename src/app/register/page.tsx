import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthBenefits, AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";
import { getSessionUser } from "@/lib/auth/session";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
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
      <RegisterForm passwordMinLength={PASSWORD_MIN_LENGTH} />
    </AuthLayout>
  );
}
