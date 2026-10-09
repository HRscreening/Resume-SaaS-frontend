import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/api";
import type { Profile } from "@/types";

export type UpgradePlanSlug = "pro" | "plus" | "enterprise";

interface OpenCheckoutOptions {
  plan: UpgradePlanSlug;
  cycle: "monthly" | "yearly"
  profile: Pick<Profile, "email" | "full_name" | "plan">;
  onStatusChange?: (msg: string | null) => void;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Razorpay requires browser"));
  if ((window as any).Razorpay) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new Error("Failed to load Razorpay"));
    };
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/**
 * Opens the Razorpay popup for the given plan, verifies the payment server-side,
 * and resolves once the user is upgraded. Resolves with the user's new profile.
 *
 * Rejects with Error("cancelled") if the user closes the popup without paying.
 */
export async function openRazorpayCheckout({
  plan,
  cycle,
  profile,
  onStatusChange,
}: OpenCheckoutOptions): Promise<void> {
  const order = await createRazorpayOrder({ plan, cycle });
  await loadRazorpayScript();

  await new Promise<void>((resolve, reject) => {
    let handlerFired = false;

    const onSuccess = async (paymentId: string, orderId: string, signature: string) => {
      handlerFired = true;
      try {
        await verifyRazorpayPayment({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          plan,
        });
        resolve();
      } catch {
        reject(new Error("Payment verification failed. Contact support."));
      }
    };

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: "HireSort",
      description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
      order_id: order.order_id,
      prefill: {
        email: profile.email ?? "",
        name: profile.full_name ?? "",
      },
      theme: { color: "#0F0F0F" },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        onSuccess(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
      },
      // Dismissing the modal is a user cancellation. Do not poll here: that
      // leaves the checkout button in "Processing…" for up to 20 seconds
      // (or indefinitely if a profile request hangs).
      modal: {
        ondismiss: () => {
          if (!handlerFired) reject(new Error("cancelled"));
        },
      },
    };

    // @ts-expect-error — Razorpay loaded via script tag
    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", () => {
      handlerFired = true;
      onStatusChange?.(null);
      reject(new Error("cancelled"));
    });
    rzp.open();
  });
}
