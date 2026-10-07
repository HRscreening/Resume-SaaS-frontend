import { createPayPalOrder, capturePayPalOrder } from "@/lib/api";
import type { UpgradePlanSlug } from "@/lib/razorpay";

interface PayPalButtonsInstance {
  render: (container: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}

interface PayPalNamespace {
  Buttons: (options: {
    style?: Record<string, string | number | boolean>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

const SDK_URL = "https://www.paypal.com/sdk/js";
// PayPal only ever takes our USD checkouts; India pays through Razorpay.
const SDK_CURRENCY = "USD";

let sdkPromise: Promise<PayPalNamespace> | null = null;

function loadPayPalSdk(clientId: string): Promise<PayPalNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("PayPal requires browser"));
  if (window.paypal) return Promise.resolve(window.paypal);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<PayPalNamespace>((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      "client-id": clientId,
      currency: SDK_CURRENCY,
      intent: "capture",
      components: "buttons",
    });
    script.src = `${SDK_URL}?${params.toString()}`;
    script.onload = () => {
      if (window.paypal) resolve(window.paypal);
      else {
        sdkPromise = null;
        reject(new Error("Failed to load PayPal"));
      }
    };
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Failed to load PayPal"));
    };
    document.body.appendChild(script);
  });
  return sdkPromise;
}

interface RenderOptions {
  container: HTMLElement;
  clientId: string;
  plan: UpgradePlanSlug;
  cycle: "monthly" | "yearly";
  /** The payment was captured and the plan is upgraded. */
  onPaid: () => void;
  /** PayPal accepted the payment but is still reviewing it. */
  onPending: () => void;
  onError: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Renders PayPal's own buttons into `container`. PayPal draws and owns them
 * (they cannot be triggered from a button of ours), so checkout swaps its
 * Pay button for this container.
 *
 * The order is created and captured by our server; the browser only relays
 * the order id. Returns a cleanup function that removes the buttons.
 */
export async function renderPayPalButtons({
  container,
  clientId,
  plan,
  cycle,
  onPaid,
  onPending,
  onError,
  onBusyChange,
}: RenderOptions): Promise<() => void> {
  const paypal = await loadPayPalSdk(clientId);

  const buttons = paypal.Buttons({
    style: { layout: "vertical", shape: "rect", label: "pay", height: 48 },
    createOrder: async () => {
      const order = await createPayPalOrder({ plan, cycle });
      return order.order_id;
    },
    onApprove: async ({ orderID }) => {
      onBusyChange?.(true);
      try {
        const result = await capturePayPalOrder(orderID);
        if (result.success) onPaid();
        else if (result.pending) onPending();
        else onError("Payment could not be confirmed. Contact support.");
      } catch (err) {
        onError(err instanceof Error ? err.message : "Payment could not be confirmed. Contact support.");
      } finally {
        onBusyChange?.(false);
      }
    },
    onError: (err) => {
      // Covers a failed createOrder too: surface our server's message when there is one.
      onError(err instanceof Error && err.message ? err.message : "Payment failed. Please try again.");
    },
  });

  await buttons.render(container);
  return () => {
    buttons.close().catch(() => {
      /* already removed with its container */
    });
  };
}
