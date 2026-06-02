import { TIERS } from "@/lib/tier";
import type { MatchTierId, RangeFilter } from "@/types";

// Maps the existing TIERS (Strong/Potential/Risky/Poor) to inclusive score
// ranges that the backend can filter on. Source of truth for tier thresholds
// is src/lib/tier.ts — keep this derived from TIERS so changing a threshold
// in one place updates the filter automatically.
export const TIER_RANGES: Record<MatchTierId, { min: number; max: number }> = (() => {
  const sorted = [...TIERS].sort((a, b) => b.min - a.min); // strong → poor
  const out: Partial<Record<MatchTierId, { min: number; max: number }>> = {};
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const above = sorted[i - 1];
    out[t.id as MatchTierId] = {
      min: t.min,
      max: above ? above.min - 1 : 100,
    };
  }
  return out as Record<MatchTierId, { min: number; max: number }>;
})();

export const TIER_OPTIONS: ReadonlyArray<{ id: MatchTierId; label: string; dot: string }> =
  TIERS.map((t) => ({ id: t.id as MatchTierId, label: t.label, dot: t.dot }));

// Collapse selected tiers into a single inclusive overall_score range.
// Returns undefined if no tiers are selected. If selected tiers are
// non-contiguous (e.g. Strong + Risky skipping Potential) we still return
// the widest [min,max] span — the request stays a single range, and the
// caller can choose to post-filter on the client. Most flows select a
// contiguous prefix (Strong, Strong+Potential, etc.), so this is a fine
// approximation.
export function tiersToRange(tiers: MatchTierId[]): RangeFilter | undefined {
  if (tiers.length === 0) return undefined;
  let lo = Infinity;
  let hi = -Infinity;
  for (const id of tiers) {
    const r = TIER_RANGES[id];
    if (!r) continue;
    if (r.min < lo) lo = r.min;
    if (r.max > hi) hi = r.max;
  }
  if (!isFinite(lo) || !isFinite(hi)) return undefined;
  return { min: lo, max: hi };
}
