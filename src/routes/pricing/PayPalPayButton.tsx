import { useEffect, useRef, useState } from "react";
import { renderPayPalButtons } from "@/lib/paypal";
import type { UpgradePlanSlug } from "@/lib/razorpay";

interface Props {
  clientId: string;
  plan: UpgradePlanSlug;
  cycle: "monthly" | "yearly";
  onPaid: () => void;
  onPending: () => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

/** PayPal's buttons for a USD checkout. Mounted only once the terms are agreed. */
export default function PayPalPayButton({
  clientId,
  plan,
  cycle,
  onPaid,
  onPending,
  onError,
  onBusyChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // The buttons are rendered once per (plan, cycle). Callbacks are read
  // through a ref so a parent re-render doesn't tear PayPal's iframe down
  // mid-payment.
  const callbacks = useRef({ onPaid, onPending, onError, onBusyChange });
  callbacks.current = { onPaid, onPending, onError, onBusyChange };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    renderPayPalButtons({
      container,
      clientId,
      plan,
      cycle,
      onPaid: () => callbacks.current.onPaid(),
      onPending: () => callbacks.current.onPending(),
      onError: (message) => callbacks.current.onError(message),
      onBusyChange: (busy) => callbacks.current.onBusyChange(busy),
    })
      .then((close) => {
        if (cancelled) close();
        else {
          cleanup = close;
          setReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          callbacks.current.onError(err instanceof Error ? err.message : "Failed to load PayPal");
        }
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [clientId, plan, cycle]);

  return (
    <div>
      {!ready && (
        <div className="h-12 flex items-center justify-center">
          <span className="h-4 w-4 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}
