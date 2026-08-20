"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormStateProvider, FormSuccess, Input } from "@/components/ui/form";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";

export function ForgotPasswordForm() {
  const { pending, error, correlationId, success, fieldErrors, submit } = useAuthSubmit(
    "/api/auth/forgot-password",
  );

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) =>
          submit(
            event,
            (form) => ({ email: String(form.get("email") ?? "") }),
            (data) =>
              data.message ?? "If that email address has an account, we have sent a reset link.",
          )
        }
      >
        {error ? (
          <FormError>
            {error}
            {correlationId ? (
              <span className="mt-1 block font-mono text-[11px]">Reference: {correlationId}</span>
            ) : null}
          </FormError>
        ) : null}
        {success ? <FormSuccess>{success}</FormSuccess> : null}

        <Field label="Business email" name="email" required>
          <Input name="email" type="email" autoComplete="email" autoFocus required />
        </Field>

        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>

        <p className="pt-1 text-[13px] text-ink-500">
          Remembered it?{" "}
          <Link href="/login" className="text-accent-700 underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </form>
    </FormStateProvider>
  );
}

export function ResetPasswordForm({
  token,
  passwordMinLength,
}: {
  token: string;
  passwordMinLength: number;
}) {
  const { pending, error, correlationId, success, fieldErrors, submit } = useAuthSubmit(
    "/api/auth/reset-password",
  );

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) =>
          submit(
            event,
            (form) => ({
              token: String(form.get("token") ?? ""),
              password: String(form.get("password") ?? ""),
            }),
            (data) => data.message ?? "Your password has been changed. You can now sign in.",
          )
        }
      >
        {error ? (
          <FormError>
            {error}
            {correlationId ? (
              <span className="mt-1 block font-mono text-[11px]">Reference: {correlationId}</span>
            ) : null}
          </FormError>
        ) : null}
        {success ? <FormSuccess>{success}</FormSuccess> : null}

        <input type="hidden" name="token" value={token} />

        <Field
          label="New password"
          name="password"
          required
          hint={`At least ${passwordMinLength} characters, with upper and lower case letters and a number.`}
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={passwordMinLength}
            autoFocus
            required
          />
        </Field>

        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Changing password…" : "Change password"}
        </Button>

        <p className="pt-1 text-[13px] text-ink-500">
          <Link href="/login" className="text-accent-700 underline underline-offset-2">
            Go to sign in
          </Link>
        </p>
      </form>
    </FormStateProvider>
  );
}
