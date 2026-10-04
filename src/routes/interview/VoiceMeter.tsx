import { useEffect, useRef } from "react";

import { createLevelLoop } from "./audioLevelLoop";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

// Replaces the old VoiceOrb. Two rejected attempts at this screen ("idle and
// boring", then "too organic") settled on a single rule: the voice presence
// is a LEVEL METER, not a shape. A fixed row of vertical bars, uniform and
// mechanical, whose only input is real amplitude — nothing here deforms,
// wobbles, or has a silhouette that changes with anything but the signal
// itself.
//
// "Still means still": each bar's height is a pure function of the
// smoothed amplitude for the currently-active side (see paint() below) and
// nothing else. There is no time term anywhere in this file — nothing here
// can read `Date.now()` or a frame counter — so a held amplitude of exactly
// 0 (true silence, both sides) always paints the same flat row forever,
// never a breathing or idling bar. createLevelLoop itself decays smoothly to
// 0 on silence (see its own comment) and stays there; this component just
// turns that single number into bar heights.
const COPPER = "#C85A17";
const CANDIDATE_COLOR = "#404040";
const AMBER = "#D97706";
const NEUTRAL = "#A3A3A3";

// Per-bar weight, left to right. Fixed and deterministic — not derived from
// the signal in any way other than being multiplied by it — so the row
// reads as one legible shape (a slight rise toward the middle) at any
// amplitude rather than five bars jumping in lockstep like a single fat
// bar would.
const BAR_WEIGHTS = [0.45, 0.75, 1, 0.75, 0.45];
const MIN_HEIGHT_PX = 3;
const MAX_EXTRA_PX = 11;

interface VoiceMeterProps {
  interviewerAnalyser: AnalyserNode | null;
  interviewerSpeaking: boolean;
  candidateAnalyser: AnalyserNode | null;
  candidateSpeaking: boolean;
  reconnecting: boolean;
}

// Compact, top-bar-sized meter: "enough to know the interview is live,
// nothing to watch" (the contract's own words). It answers exactly one
// question — is there real audio energy on the line right now — and
// delegates everything else (who is speaking, in words) to the sibling
// label InterviewRoom renders next to it.
export default function VoiceMeter({
  interviewerAnalyser,
  interviewerSpeaking,
  candidateAnalyser,
  candidateSpeaking,
  reconnecting,
}: VoiceMeterProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const color = reconnecting
    ? AMBER
    : interviewerSpeaking
      ? COPPER
      : candidateSpeaking
        ? CANDIDATE_COLOR
        : NEUTRAL;

  useEffect(() => {
    if (prefersReducedMotion) return;

    // Two independent taps, exactly as VoiceOrb used them: each side's own
    // rAF loop, driven only by that side's own analyser, never cross-wired.
    // Neither loop runs at all while that side has no analyser yet, so a
    // missing track contributes nothing rather than being misread as
    // silence actively driving the bars.
    let interviewerLevel = 0;
    let candidateLevel = 0;

    function paint() {
      // Whichever side currently has real signal wins the frame — drawing
      // both sides' amplitude at once through five bars would not be
      // legible at this size, and the discrete speaking flags (not the
      // amplitude itself) already decide which side's track to trust for
      // "level" when both happen to have nonzero energy at once (e.g. echo
      // picked up on the other mic).
      const level = interviewerSpeaking
        ? interviewerLevel
        : candidateSpeaking
          ? candidateLevel
          : Math.max(interviewerLevel, candidateLevel);
      barRefs.current.forEach((bar, i) => {
        if (!bar) return;
        const weight = BAR_WEIGHTS[i] ?? 1;
        bar.style.height = `${MIN_HEIGHT_PX + level * weight * MAX_EXTRA_PX}px`;
      });
    }

    paint();

    const stopInterviewer = interviewerAnalyser
      ? createLevelLoop(interviewerAnalyser, (level) => {
          interviewerLevel = level;
          paint();
        })
      : null;
    const stopCandidate = candidateAnalyser
      ? createLevelLoop(candidateAnalyser, (level) => {
          candidateLevel = level;
          paint();
        })
      : null;

    return () => {
      stopInterviewer?.();
      stopCandidate?.();
    };
  }, [interviewerAnalyser, interviewerSpeaking, candidateAnalyser, candidateSpeaking, prefersReducedMotion]);

  if (prefersReducedMotion) {
    // No rAF loop at all under reduced motion — same rule VoiceOrb followed.
    // Every bar sits at its resting height; only color changes, and only on
    // a discrete state change (speaking/reconnecting flags), never per
    // animation frame.
    return (
      <span className="inline-flex items-end gap-[2px] h-[14px]" aria-hidden="true">
        {BAR_WEIGHTS.map((_, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full"
            style={{ height: MIN_HEIGHT_PX, backgroundColor: color }}
          />
        ))}
      </span>
    );
  }

  return (
    <span className="inline-flex items-end gap-[2px] h-[14px]" aria-hidden="true">
      {BAR_WEIGHTS.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          // `height` is deliberately absent from this style object — see
          // the paint() effect above, which owns it exclusively via direct
          // DOM mutation on the same element. If it were included here
          // too, React would re-apply its own (always-resting) value on
          // every ordinary re-render this screen does for unrelated
          // reasons (the elapsed-time tick alone fires once a second),
          // clobbering live amplitude back to rest every few frames. A
          // Tailwind class gives the element a resting height for the one
          // frame before the first paint() call sets its real inline
          // value; after that, the inline value (which always wins over a
          // class) is the only thing ever touching this property.
          className="w-[3px] h-[3px] rounded-full transition-colors"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  );
}
