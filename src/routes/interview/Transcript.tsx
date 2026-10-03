import { useEffect, useRef } from "react";

import type { TranscriptTurn } from "./useTranscript";

interface TranscriptProps {
  turns: TranscriptTurn[];
  enabled: boolean;
  onToggle: () => void;
  // The coding-pane placement: a short strip under the editor rather than a
  // tall panel of its own. Same component, same scroll and attribution
  // rules — only the height and the trailing disclaimer differ.
  compact?: boolean;
}

// How close to the bottom (in px) still counts as "at the bottom" for
// auto-scroll purposes. A little slack absorbs rounding from fractional
// scroll positions without letting a real read-through get pulled down.
const AUTO_SCROLL_THRESHOLD_PX = 24;

// The whole conversation, top to bottom, newest at the bottom, each turn
// labelled by who said it. Replaces the old side-by-side "Interviewer" /
// "You" columns, which made a single back-and-forth read as two separate
// logs the candidate had to cross-reference by eye. This is a reading aid
// only, same as the panes it replaces: the transcript that is scored lives
// on the server.
export default function Transcript({ turns, enabled, onToggle, compact = false }: TranscriptProps) {
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
    // Only follow new turns when the candidate is already at the bottom.
    // Scrolling someone away from a turn they scrolled up to re-read is
    // worse than not auto-scrolling at all.
    if (!el || !atBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [turns]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="self-start text-xs font-medium text-[#404040] underline underline-offset-2 hover:text-[#0F0F0F]"
      >
        {enabled ? "Hide transcript" : "Show transcript"}
      </button>
      {enabled && (
        <div className="flex flex-col rounded-xl border border-[#E5E1D8] bg-white overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            aria-live="polite"
            className={`overflow-y-auto px-4 py-3 flex flex-col gap-3 ${compact ? "h-36" : "h-96"}`}
          >
            {turns.length === 0 ? (
              <p className="text-sm text-[#A3A3A3] italic">
                The conversation will appear here as you and the interviewer talk.
              </p>
            ) : (
              turns.map((turn) => <TurnRow key={turn.id} turn={turn} />)
            )}
          </div>
          {!compact && (
            <p className="text-xs text-[#737373] px-4 py-2 border-t border-[#E5E1D8]">
              This transcript is produced automatically and may contain mistakes. There is no
              need to correct it out loud: the interviewer hears you, not the transcript.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Speaker labels get their own color (candidate: charcoal, interviewer:
// the warm brand copper used for "speaking" everywhere else on this
// screen) rather than sharing one gray, so a turn's speaker is legible at
// a glance without needing full chat-bubble chrome.
const CANDIDATE_LABEL_COLOR = "#404040";
const INTERVIEWER_LABEL_COLOR = "#C85A17";

function TurnRow({ turn }: { turn: TranscriptTurn }) {
  const isCandidate = turn.speaker === "candidate";
  const labelColor = isCandidate ? CANDIDATE_LABEL_COLOR : INTERVIEWER_LABEL_COLOR;
  return (
    <div className={`flex flex-col gap-0.5 max-w-[85%] ${isCandidate ? "items-end self-end text-right" : "items-start self-start text-left"}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: labelColor }}>
        {isCandidate ? "You" : "Interviewer"}
      </span>
      <p className={`text-sm leading-relaxed text-[#1C1C1C] ${turn.final ? "" : "opacity-50"}`}>{turn.text}</p>
    </div>
  );
}
