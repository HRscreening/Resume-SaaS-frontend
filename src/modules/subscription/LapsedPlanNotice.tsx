import { AlertCircle } from "lucide-react";
import { useUserUsageQuotas } from "@/modules/subscription/useSubscription";
import { creditBalance } from "@/modules/subscription/credits";
import { PLAN_LABEL } from "@/lib/planLabels";
import type { UserSubscription } from "@/types/subscription.type";

function formatEnded(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// After a paid plan lapses the user is back on Free with only what was left
// of their one-time Free allowance (plus any unexpired additional credits).
export function LapsedPlanNotice({ subscription }: { subscription: UserSubscription }) {
  const { data: usage } = useUserUsageQuotas();
  const ended = formatEnded(subscription.subscription_ends_at);
  if (!usage || !ended) return null;

  const left = creditBalance(usage).totalRemaining.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800 leading-relaxed">
        Your {PLAN_LABEL[subscription.plan]} plan ended on {ended}. You're on Free with {left} credits left.
      </p>
    </div>
  );
}
