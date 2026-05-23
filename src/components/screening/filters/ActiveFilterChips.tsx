import type { CandidateQueryState, MatchTierId, RangeFilter } from "@/types";
import { TIER_OPTIONS } from "./matchTiers";

interface ActiveFilterChipsProps {
  state: CandidateQueryState;
  onRemoveStage: (stage: string) => void;
  onRemoveMatch: (tier: MatchTierId) => void;
  onClearOverall: () => void;
  onClearCategory: (name: string) => void;
  onClearAll: () => void;
}

function formatRange(r: RangeFilter): string {
  if (r.min !== undefined && r.max !== undefined) return `${r.min}–${r.max}`;
  if (r.min !== undefined) return `≥ ${r.min}`;
  if (r.max !== undefined) return `≤ ${r.max}`;
  return "";
}

function tierLabel(id: MatchTierId): string {
  return TIER_OPTIONS.find((t) => t.id === id)?.label ?? id;
}

export function ActiveFilterChips({
  state,
  onRemoveStage,
  onRemoveMatch,
  onClearOverall,
  onClearCategory,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  for (const s of state.stage) chips.push({ key: `stage:${s}`, label: `Stage: ${s}`, onRemove: () => onRemoveStage(s) });
  for (const m of state.match) chips.push({ key: `match:${m}`, label: `Match: ${tierLabel(m)}`, onRemove: () => onRemoveMatch(m) });
  if (state.overall_score && (state.overall_score.min !== undefined || state.overall_score.max !== undefined)) {
    chips.push({
      key: "overall",
      label: `Overall ${formatRange(state.overall_score)}`,
      onRemove: onClearOverall,
    });
  }
  for (const [name, range] of Object.entries(state.category_scores)) {
    chips.push({
      key: `cat:${name}`,
      label: `${name} ${formatRange(range)}`,
      onRemove: () => onClearCategory(name),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full bg-[#FBF1E7] border border-[#F0DCC4] text-xs font-medium text-[#0F0F0F]"
        >
          {c.label}
          <button
            type="button"
            onClick={c.onRemove}
            aria-label={`Remove ${c.label}`}
            className="h-5 w-5 rounded-full text-[#C85A17] hover:bg-white flex items-center justify-center"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l5 5M7 2l-5 5"/></svg>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-[#737373] hover:text-[#0F0F0F] underline underline-offset-2 ml-1"
      >
        Clear all
      </button>
    </div>
  );
}
