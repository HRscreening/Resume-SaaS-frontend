import { AlertCircle } from "lucide-react";
import { useUserUsageQuotas } from "@/modules/subscription/useSubscription";
import type { UserMonthlyUsage, UserSubscription } from "@/types/subscription.type";

const PLAN_NAMES: Record<string, string> = { LITE: "Lite", PLUS: "Plus", PRO: "Pro" };

function credit(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// After a paid plan lapses the user is back on Free with only what was left
// of their one-time Free allowance (plus any unexpired additional credits).
function creditsLeft(usage: UserMonthlyUsage): number {
  const plan = Math.max(credit(usage.credit_allocated) - credit(usage.credit_used), 0);
  const additional = Math.max(credit(usage.additional_allocated) - credit(usage.additional_used), 0);
  return plan + additional;
}

function formatEnded(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function LapsedPlanNotice({ subscription }: { subscription: UserSubscription }) {
  const { data: usage } = useUserUsageQuotas();
  const ended = formatEnded(subscription.subscription_ends_at);
  if (!usage || !ended) return null;

  const left = creditsLeft(usage).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const plan = PLAN_NAMES[subscription.plan] ?? subscription.plan;

  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800 leading-relaxed">
        Your {plan} plan ended on {ended}. You're on Free with {left} credits left.
      </p>
    </div>
  );
}
