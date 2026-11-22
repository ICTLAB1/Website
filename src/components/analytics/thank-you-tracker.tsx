"use client";

import { useEffect, useSyncExternalStore } from "react";

import { pendingLead, trackLead } from "@/lib/meta-client";

/**
 * Reports the lead from the thank-you page, if the form page did not, and shows
 * the reference.
 *
 * What is reported comes from what the form flow stored in this tab, never from
 * the address: somebody who types /thank-you into the bar has nothing stored, so
 * nothing is reported and no reference is shown. Where the form page already
 * reported the same enquiry, `trackLead` finds its id recorded and does nothing.
 *
 * Read through `useSyncExternalStore` because the value lives in the browser and
 * the server cannot know it: the server snapshot is null, so hydration agrees.
 */
const subscribe = () => () => {};

export function ThankYouTracker() {
  const reference = useSyncExternalStore(subscribe, pendingLead, () => null);

  useEffect(() => {
    if (reference) trackLead(reference);
  }, [reference]);

  if (!reference) return null;
  return (
    <div className="mt-6 inline-block rounded-(--radius-lg) border border-line bg-surface-muted px-6 py-4">
      <p className="text-[12px] uppercase tracking-wide text-ink-500">Your reference</p>
      <p className="mt-1 font-mono text-[20px] font-semibold text-graphite-900">{reference}</p>
    </div>
  );
}
