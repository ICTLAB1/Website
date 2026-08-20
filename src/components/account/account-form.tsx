"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormError, FormStateProvider, FormSuccess } from "@/components/ui/form";
import type { ActionState } from "@/app/account/actions";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  // useFormStatus reads the enclosing form's pending state, so the button
  // disables itself for the duration of the action without extra plumbing.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
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
  children,
}: {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, { status: "idle" });

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "error" && state.message ? <FormError>{state.message}</FormError> : null}
      {state.status === "success" && state.message ? (
        <FormSuccess>{state.message}</FormSuccess>
      ) : null}

      <FormStateProvider fieldErrors={state.fieldErrors ?? {}}>{children}</FormStateProvider>

      <div className="border-t border-line pt-5">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </div>
    </form>
  );
}
