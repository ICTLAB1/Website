"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, FormError, FormStateProvider, Input } from "@/components/ui/form";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";

export function RegisterForm({ passwordMinLength }: { passwordMinLength: number }) {
  const { pending, error, correlationId, fieldErrors, submit } = useAuthSubmit("/api/auth/register");

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) =>
          submit(event, (form) => ({
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
            companyName: String(form.get("companyName") ?? ""),
            phone: String(form.get("phone") ?? ""),
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

        <Field label="Full name" name="name" required>
          <Input name="name" autoComplete="name" autoFocus required />
        </Field>

        <Field label="Company name" name="companyName" required>
          <Input name="companyName" autoComplete="organization" required />
        </Field>

        <Field label="Business email" name="email" required>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>

        <Field label="Phone" name="phone">
          <Input name="phone" type="tel" autoComplete="tel" />
        </Field>

        <Field
          label="Password"
          name="password"
          required
          hint={`At least ${passwordMinLength} characters, with upper and lower case letters and a number.`}
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={passwordMinLength}
            required
          />
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

        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <p className="pt-1 text-[13px] text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-700 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </FormStateProvider>
  );
}
