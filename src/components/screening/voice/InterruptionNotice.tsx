import type { CallListItem } from "@/types";

interface InterruptionNoticeProps {
  call: CallListItem;
}

/**
 * Explains a call that did not run start-to-finish in one go.
 *
 * Without this, a recruiter sees a queued call with a transcript already on it,
 * or a scorecard built from two conversations, and has no way to tell why. The
 * three endings need different reactions, so each says plainly what happened
 * and what the system is doing about it.
 */
export function InterruptionNotice({ call }: InterruptionNoticeProps) {
  const stage = call.interruption_stage;
  if (!stage || stage === "closing") return null;

  const remaining = call.questions_remaining ?? 0;
  const resuming = Boolean(call.is_resuming);

  // Resumable and exhausted are genuinely different situations: one is being
  // handled, the other needs a human to decide what to do.
  const tone = resuming
    ? "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]"
    : "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]";

  const headline = resuming
    ? stage === "opening"
      ? "Call ended during the introduction. Trying once more."
      : "The line dropped mid-interview. Calling back to continue."
    : stage === "opening"
      ? "Ended during the introduction twice. No further calls."
      : "The line dropped and could not be resumed.";

  return (
    <div className={`rounded-xl border px-3 py-2 text-[11px] leading-relaxed ${tone}`}>
      <p className="font-medium">{headline}</p>
      {remaining > 0 && (
        <p className="mt-0.5 opacity-90">
          {remaining} question{remaining === 1 ? "" : "s"} still unanswered
          {resuming
            ? ". The assistant picks up where it stopped rather than starting over."
            : ". Any score below is based on a part-finished interview."}
        </p>
      )}
    </div>
  );
}
