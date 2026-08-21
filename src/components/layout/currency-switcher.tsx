"use client";

import { useRef } from "react";

import { setDisplayCurrency } from "@/app/currency-action";
import type { CurrencyOption, DisplayCurrency } from "@/lib/currency";

/**
 * Reading the catalogue in another currency.
 *
 * A real `<form>` around a real `<select>`, submitting to a server action. It
 * therefore works before JavaScript has loaded and with it switched off — which
 * matters more here than it looks, because this sits in the header of every
 * page and a control that silently does nothing on a slow connection is worse
 * than one that is not there.
 *
 * The `onChange` submit is a convenience on top of that, not the mechanism.
 * Without JavaScript the visitor gets a "Go" button instead; with it, choosing
 * is enough.
 *
 * Rendered only when there is more than one currency to choose between, so a
 * deployment that has not set a rate shows nothing at all rather than a
 * one-item dropdown.
 */
export function CurrencySwitcher({
  current,
  options,
}: {
  current: DisplayCurrency;
  options: CurrencyOption[];
}) {
  const form = useRef<HTMLFormElement>(null);
  if (options.length < 2) return null;

  return (
    <form ref={form} action={setDisplayCurrency} className="flex items-center gap-1.5">
      <label htmlFor="display-currency" className="sr-only">
        Show prices in
      </label>
      <select
        id="display-currency"
        name="currency"
        defaultValue={current}
        onChange={() => form.current?.requestSubmit()}
        className="h-9 cursor-pointer rounded-[--radius-md] border border-line-strong bg-white px-2 text-[13px] font-medium text-graphite-900 transition-colors hover:border-graphite-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {/*
        * The fallback for a visitor whose JavaScript has not arrived. Hidden
        * once it has, by the same stylesheet that hides it for everyone else —
        * `noscript` cannot wrap a form control that must also be submitted by
        * script, so this is the way round that works in both states.
        */}
      <noscript>
        <button
          type="submit"
          className="h-9 rounded-[--radius-md] border border-line-strong px-2 text-[13px] font-medium"
        >
          Go
        </button>
      </noscript>
    </form>
  );
}
