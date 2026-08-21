"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
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

  /*
   * Put back what was typed when a save is refused.
   *
   * React 19 resets an uncontrolled form once its action returns — right for a
   * form that succeeded and wrong for one that did not. An administrator
   * pasting four Azure identifiers, missing the client secret, and being told
   * so, found every field blank and the method reverted. The message was
   * accurate and the form had thrown the work away.
   *
   * So the submitted values are captured on the way out and restored on the way
   * back, and only on failure: a successful save should clear the form, which
   * is what the reset is for. Values are written to the DOM rather than held in
   * state, because these forms are deliberately uncontrolled — that is what
   * keeps them working before hydration.
   *
   * Passwords and secrets are deliberately not restored. They are write-only
   * everywhere in this panel, and re-populating one would put a credential back
   * into the page after the server had already declined to accept it.
   */
  const submitted = useRef<FormData | null>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status !== "error" || !submitted.current || !form.current) return;

    for (const [name, value] of submitted.current.entries()) {
      if (typeof value !== "string") continue;
      const field = form.current.elements.namedItem(name);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement)) {
        continue;
      }
      if (field instanceof HTMLInputElement && (field.type === "password" || field.type === "file")) continue;
      if (field instanceof HTMLInputElement && (field.type === "checkbox" || field.type === "radio")) {
        field.checked = value === "on" || value === field.value;
        continue;
      }
      field.value = value;
    }
  }, [state]);

  return (
    <form
      ref={form}
      action={(data) => {
        submitted.current = data;
        return formAction(data);
      }}
      className={compact ? "space-y-3" : "space-y-6"}
    >
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
