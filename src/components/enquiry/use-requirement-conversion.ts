"use client";

import { useEffect } from "react";

import { CONVERSION_EVENTS } from "@/lib/analytics";
import { pushConversion } from "@/lib/analytics-events";
import type { RequirementState } from "@/lib/rfq";

/**
 * Reports a submitted requirement as the conversion it is.
 *
 * Both requirement forms post through a server action, so unlike the enquiry
 * basket there is no handler that observes the server's answer — the answer
 * arrives as new state and the component simply renders a confirmation. That
 * makes an effect the only correct place for this: a push in the render body
 * would run again on every re-render, and a side effect during render is the
 * kind of thing React is entitled to do twice.
 *
 * Keyed on the reference, which is also what `pushConversion` de-duplicates
 * on, so a re-render, a Strict Mode double-invoke and a remount all push once.
 *
 * It fires for the same event as the enquiry basket, deliberately. These are
 * one intention — somebody asking to be quoted — and a bidding strategy
 * optimises towards a conversion action, so splitting one intention across
 * several would starve each of them. Which form it came from travels alongside
 * for anyone reading a report.
 *
 * A visitor without JavaScript submits this form successfully and is not
 * counted, which is not a gap this could close: the tag that would count them
 * needs JavaScript too.
 */
export function useRequirementConversion(state: RequirementState, form: string): void {
  const reference = state.status === "success" ? state.reference : undefined;

  useEffect(() => {
    if (!reference) return;
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, reference, { form });
  }, [reference, form]);
}
