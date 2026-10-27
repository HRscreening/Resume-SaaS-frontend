import { useEffect, useRef } from "react";

import type { TranscriptTurn } from "./useTranscript";

interface TranscriptProps {
  turns: TranscriptTurn[];
  enabled: boolean;
  onToggle: () => void;
  // True only while the coding pane is open (InterviewRoom passes
  // `showCodingPane` straight through). The statement and the editor need
  // every row of height the screen has, so the conversation shrinks to a
  // caption: the line being said now, in one strip under the pane. It used
  // to be a 160px scrolling box plus a disclaimer, which on a laptop took a
  // third of the space the editor had and pushed the run output off screen.
  // In the other layout (the warm-up, or a spoken question) there is no
  // editor to share space with and the transcript gets a full column.
  compact: boolean;
}

// How close to the bottom (in px) still counts as "at the bottom" for
// auto-scroll purposes. A little slack absorbs rounding from fractional
// scroll positions without letting a real read-through get pulled down.
const AUTO_SCROLL_THRESHOLD_PX = 24;

// The whole conversation, top to bottom, newest at the bottom, each turn
// labelled by who said it and READ left to right like running text — both
// speakers left-aligned, never split into right-aligned "my side" bubbles.
// Replaces the old side-by-side "Interviewer" / "You" columns (which made a
// single back-and-forth read as two separate logs the candidate had to
// cross-reference by eye) and the right-aligned-in-places layout that came
// after it, which read like a chat app rather than a transcript and made a
// single exchange harder to follow top to bottom, not easier. This is a
// reading aid only, same as the panes it replaces: the transcript that is
// scored lives on the server.
export default function Transcript({ turns, enabled, onToggle, compact }: TranscriptProps) {
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

  if (compact) {
    return <CaptionStrip latest={turns[turns.length - 1]} enabled={enabled} onToggle={onToggle} />;
  }

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <button
        type="button"
        onClick={onToggle}
        className="self-start text-xs font-medium text-[#404040] underline underline-offset-2 hover:text-[#0F0F0F]"
      >
        {enabled ? "Hide transcript" : "Show transcript"}
      </button>
      {enabled && (
        <div
          className="flex flex-col rounded-2xl border border-[#E8E5DF] overflow-hidden flex-1 min-h-0"
          style={{ background: "linear-gradient(180deg, #FFFFFF 0%, #FAF9F5 100%)" }}
        >
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            aria-live="polite"
            className="overflow-y-auto px-4 py-4 flex flex-col gap-4 flex-1 min-h-0"
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

// The conversation as a live caption: only the most recent line, clamped to
// two rows so its height never changes under the editor.
function CaptionStrip({
  latest,
  enabled,
  onToggle,
}: {
  latest: TranscriptTurn | undefined;
  enabled: boolean;
  onToggle: () => void;
}) {
  const isCandidate = latest?.speaker === "candidate";
  const color = isCandidate ? CANDIDATE_COLOR : INTERVIEWER_COLOR;
  return (
    <div className="flex items-start gap-3 min-h-[2.5rem]">
      <div aria-live="polite" className="flex-1 min-w-0 text-sm leading-snug text-[#1C1C1C] line-clamp-2">
        {!enabled ? (
          <span className="text-[#A3A3A3] italic">Captions are hidden.</span>
        ) : latest ? (
          <>
            <span className="text-xs font-semibold mr-1.5" style={{ color }}>
              {isCandidate ? "You" : "Interviewer"}
            </span>
            {latest.text}
          </>
        ) : (
          <span className="text-[#A3A3A3] italic">What you and the interviewer say appears here.</span>
        )}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 text-xs font-medium text-[#404040] underline underline-offset-2 hover:text-[#0F0F0F]"
      >
        {enabled ? "Hide captions" : "Show captions"}
      </button>
    </div>
  );
}

// Speaker labels get their own color (candidate: charcoal, interviewer:
// the warm brand copper used for "speaking" everywhere else on this
// screen) rather than sharing one gray, plus a small solid dot, so a
// turn's speaker is legible at a glance without needing full chat-bubble
// chrome or a side a turn sits on — every turn sits on the same side, in
// one left-aligned column, and the label/color is what tells them apart.
const CANDIDATE_COLOR = "#404040";
const INTERVIEWER_COLOR = "#C85A17";

function TurnRow({ turn }: { turn: TranscriptTurn }) {
  const isCandidate = turn.speaker === "candidate";
  const color = isCandidate ? CANDIDATE_COLOR : INTERVIEWER_COLOR;
  return (
    <div className="flex flex-col gap-1 items-start text-left max-w-[42rem]">
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
