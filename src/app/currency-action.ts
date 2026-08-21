"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { CURRENCY_COOKIE, isDisplayCurrency } from "@/lib/currency";

/**
 * Remembers which currency a visitor is reading prices in.
 *
 * A cookie rather than a URL parameter or an account preference. It has to
 * survive across every page of a browse, it has to work for the anonymous
 * visitor who makes up most of the traffic, and putting it in the URL would
 * fork every catalogue page into three addresses for search engines to index —
 * three URLs showing the same product at three numbers, which is exactly the
 * duplication the canonical tags exist to prevent.
 *
 * Not HttpOnly: it is a display preference, not a credential, and there is
 * nothing to protect. `sameSite: lax` so following a link into the site keeps
 * it. A year, because somebody buying from Dubai is still buying from Dubai
 * next month.
 *
 * No validation of "may this visitor use this currency" is needed, because
 * there is no such thing — an unpriced currency simply resolves back to rupees
 * when the page reads it.
 */
export async function setDisplayCurrency(formData: FormData): Promise<void> {
  const requested = formData.get("currency");
  if (!isDisplayCurrency(requested)) return;

  const store = await cookies();
  store.set(CURRENCY_COOKIE, requested, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  // Prices appear on nearly every page, so the whole tree is re-rendered rather
  // than guessing which route the visitor is on.
  revalidatePath("/", "layout");
}
