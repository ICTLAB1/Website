"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form";
import { postJson } from "@/lib/csrf-client";

/**
 * Shared submit handling for the authentication forms.
 *
 * Errors returned by the API are already safe for display: the server sends a
 * generic message plus optional per-field messages, never internal detail.
 */
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  children,
  footer,
  onSuccessMessage,
  buildPayload,
}: {
  action: string;
  submitLabel: string;
  pendingLabel: string;
  children: (state: { fieldErrors: Record<string, string[]>; pending: boolean }) => ReactNode;
  footer?: ReactNode;
  /** When set, the form shows this message instead of redirecting. */
  onSuccessMessage?: (data: { message?: string }) => string;
  buildPayload: (form: FormData) => Record<string, unknown>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCorrelationId(null);
    setSuccess(null);
    setFieldErrors({});

    const payload = buildPayload(new FormData(event.currentTarget));
    const result = await postJson<{ redirectTo?: string; message?: string }>(action, payload);

    if (!result.ok) {
      setPending(false);
      setError(result.error.message);
      setCorrelationId(result.error.correlationId ?? null);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }

    if (onSuccessMessage) {
      setPending(false);
      setSuccess(onSuccessMessage(result.data));
      return;
    }

    // Keep the pending state through navigation so the button cannot be
    // double-submitted while the route transition is in flight.
    router.push(result.data.redirectTo ?? "/account");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error ? (
        <FormError>
          {error}
          {correlationId ? (
            <span className="mt-1 block font-mono text-[11px]">Reference: {correlationId}</span>
          ) : null}
        </FormError>
      ) : null}
      {success ? <FormSuccess>{success}</FormSuccess> : null}

      {children({ fieldErrors, pending })}

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>

      {footer}
    </form>
  );
}

/** Shared shell so every auth page has the same framing. */
export function AuthLayout({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="container-page py-14 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="text-[1.85rem] sm:text-3xl">{title}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-600">{description}</p>
          <div className="mt-8">{children}</div>
        </div>

        {aside ? (
          <aside className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8 lg:mt-14">
            {aside}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

export function AuthBenefits() {
  return (
    <>
      <h2 className="text-[1.15rem]">Why create an account</h2>
      <ul className="mt-5 space-y-4 text-[14px] leading-relaxed text-ink-600">
        {[
          "Track every enquiry and quotation in one place, with their references.",
          "See your licence position and upcoming renewal dates across vendors.",
          "Store your company details and GSTIN once, so every invoice carries them correctly.",
          "Reorder or renew without rebuilding the requirement from scratch.",
        ].map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="mt-1 shrink-0 text-accent-700">
              <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor">
                <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
              </svg>
            </span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-line pt-5 text-[13px] text-ink-500">
        You can request a quotation without an account.{" "}
        <Link href="/enquiry" className="text-accent-700 hover:underline">
          Go straight to an enquiry
        </Link>
        .
      </p>
    </>
  );
}
