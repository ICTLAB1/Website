"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postJson } from "@/lib/csrf-client";
import {
  loadCheckoutScript,
  openCheckout,
  type PaymentHandoff,
} from "@/lib/payments/checkout-client";

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
 */
export function PayOrderButton({
  reference,
  merchantName,
}: {
  reference: string;
  merchantName: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setPending(true);
    setError(null);

    const ready = await loadCheckoutScript();
    if (!ready) {
      setPending(false);
      setError("The payment window could not be opened. An ad blocker may be preventing it.");
      return;
    }

    const started = await postJson<PaymentHandoff>("/api/payments/start", { reference });
    if (!started.ok) {
      setPending(false);
      setError(started.error.message);
      return;
    }

    const outcome = await openCheckout(started.data, {
      name: merchantName,
      description: `Order ${reference}`,
    });

    if (outcome.status !== "paid") {
      setPending(false);
      // Not an error. Closing the payment window is a decision, not a failure,
      // and telling somebody their payment "failed" when they chose to stop is
      // both wrong and alarming.
      return;
    }

    await postJson("/api/payments/verify", {
      razorpay_order_id: outcome.response.razorpay_order_id,
      razorpay_payment_id: outcome.response.razorpay_payment_id,
      razorpay_signature: outcome.response.razorpay_signature,
    });

    // Re-read from the server rather than setting a local "paid" flag. The
    // webhook may have recorded this first, and the row is the truth.
    router.refresh();
    setPending(false);
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
