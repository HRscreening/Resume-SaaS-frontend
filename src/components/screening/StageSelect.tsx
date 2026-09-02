import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StagesMap, HiringStage } from "@/types";
import {
  getStageMeta,
  sortedStages,
  tintColor,
  shadeColor,
} from "@/lib/stages";

interface StageSelectProps {
  value: HiringStage;
  stages: StagesMap;
  onChange: (next: HiringStage) => void;
  // Open the stage-management modal. Renders a small settings icon
  // beside the chip and is also wired to the dropdown's "Edit stages"
  // footer affordance.
  onManage?: () => void;
  // Read-only viewers: the pill still shows the current stage, but it
  // cannot be clicked to move the candidate.
  disabled?: boolean;
}

// Notion-style stage pill. Click the pill to open the dropdown that lists
// only the stages with an index greater than the current candidate's stage,
// plus a sticky "Reject" action at the bottom.
export function StageSelect({ value, stages, onChange, onManage, disabled = false }: StageSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const meta = getStageMeta(value, stages);
  const all = sortedStages(stages);
  const currentIdx = meta.index;

  // Stages without including the current stage, so we don't show a "move to" option for the stage the candidate is already in.
  const forward = currentIdx == null
    ? all
    : all.filter((s) => s.index != currentIdx);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Anchor the portalled menu to the trigger using viewport coordinates.
  // Recomputed on open and whenever the page scrolls/resizes so the menu
  // stays glued to the pill without being clipped by the table's overflow.
  // Flips above the trigger when there isn't enough room below (e.g. the
  // last rows of the table) so the dropdown is never cut off by the
  // viewport bottom.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const margin = 8;
      // Real height once the menu has mounted; fall back to a sane estimate
      // for the very first placement pass (before the rAF re-measures).
      const menuH = menuRef.current?.offsetHeight ?? 320;
      const spaceBelow = window.innerHeight - r.bottom;
      // Prefer below; flip up only if it doesn't fit below but does fit above.
      let top = r.bottom + 4;
      if (spaceBelow < menuH + margin && r.top > menuH + margin) {
        top = r.top - menuH - 4;
      }
      // Never let it spill past the top edge.
      top = Math.max(margin, top);
      setPos({ top, left: r.left });
    }
    place();
    // Re-place once the menu is actually in the DOM so we measure its true
    // height (the first pass uses the estimate above).
    const raf = requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  function pick(stage: HiringStage) {
    if (stage !== value) onChange(stage);
    setOpen(false);
  }

  return (
    <div className="relative inline-flex items-center gap-1">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={(e) => { e.stopPropagation(); if (disabled) return; setOpen((v) => !v); }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-xs font-medium transition-all ${
          disabled ? "cursor-not-allowed opacity-70" : "hover:brightness-95"
        }`}
        style={{ backgroundColor: tintColor(meta.color), color: shadeColor(meta.color) }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="truncate max-w-[110px]">{value}</span>
      </button>

      {onManage && !disabled && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onManage(); }}
          aria-label="Edit stages"
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-5 w-5 rounded-md text-[#737373] hover:bg-[#F5F3EE] hover:text-[#0F0F0F] flex items-center justify-center transition-opacity"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="1.4" />
            <path d="M11.5 7a4.5 4.5 0 0 0-.08-.84l1.2-.94-1.4-2.42-1.42.5a4.5 4.5 0 0 0-1.46-.84L8.1 1H5.9l-.24 1.46a4.5 4.5 0 0 0-1.46.84l-1.42-.5-1.4 2.42 1.2.94A4.5 4.5 0 0 0 2.5 7c0 .29.03.57.08.84l-1.2.94 1.4 2.42 1.42-.5c.43.36.92.65 1.46.84L5.9 13h2.2l.24-1.46c.54-.19 1.03-.48 1.46-.84l1.42.5 1.4-2.42-1.2-.94c.05-.27.08-.55.08-.84z" />
          </svg>
        </button>
      )}

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-50 min-w-[180px] rounded-xl border border-[#E8E5DF] bg-white shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#A0A0A0]">
            Move to
          </div>
          <ul className="max-h-64 overflow-y-auto px-1">
            {forward.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-[#A0A0A0]">No later stages</li>
            ) : forward.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  onClick={() => pick(s.name)}
                  className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-[#F5F3EE] transition-colors"
                >
                  <span
                    className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-xs font-medium"
                    style={{ backgroundColor: tintColor(s.color), color: shadeColor(s.color) }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </span>
                </button>
              </li>
            ))}
           
          </ul>

          {onManage && !disabled && (
            <div className="border-t border-[#E8E5DF] mt-1">
              <button
                type="button"
                onClick={() => { setOpen(false); onManage(); }}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7h10M7 2v10" />
                </svg>
                Edit stages
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
