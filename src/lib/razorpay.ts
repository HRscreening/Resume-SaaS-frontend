import { createRazorpayOrder, verifyRazorpayPayment, getProfile } from "@/lib/api";
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
  const previousPlan = profile.plan;

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

    // UPI async path: poll profile after popup closes (Razorpay's handler
    // does NOT fire for some UPI flows — the user pays on their phone after
    // dismissing the popup). Up to ~20s.
    const pollAfterDismiss = async () => {
      if (handlerFired) return;
      onStatusChange?.("Checking payment status…");
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const updated = await getProfile();
          if (updated.plan !== previousPlan) {
            resolve();
            return;
          }
        } catch {
          /* ignore transient errors */
        }
      }
      onStatusChange?.(null);
      reject(new Error("cancelled"));
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
      modal: { ondismiss: pollAfterDismiss },
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
