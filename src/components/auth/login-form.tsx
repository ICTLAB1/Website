"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import {
  FormError,
  FormStateProvider,
  useFieldError,
} from "@/components/ui/form";
import { useAuthSubmit } from "@/components/auth/use-auth-submit";

/**
 * The sign-in form.
 *
 * Presentation only: it still posts the business email and password to
 * `/api/auth/login` through `useAuthSubmit`, with the same payload and the same
 * `next` handling, and every validation message still comes from the server.
 *
 * Two additions are interface only. The show/hide control changes the field's
 * `type` and nothing else. "Remember me" keeps the *email address* — never the
 * password — in this browser's local storage so the field is filled next time;
 * the server is not told, and there is no longer-lived session behind it.
 */

const REMEMBER_KEY = "techzoid.login.email";

const ICON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function LoginField({
  label,
  name,
  icon,
  children,
}: {
  label: string;
  name: string;
  icon: React.ReactNode;
  children: (props: {
    id: string;
    describedBy?: string;
    invalid: boolean;
    className: string;
  }) => React.ReactNode;
}) {
  const id = useId();
  const message = useFieldError(name);
  const errorId = message ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-semibold text-[#101F3B]">
        {label}
        <span className="ml-0.5 text-danger-600" aria-hidden="true">
          *
        </span>
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500"
        >
          {icon}
        </span>
        {children({
          id,
          describedBy: errorId,
          invalid: Boolean(message),
          className:
            "h-12 w-full rounded-(--radius-md) border bg-white pl-11 pr-12 text-[15px] text-ink-900 placeholder:text-ink-500 " +
            "transition-colors hover:border-ink-300 focus:border-[#F47716] focus:outline-2 focus:outline-offset-0 focus:outline-[#F47716]/40 " +
            (message ? "border-danger-600" : "border-line-strong"),
        })}
      </div>
      {message ? (
        <p id={errorId} className="text-[13px] font-medium text-danger-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const { pending, error, correlationId, fieldErrors, submit } =
    useAuthSubmit("/api/auth/login");
  const [revealed, setRevealed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);

  // Fill the address back in, if this browser was asked to keep it. Written to
  // the field directly, so the form's value never passes through React state.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(REMEMBER_KEY);
      if (saved && emailRef.current && rememberRef.current) {
        emailRef.current.value = saved;
        rememberRef.current.checked = true;
      }
    } catch {
      /* Storage can be blocked; the form works without it. */
    }
  }, []);

  function remember(email: string) {
    try {
      if (rememberRef.current?.checked && email)
        window.localStorage.setItem(REMEMBER_KEY, email);
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* Ignored: remembering the address is a convenience. */
    }
  }

  return (
    <FormStateProvider fieldErrors={fieldErrors}>
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) =>
          submit(event, (form) => {
            const email = String(form.get("email") ?? "");
            remember(email);
            return {
              email,
              password: String(form.get("password") ?? ""),
              ...(next ? { next } : {}),
            };
          })
        }
      >
        {error ? (
          <FormError>
            {error}
            {correlationId ? (
              <span className="mt-1 block font-mono text-[11px]">
                Reference: {correlationId}
              </span>
            ) : null}
          </FormError>
        ) : null}

        <LoginField
          label="Business email"
          name="email"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" {...ICON}>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3.5 7 8.5 6 8.5-6" />
            </svg>
          }
        >
          {({ id, describedBy, invalid, className }) => (
            <input
              ref={emailRef}
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="Enter your business email"
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={className}
            />
          )}
        </LoginField>

        <LoginField
          label="Password"
          name="password"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" {...ICON}>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
          }
        >
          {({ id, describedBy, invalid, className }) => (
            <>
              <input
                id={id}
                name="password"
                type={revealed ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={className}
              />
              <button
                type="button"
                onClick={() => setRevealed((value) => !value)}
                aria-pressed={revealed}
                aria-label={revealed ? "Hide characters" : "Show characters"}
                className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-(--radius-md) text-ink-600 hover:bg-career-mist hover:text-[#101F3B] focus-visible:outline-2 focus-visible:outline-[#F47716]"
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  {...ICON}
                >
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {revealed ? <path d="M4 4l16 16" /> : null}
                </svg>
              </button>
            </>
          )}
        </LoginField>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-[14px] text-ink-700">
            <input
              ref={rememberRef}
              type="checkbox"
              name="remember"
              className="h-4 w-4 rounded-(--radius-xs) border-line-strong accent-[#F47716]"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center text-[14px] font-semibold text-[#b8480a] underline-offset-2 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        <p className="-mt-3 text-[12px] text-ink-600">
          “Remember me” keeps your email address, not your password, in this
          browser only.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center rounded-(--radius-md) bg-[#F47716] px-6 text-[16px] font-bold text-[#101F3B] shadow-[0_10px_24px_-12px_rgba(244,119,22,0.9)] transition-colors hover:bg-[#ff8a33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#101F3B] disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </FormStateProvider>
  );
}
