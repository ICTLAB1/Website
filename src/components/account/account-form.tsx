"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormError, FormStateProvider, FormSuccess } from "@/components/ui/form";
import type { ActionState } from "@/app/account/actions";

function SubmitButton({
  label,
  pendingLabel,
  variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "outline" | "danger";
}) {
  // useFormStatus reads the enclosing form's pending state, so the button
  // disables itself for the duration of the action without extra plumbing.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * Wraps a Server Action form.
 *
 * Children are ordinary React nodes so a Server Component can render the fields
 * directly; validation messages reach them through FormStateProvider rather
 * than a render prop, which cannot cross the server/client boundary.
 */
export function AccountForm({
  action,
  submitLabel,
  pendingLabel,
  variant,
  hidden,
  compact = false,
  children,
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
  variant?: "primary" | "outline" | "danger";
  /** Values the form carries but does not ask for, e.g. which row it acts on. */
  hidden?: Record<string, string>;
  /** Tighter spacing and no rule above the button, for a form inside a row. */
  compact?: boolean;
  children?: ReactNode;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, { status: "idle" });

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

      {compact ? (
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} />
      ) : (
        <div className="border-t border-line pt-5">
          <SubmitButton label={submitLabel} pendingLabel={pendingLabel} variant={variant} />
        </div>
      )}
    </form>
  );
}
