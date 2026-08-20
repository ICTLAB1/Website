"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * Every control is wired to a real <label>, and validation messages are linked
 * with aria-describedby + aria-invalid so screen readers announce the error
 * with the field rather than as loose text.
 */

const CONTROL_BASE =
  "w-full rounded-[--radius-md] border bg-white px-3 text-sm text-ink-900 " +
  "placeholder:text-ink-400 transition-colors " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-500";

const CONTROL_STATE = {
  normal: "border-line-strong hover:border-ink-300 focus:border-accent-600",
  invalid: "border-danger-600 focus:border-danger-600",
};

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Receives the ids to attach to the control. */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-800">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-[12px] font-normal text-ink-400">(optional)</span>
        )}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-[12px] text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[12px] font-medium text-danger-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cn(CONTROL_BASE, "h-11", invalid ? CONTROL_STATE.invalid : CONTROL_STATE.normal, className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(
        CONTROL_BASE,
        "min-h-28 py-2.5 leading-relaxed",
        invalid ? CONTROL_STATE.invalid : CONTROL_STATE.normal,
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select"> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        CONTROL_BASE,
        "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b7280%22><path d=%22M5.5 7.5 10 12l4.5-4.5z%22/></svg>')] bg-[length:20px_20px] bg-[right_0.5rem_center] bg-no-repeat pr-9",
        invalid ? CONTROL_STATE.invalid : CONTROL_STATE.normal,
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function Checkbox({
  label,
  className,
  ...props
}: ComponentPropsWithoutRef<"input"> & { label: ReactNode }) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[--radius-xs] border-line-strong text-accent-700 accent-[var(--color-accent-700)]"
        {...props}
      />
      <label htmlFor={id} className="text-[13px] leading-snug text-ink-700">
        {label}
      </label>
    </div>
  );
}

/** Form-level error summary, announced when it appears. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-[--radius-md] border border-danger-600/30 bg-danger-50 px-4 py-3 text-[13px] text-danger-700"
    >
      {children}
    </div>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="status"
      className="rounded-[--radius-md] border border-success-600/30 bg-success-50 px-4 py-3 text-[13px] text-success-700"
    >
      {children}
    </div>
  );
}

export function Fieldset({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-sm font-semibold text-navy-900">{legend}</legend>
      {description ? <p className="mt-1 text-[13px] text-ink-500">{description}</p> : null}
      <div className="mt-4 grid gap-4">{children}</div>
    </fieldset>
  );
}
