"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/csrf-client";

/**
 * Paying for an order from the customer's own order list.
 *
 * The second attempt: the card that was declined, the tab closed halfway
 * through, the invoice somebody has decided to settle by card after all. The
 * order already exists and nothing about it changes here — a failed attempt
 * leaves it exactly as it was, still payable by transfer.
 *
 * The amount is not passed in. It comes back from the server, which reads it
 * from the order, so this component cannot display a figure that differs from
 * the one the gateway will charge.
 *
 * ## Why there is no script to load any more
 *
 * The gateway is Stripe's hosted Checkout: the server opens a session and this
 * sends the browser to it. No third-party script is fetched, no payment window
 * is opened over the page, and no ad blocker can prevent it — which removes the
 * failure mode this button used to have to explain, along with the "dismissed"
 * callback that also fired on success.
 *
 * Nothing is recorded here. `router.refresh()` is gone too, because the page is
 * leaving: the customer comes back to the order page with a session id, and
 * that page asks Stripe what happened.
 */
export function PayOrderButton({ reference }: { reference: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);

    const started = await postJson<{ checkoutUrl: string }>("/api/payments/start", { reference });
    if (!started.ok) {
      setPending(false);
      setError(started.error.message);
      return;
    }

    /*
     * `assign`, not `replace`. The order page stays in history, so a customer
     * who thinks better of it at Stripe can use the back button and arrive
     * somewhere sensible rather than on whatever preceded the order.
     *
     * `pending` is deliberately left true: the navigation is in flight and
     * re-enabling the button would invite a second session nobody needs.
     */
    window.location.assign(started.data.checkoutUrl);
  }

  return (
    <div>
      <Button type="button" size="sm" onClick={pay} disabled={pending}>
        {pending ? "Opening…" : "Pay now"}
      </Button>
      {error ? <p className="mt-1 text-[12px] text-danger-700">{error}</p> : null}
    </div>
  );
}
