"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/csrf-client";

type SubmitResult = { redirectTo?: string; message?: string };

/**
 * Shared submit handling for the authentication forms.
 *
 * API errors are already safe for display: the server returns a generic
 * message plus optional per-field messages, never internal detail.
 */
export function useAuthSubmit(action: string, options: { redirectFallback?: string } = {}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
    buildPayload: (form: FormData) => Record<string, unknown>,
    onSuccessMessage?: (data: SubmitResult) => string,
  ) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setCorrelationId(null);
    setSuccess(null);
    setFieldErrors({});

    const payload = buildPayload(new FormData(event.currentTarget));
    const result = await postJson<SubmitResult>(action, payload);

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

    // The pending state is kept through navigation so the button cannot be
    // submitted twice while the route transition is in flight.
    router.push(result.data.redirectTo ?? options.redirectFallback ?? "/account");
    router.refresh();
  }

  return { pending, error, correlationId, success, fieldErrors, submit };
}
