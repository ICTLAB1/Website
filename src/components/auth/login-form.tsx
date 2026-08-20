"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormStateProvider, Input } from "@/components/ui/form";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";

export function LoginForm({ next }: { next?: string }) {
  const { pending, error, correlationId, fieldErrors, submit } = useAuthSubmit("/api/auth/login");

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) =>
          submit(event, (form) => ({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            ...(next ? { next } : {}),
          }))
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

        <Field label="Business email" name="email" required>
          <Input name="email" type="email" autoComplete="email" autoFocus required />
        </Field>

        <Field label="Password" name="password" required>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>

        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[13px]">
          <Link href="/forgot-password" className="text-accent-700 underline underline-offset-2">
            Forgot your password?
          </Link>
          <span className="text-ink-500">
            No account?{" "}
            <Link href="/register" className="text-accent-700 underline underline-offset-2">
              Create one
            </Link>
          </span>
        </div>
      </form>
    </FormStateProvider>
  );
}
