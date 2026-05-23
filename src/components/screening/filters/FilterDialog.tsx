import { useEffect, useRef, useState } from "react";
import type { CandidateQueryState, RangeFilter, RubricCategory } from "@/types";
import { RangeRow } from "./RangeRow";

interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  state: CandidateQueryState;
  categories: RubricCategory[];
  onOverallChange: (range: RangeFilter | undefined) => void;
  onCategoryChange: (name: string, range: RangeFilter | undefined) => void;
}

// Draggable floating panel — kept non-modal so the recruiter can keep
// skimming the table while building the filter. Carries one section for
// Overall score and one row per rubric category.
export function FilterDialog({
  open,
  onClose,
  state,
  categories,
  onOverallChange,
  onCategoryChange,
}: FilterDialogProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef<{ dx: number; dy: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMove(e: MouseEvent) {
      const d = draggingRef.current;
      if (!d) return;
      setPos({ x: e.clientX - d.dx, y: e.clientY - d.dy });
    }
    function onUp() { draggingRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [open]);

  // Center on first open; subsequent opens keep the last-dragged position.
  useEffect(() => {
    if (open && pos === null && panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setPos({
        x: Math.max(16, (window.innerWidth - rect.width) / 2),
        y: Math.max(16, (window.innerHeight - rect.height) / 3),
      });
    }
  }, [open, pos]);

  if (!open) return null;

  function startDrag(e: React.MouseEvent) {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    draggingRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
  }

  const activeCount =
    (state.overall_score?.min !== undefined || state.overall_score?.max !== undefined ? 1 : 0) +
    Object.keys(state.category_scores).length;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[480px] rounded-2xl border border-[#E8E5DF] bg-white shadow-2xl"
      style={{ left: pos?.x ?? 0, top: pos?.y ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-between px-4 py-3 border-b border-[#E8E5DF] cursor-move select-none rounded-t-2xl bg-[#F5F3EE]"
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#404040" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h10M3.5 7h7M5 11h4" />
          </svg>
          <span className="text-sm font-semibold text-[#0F0F0F]">Score filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-[#0F0F0F] text-white">
              {activeCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center text-[#737373]"
          aria-label="Close filters"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
        </button>
      </div>

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
    </div>
  );
}
