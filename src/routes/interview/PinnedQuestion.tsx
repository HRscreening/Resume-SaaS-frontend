import { TimerBadge } from "./codingPaneParts";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface PinnedQuestionProps {
  // Always defined by the time this renders — InterviewRoom only mounts it
  // once a spoken question's text has actually been revealed server-side
  // (see useCodingQuestions' `pinned`). There is deliberately no
  // "question pending" placeholder state here: a question the interviewer
  // has not yet presented is not a thing this screen shows anything about,
  // half-rendered or otherwise.
  prompt: string;
  secondsRemaining: number;
  warning: boolean;
  // False once the server has closed this question's clock (e.g. the last
  // spoken question ended early): no countdown is shown then.
  timerActive: boolean;
  // Defaults to "Now discussing"; the walkthrough of a submitted coding
  // question overrides it.
  label?: string;
}

// "Nobody scrolls back hunting for what was asked." The question that is
// currently being discussed stays on screen for as long as it is current —
// this is that slot for a spoken question. A coding question uses the same
// slot in CodingPane instead (problem statement + examples + editor), never
// both at once; see InterviewRoom for the switch between them.
export default function PinnedQuestion({ prompt, secondsRemaining, warning, timerActive, label = "Now discussing" }: PinnedQuestionProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3]">{label}</p>
        {timerActive && (
          <TimerBadge secondsRemaining={secondsRemaining} warning={warning} reducedMotion={reducedMotion} />
        )}
      </div>
      <p className="text-[19px] leading-snug text-[#0F0F0F]">{prompt}</p>
    </div>
  );
}
