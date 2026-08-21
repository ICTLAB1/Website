"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Form primitives.
 *
 * `Field` wires a real <label>, hint and error message to its control by
 * cloning the child element and injecting `id`, `aria-describedby` and
 * `aria-invalid`. Validation messages arrive through context rather than as a
 * render prop, so a Server Component can render these fields directly - a
 * function prop cannot cross the server/client boundary.
 */

type FormState = { fieldErrors: Record<string, string[]> };

const FormStateContext = createContext<FormState>({ fieldErrors: {} });

export function FormStateProvider({
  fieldErrors,
  children,
}: {
  fieldErrors: Record<string, string[]>;
  children: ReactNode;
}) {
  return (
    <FormStateContext.Provider value={{ fieldErrors }}>{children}</FormStateContext.Provider>
  );
}

export function useFieldError(name?: string): string | undefined {
  const { fieldErrors } = useContext(FormStateContext);
  if (!name) return undefined;
  return fieldErrors[name]?.[0];
}

const CONTROL_BASE =
  "w-full rounded-[--radius-md] border bg-white px-3 text-sm text-ink-900 " +
  "placeholder:text-ink-500 transition-colors " +
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-500";

const CONTROL_STATE = {
  normal: "border-line-strong hover:border-ink-300 focus:border-accent-600",
  invalid: "border-danger-600 focus:border-danger-600",
};

export function Field({
  label,
  name,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  /** Matches the control's `name`, used to look up its validation message. */
  name?: string;
  hint?: string;
  /** Explicit message; otherwise taken from the enclosing form state. */
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const contextError = useFieldError(name);
  const message = error ?? contextError;

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = message ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const child = Children.only(children);
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<Record<string, unknown>>, {
        id,
        name: (child.props as { name?: string }).name ?? name,
        "aria-describedby": describedBy,
        "aria-invalid": message ? true : undefined,
        "data-invalid": message ? "true" : undefined,
      })
    : child;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-800">
        {label}
        {required ? (
          <span className="ml-0.5 text-danger-600" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-[12px] font-normal text-ink-500">(optional)</span>
        )}
      </label>

      {control}

      {hint ? (
        <p id={hintId} className="text-[12px] text-ink-500">
          {hint}
        </p>
      ) : null}
      {message ? (
        <p id={errorId} className="text-[12px] font-medium text-danger-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** `data-invalid` is set by Field; the control styles itself from it. */
const INVALID_SELECTOR = "data-[invalid=true]:border-danger-600";

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(CONTROL_BASE, "h-11", CONTROL_STATE.normal, INVALID_SELECTOR, className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        CONTROL_BASE,
        "min-h-28 py-2.5 leading-relaxed",
        CONTROL_STATE.normal,
        INVALID_SELECTOR,
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        CONTROL_BASE,
        "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b7280%22><path d=%22M5.5 7.5 10 12l4.5-4.5z%22/></svg>')] bg-[length:20px_20px] bg-[right_0.5rem_center] bg-no-repeat pr-9",
        CONTROL_STATE.normal,
        INVALID_SELECTOR,
        className,
      )}
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
        className="mt-0.5 h-4 w-4 shrink-0 rounded-[--radius-xs] border-line-strong accent-[var(--color-accent-700)]"
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
      <legend className="text-sm font-semibold text-graphite-900">{legend}</legend>
      {description ? <p className="mt-1 text-[13px] text-ink-500">{description}</p> : null}
      <div className="mt-4 grid gap-4">{children}</div>
    </fieldset>
  );
}

/** Hidden from people, tempting to bots. Paired with a server-side check. */
export function Honeypot({ name = "website" }: { name?: string }) {
  const id = useId();
  return (
    <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
      <label htmlFor={id}>Leave this field empty</label>
      <input id={id} name={name} type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}
