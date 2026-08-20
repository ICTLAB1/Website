import type { Metadata } from "next";

import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { ButtonLink } from "@/components/ui/button";
import { PASSWORD_MIN_LENGTH } from "@/lib/password-policy";
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
      <ResetPasswordForm token={token} passwordMinLength={PASSWORD_MIN_LENGTH} />
    </AuthLayout>
  );
}
