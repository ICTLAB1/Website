"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormError, FormStateProvider, FormSuccess } from "@/components/ui/form";
import type { AdminActionState } from "@/app/admin/actions";

function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AdminForm({
  action,
  submitLabel,
  pendingLabel,
  variant,
  hidden,
  children,
  compact = false,
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  submitLabel: string;
  pendingLabel: string;
  variant?: "primary" | "outline" | "danger";
  hidden?: Record<string, string>;
  children?: ReactNode;
  compact?: boolean;
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, {
    status: "idle",
  });

  return (
    <form action={formAction} className={compact ? "space-y-3" : "space-y-6"}>
      {state.status === "error" && state.message ? <FormError>{state.message}</FormError> : null}
      {state.status === "success" && state.message ? (
        <FormSuccess>{state.message}</FormSuccess>
      ) : null}

      {hidden
        ? Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))
        : null}

      <FormStateProvider fieldErrors={state.fieldErrors ?? {}}>{children}</FormStateProvider>

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} />
    </form>
  );
}
