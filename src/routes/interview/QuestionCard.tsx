import { TimerBadge } from "./codingPaneParts";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface QuestionCardProps {
  // "QUESTION 3 OF 8 · SPOKEN", "WARM-UP", ...
  label: string;
  text: string;
  // True for a real question's wording (large type); false for the quieter
  // framing lines shown in the warm-up, walkthrough and closing.
  isQuestion: boolean;
  secondsRemaining?: number;
  warning?: boolean;
  timerActive?: boolean;
}

// The top card of the spoken layout. A spoken question stays here, in large
// type, for as long as it is current: nobody scrolls back hunting for what
// was asked.
export default function QuestionCard({
  label,
  text,
  isQuestion,
  secondsRemaining = 0,
  warning = false,
  timerActive = false,
}: QuestionCardProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <section
      aria-label="Current question"
      className="shrink-0 rounded-[18px] border border-[#E8E5DF] bg-white px-6 py-6 sm:px-8 sm:py-7 flex flex-col gap-3.5"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.06em] text-[#A9470F]">{label}</span>
        {timerActive && (
          <TimerBadge secondsRemaining={secondsRemaining} warning={warning} reducedMotion={reducedMotion} />
        )}
      </div>
      <p
        className={
          isQuestion
            ? "text-xl sm:text-2xl xl:text-[28px] leading-snug xl:leading-[38px] font-medium text-[#0F0F0F]"
            : "text-lg leading-snug text-[#404040]"
        }
      >
        {text}
      </p>
    </section>
  );
}
