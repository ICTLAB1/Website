/**
 * Opening the gateway's checkout from the browser.
 *
 * A thin, typed wrapper around Razorpay's script. Kept out of the form
 * component so the form stays about the form, and so the two genuinely awkward
 * parts of this — loading a third-party script once, and the fact that its
 * "dismissed" callback also fires after a success — are handled in one place
 * rather than repeated at each call site.
 *
 * Nothing here decides what is owed. It is handed an amount that the server
 * already computed and already told the gateway about; changing it in the
 * browser changes only what this page displays, because the gateway rejects a
 * payment whose amount does not match the order it holds.
 */

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void; close: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loading: Promise<boolean> | null = null;

/**
 * Loads the checkout script, once per page.
 *
 * The promise is cached rather than the boolean, so two components mounting at
 * the same time wait on one network request instead of racing to append two
 * script tags. Resolves false rather than rejecting: a blocked or failed script
 * is an ordinary outcome — an ad blocker, an offline moment — and the caller's
 * response is the same as for any other unavailability, which is to fall back
 * to the invoice route.
 */
export function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;

  loading = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
    script.addEventListener("error", () => {
      // Let a later attempt try again rather than caching the failure forever.
      loading = null;
      resolve(false);
    });
    document.head.appendChild(script);
  });

  return loading;
}

export type PaymentHandoff = {
  keyId: string;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  mode: "TEST" | "LIVE";
  prefill: { name: string; email: string; contact: string };
};

export type CheckoutOutcome =
  | { status: "paid"; response: RazorpayHandlerResponse }
  | { status: "dismissed" }
  | { status: "unavailable" };

/**
 * Opens the gateway and resolves once the customer is finished with it.
 *
 * The `settled` flag is not defensive clutter. Razorpay calls `ondismiss` when
 * the modal closes, and the modal closes after a successful payment too — so
 * without it, every success is followed by a "dismissed" result that would
 * overwrite it and tell a customer who has just paid that they did not.
 */
export function openCheckout(
  handoff: PaymentHandoff,
  branding: { name: string; description: string },
): Promise<CheckoutOutcome> {
  return new Promise((resolve) => {
    if (!window.Razorpay) {
      resolve({ status: "unavailable" });
      return;
    }

    let settled = false;
    const settle = (outcome: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const razorpay = new window.Razorpay({
      key: handoff.keyId,
      order_id: handoff.providerOrderId,
      amount: handoff.amountMinor,
      currency: handoff.currency,
      name: branding.name,
      description: branding.description,
      prefill: handoff.prefill,
      // Cards, UPI and net banking cover practically every Indian business
      // buyer. Left to the gateway's own defaults beyond that.
      handler: (response: RazorpayHandlerResponse) => settle({ status: "paid", response }),
      modal: { ondismiss: () => settle({ status: "dismissed" }) },
      theme: { color: "#201c18" },
    });

    razorpay.open();
  });
}
