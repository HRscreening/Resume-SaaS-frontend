import { Link } from "@tanstack/react-router";

/** Fraction of the allowance spent, clamped to [0, 1]. */
export function usedRatio(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(1, used / limit);
}

export const WARN_AT = 0.8;

export function meterColor(used: number, limit: number): string {
  const r = usedRatio(used, limit);
  if (r >= 1) return "bg-red-500";
  if (r >= WARN_AT) return "bg-amber-500";
  return "bg-[#0F0F0F]";
}

export interface QuotaMeterProps {
  /** e.g. "Resume analyses" */
  label: string;
  /** What one unit is called in running text, e.g. "resumes", "voice calls". */
  noun: string;
  used: number;
  /** Null when the plan has no cap — the meter renders nothing. */
  limit: number | null;
  /** True when the allowance refills on the 1st, false for a one-time trial. */
  refillsMonthly: boolean;
  /** Suppresses the upgrade link for plans with nothing to upgrade to. */
  canUpgrade?: boolean;
}

/**
 * One allowance, as a labelled meter.
 *
 * Shared by every quota on the dashboard so the thresholds and wording stay
 * identical across them: copying this block per allowance is how "running low"
 * ends up meaning 80% in one place and 90% in another.
 *
 * `refillsMonthly` is per allowance, not per plan. On Free the 50 resume
 * analyses are a one-time trial while the 3 voice calls do come back on the
 * 1st, so the two meters on the same dashboard word their footer differently.
 */
export function QuotaMeter({
  label,
  noun,
  used,
  limit,
  refillsMonthly,
  canUpgrade = true,
}: QuotaMeterProps) {
  if (limit == null) return null;

  const remaining = Math.max(0, limit - used);
  const r = usedRatio(used, limit);
  const period = refillsMonthly ? " this month" : " in your trial";

  const more = canUpgrade ? (
    <>
      <Link to="/settings" hash="billing" className="underline font-medium">
        Upgrade your plan
      </Link>{" "}
      for more.
    </>
  ) : refillsMonthly ? (
    <>Refreshes on the 1st.</>
  ) : null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-sm font-medium text-[#0F0F0F]">{label}</p>
        <p className="text-xs text-[#737373]">
          {used.toLocaleString()} of {limit.toLocaleString()} used
        </p>
      </div>
      <div className="h-2 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${meterColor(used, limit)}`}
          style={{ width: `${Math.round(r * 100)}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`${label}: ${used} of ${limit} used`}
        />
      </div>
      {r >= 1 ? (
        <p className="mt-2 text-xs text-red-600">
          No {noun} left{period}. {more}
        </p>
      ) : r >= WARN_AT ? (
        <p className="mt-2 text-xs text-[#C85A17]">
          Running low: {remaining.toLocaleString()} {noun} left{period}. {more}
        </p>
      ) : null}
    </div>
  );
}
