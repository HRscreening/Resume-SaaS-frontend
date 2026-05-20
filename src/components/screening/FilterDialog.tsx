import { useEffect, useRef, useState } from "react";

interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
}

// Draggable, lightweight floating panel. We don't reach for radix Dialog here
// because a modal overlay + focus trap is the wrong shape — the recruiter
// should be able to skim the table while the panel sits over it.
export function FilterDialog({ open, onClose }: FilterDialogProps) {
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

  // Center on first open; subsequent opens keep last-dragged position.
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

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[380px] rounded-2xl border border-[#E8E5DF] bg-white shadow-2xl"
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
          <span className="text-sm font-semibold text-[#0F0F0F]">Filters</span>
        </div>
        <button
          onClick={onClose}
          className="h-7 w-7 rounded-lg hover:bg-white flex items-center justify-center text-[#737373]"
          aria-label="Close filters"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>
        </button>
      </div>
      <div className="px-6 py-10 text-center">
        <div className="h-12 w-12 rounded-full bg-[#FBF1E7] border border-[#F0DCC4] flex items-center justify-center mx-auto mb-3">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#C85A17" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="7" />
            <path d="M10 6v4l2.5 2.5" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[#0F0F0F]">Coming soon</p>
        <p className="text-xs text-[#737373] mt-1">
          Filter candidates by score range, stage, missing skills, and more.
        </p>
      </div>
    </div>
  );
}
