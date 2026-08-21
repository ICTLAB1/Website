import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

import { getSiteConfig } from "@/lib/site-config";
import {
  availableCurrencies,
  CURRENCY_COOKIE,
  resolveCurrency,
  type CurrencyOption,
  type DisplayCurrency,
  type ExchangeRates,
} from "@/lib/currency";

/**
 * The currency this request is being read in, resolved once.
 *
 * Wrapped in React's `cache` because a catalogue page asks for it from the
 * header, the product grid and every card on it; without this that is one
 * cookie read and one settings read per price on the page.
 *
 * Falls back to rupees for anything unset, unrecognised or unpriced, so a
 * cookie carrying "BTC" — or "USD" on a deployment that never set a dollar
 * rate — is simply ignored rather than producing a rupee figure under the
 * wrong symbol.
 */
export const getDisplayCurrency = cache(
  async (): Promise<{
    currency: DisplayCurrency;
    rates: ExchangeRates;
    options: CurrencyOption[];
  }> => {
    const config = await getSiteConfig();
    const rates = config.rates;
    const requested = (await cookies()).get(CURRENCY_COOKIE)?.value;

    return {
      currency: resolveCurrency(requested, rates),
      rates,
      options: availableCurrencies(rates),
    };
  },
);
