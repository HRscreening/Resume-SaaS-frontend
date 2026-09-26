import { useEffect, useRef } from "react";

import type { CaptionLine } from "./useLiveCaptions";

interface CaptionPaneProps {
  title: string;
  lines: CaptionLine[];
  speaking: boolean;
  emptyText: string;
}

// How close to the bottom (in px) still counts as "at the bottom" for
// auto-scroll purposes. A little slack absorbs rounding from fractional
// scroll positions without letting a real read-through get pulled down.
const AUTO_SCROLL_THRESHOLD_PX = 24;

// Renders one speaker's captions as a reading aid, not an editable or
// authoritative record: the transcript that is scored lives on the server.
// The one visual rule is interim vs. final (reduced opacity vs. solid), so
// the pane does not look broken while speech-to-text revises a line in
// place.
export default function CaptionPane({ title, lines, speaking, emptyText }: CaptionPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = distanceFromBottom < AUTO_SCROLL_THRESHOLD_PX;
  }

  useEffect(() => {
    const el = scrollRef.current;
    // Only follow new lines when the candidate is already at the bottom.
    // Scrolling someone away from text they are re-reading is worse than
    // not auto-scrolling at all.
    if (!el || !atBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="flex flex-col rounded-xl border border-[#E5E1D8] bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#E5E1D8]">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#737373]">
          {title}
        </h3>
        {speaking && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#0F8A46]">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#0F8A46] animate-pulse"
              aria-hidden="true"
            />
            Speaking
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-live="polite"
        className="h-56 overflow-y-auto px-3 py-2 flex flex-col gap-1.5"
      >
        {lines.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] italic">{emptyText}</p>
        ) : (
          lines.map((line) => (
            <p
              key={line.id}
              className={`text-sm leading-relaxed text-[#1C1C1C] ${
                line.final ? "" : "opacity-50"
              }`}
            >
              {line.text}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
