import { useState } from "react";
import type { CandidateQueryState, MatchTierId, RangeFilter, RubricCategory, StagesMap } from "@/types";
import { sortedStages } from "@/lib/stages";
import { MultiSelectPopover } from "./MultiSelectPopover";
import { FilterDialog } from "./FilterDialog";
import { TIER_OPTIONS } from "./matchTiers";

interface CandidatesToolbarProps {
  state: CandidateQueryState;
  searchInput: string;
  stages: StagesMap;
  categories: RubricCategory[];

  onSearchChange: (s: string) => void;
  onStageChange: (next: string[]) => void;
  onMatchChange: (next: MatchTierId[]) => void;
  onOverallChange: (range: RangeFilter | undefined) => void;
  onCategoryChange: (name: string, range: RangeFilter | undefined) => void;
}

// Composition only — every dropdown / dialog is owned by a child component.
// This file is intentionally thin so future changes (e.g. adding a "Saved
// views" menu) only touch one slot.
export function CandidatesToolbar({
  state,
  searchInput,
  stages,
  categories,
  onSearchChange,
  onStageChange,
  onMatchChange,
  onOverallChange,
  onCategoryChange,
}: CandidatesToolbarProps) {
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  const stageOptions = sortedStages(stages).map((s) => ({
    value: s.name,
    label: s.name,
    dot: s.color,
  }));
  const matchOptions = TIER_OPTIONS.map((t) => ({
    value: t.id,
    label: t.label,
    dot: t.dot,
  }));

  const filterActive =
    state.overall_score?.min !== undefined ||
    state.overall_score?.max !== undefined ||
    Object.keys(state.category_scores).length > 0;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L12 12" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search candidates"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#0F0F0F] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#A0A0A0]"
          />
        </div>

        <MultiSelectPopover
          label="Stage"
          options={stageOptions}
          value={state.stage}
          onChange={onStageChange}
          emptyHint="No stages configured"
        />

        <MultiSelectPopover
          label="Match"
          options={matchOptions}
          value={state.match}
          onChange={(v) => onMatchChange(v as MatchTierId[])}
        />

        <button
          type="button"
          onClick={() => setFilterDialogOpen((v) => !v)}
          className={`h-9 px-3 border text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
            filterDialogOpen || filterActive
              ? "border-[#0F0F0F] bg-[#0F0F0F] text-white"
              : "border-[#D4D4D4] text-[#404040] bg-white hover:bg-[#F5F3EE]"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h10M3.5 7h7M5 11h4" />
          </svg>
          Score filters
        </button>
      </div>

      <FilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        state={state}
        categories={categories}
        onOverallChange={onOverallChange}
        onCategoryChange={onCategoryChange}
      />
    </>
  );
}
