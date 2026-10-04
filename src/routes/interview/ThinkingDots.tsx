// The interviewer's thinking pause, drawn as itself rather than borrowed
// from the meter. Voice-interface research flags two anti-patterns this
// screen used to commit: the same visual for listening and speaking, and no
// distinct state at all for the pause between them — measured on this
// product at 1.2s typical, 3.4s worst, and currently invisible, so a
// candidate who just finished answering cannot tell whether they were
// heard.
//
// During that pause the interviewer is not making sound, so animating a
// level here would be drawing a sound that does not exist — the exact lie
// VoiceMeter's "still means still" rule exists to avoid. These three dots
// are deliberately SETTLED: a fixed, static ellipsis with no keyframe, no
// timer, and no amplitude input of any kind. They are rendered in place of
// the meter (never alongside it) for as long as the thinking state holds,
// so what changes on screen is which indicator is showing, a discrete
// swap, not a continuous motion — which is also why this needs no
// prefers-reduced-motion branch of its own: it has nothing to reduce.
export default function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-[3px] h-[14px]" role="img" aria-label="The interviewer is thinking">
      {[1, 0.65, 0.4].map((opacity, i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[#737373]"
          style={{ opacity }}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
