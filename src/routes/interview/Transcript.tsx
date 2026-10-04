import { useEffect, useRef } from "react";

import type { TranscriptTurn } from "./useTranscript";

interface TranscriptProps {
  turns: TranscriptTurn[];
  enabled: boolean;
  onToggle: () => void;
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
export default function Transcript({ turns, enabled, onToggle }: TranscriptProps) {
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
        <div
          className="flex flex-col rounded-2xl border border-[#E8E5DF] overflow-hidden"
          style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FAF9F5 100%)" }}
        >
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            aria-live="polite"
            className="overflow-y-auto px-4 py-4 flex flex-col gap-4 h-96"
          >
            {turns.length === 0 ? (
              <p className="text-sm text-[#A3A3A3] italic">
                The conversation will appear here as you and the interviewer talk.
              </p>
            ) : (
              turns.map((turn) => <TurnRow key={turn.id} turn={turn} />)
            )}
          </div>
          <p className="text-xs text-[#737373] px-4 py-2 border-t border-[#E5E1D8]">
            This transcript is produced automatically and may contain mistakes. There is no
            need to correct it out loud: the interviewer hears you, not the transcript.
          </p>
        </div>
      )}
    </div>
  );
}

// Speaker labels get their own color (candidate: charcoal, interviewer:
// the warm brand copper used for "speaking" everywhere else on this
// screen) rather than sharing one gray, plus a small solid dot, so a
// turn's speaker is legible at a glance without needing full chat-bubble
// chrome.
const CANDIDATE_COLOR = "#404040";
const INTERVIEWER_COLOR = "#C85A17";

function TurnRow({ turn }: { turn: TranscriptTurn }) {
  const isCandidate = turn.speaker === "candidate";
  const color = isCandidate ? CANDIDATE_COLOR : INTERVIEWER_COLOR;
  return (
    <div className={`flex flex-col gap-1 max-w-[85%] ${isCandidate ? "items-end self-end text-right" : "items-start self-start text-left"}`}>
      <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
        {isCandidate ? "You" : "Interviewer"}
      </span>
      {/* A line still being transcribed gets a soft tint in its speaker's
          color, cleared the moment it's marked final (useLiveCaptions) —
          a discrete state change, not a timed highlight, so it never
          lingers or flickers on its own. */}
      <p
        className="text-sm leading-relaxed text-[#1C1C1C] px-3 py-1.5 rounded-xl"
        style={turn.final ? undefined : { backgroundColor: withAlpha(color, 0.08) }}
      >
        {turn.text}
      </p>
    </div>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
