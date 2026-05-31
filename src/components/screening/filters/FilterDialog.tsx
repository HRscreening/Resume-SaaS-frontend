import type { CandidateQueryState, RangeFilter, RubricCategory } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RangeRow } from "./RangeRow";

interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  state: CandidateQueryState;
  categories: RubricCategory[];
  onOverallChange: (range: RangeFilter | undefined) => void;
  onCategoryChange: (name: string, range: RangeFilter | undefined) => void;
}

// Modal score-filter panel. Clicking the overlay or pressing Esc closes it
// (handled by Radix Dialog). Carries one section for Overall score and one
// row per rubric category.
export function FilterDialog({
  open,
  onClose,
  state,
  categories,
  onOverallChange,
  onCategoryChange,
}: FilterDialogProps) {
  const activeCount =
    (state.overall_score?.min !== undefined || state.overall_score?.max !== undefined ? 1 : 0) +
    Object.keys(state.category_scores).length;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="w-120 max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden rounded-2xl border-[#E8E5DF]">
        <DialogHeader className="flex-row items-center gap-2 px-4 py-3 border-b border-[#E8E5DF] bg-[#F5F3EE] space-y-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#404040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h10M3.5 7h7M5 11h4" />
          </svg>
          <DialogTitle className="text-sm font-semibold text-[#0F0F0F]">Score filters</DialogTitle>
          {activeCount > 0 && (
            <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-[#0F0F0F] text-white">
              {activeCount}
            </span>
          )}
        </DialogHeader>

        <div className="px-4 py-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A0A0A0]">
            Overall (0–100)
          </p>
          <RangeRow
            label="Overall score"
            value={state.overall_score}
            min={0}
            max={100}
            onChange={onOverallChange}
            onRemove={
              state.overall_score?.min !== undefined || state.overall_score?.max !== undefined
                ? () => onOverallChange(undefined)
                : undefined
            }
          />

          {categories.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A0A0A0] pt-2">
                Rubric categories (0–10)
              </p>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <RangeRow
                    key={cat.name}
                    label={cat.name}
                    value={state.category_scores[cat.name]}
                    min={0}
                    max={10}
                    step={0.1}
                    onChange={(range) => onCategoryChange(cat.name, range)}
                    onRemove={
                      state.category_scores[cat.name]
                        ? () => onCategoryChange(cat.name, undefined)
                        : undefined
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
