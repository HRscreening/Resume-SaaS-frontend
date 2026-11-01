import { Check } from "lucide-react";
import type { ReactNode } from "react";

import type { RailStep } from "./rail";

interface AgendaRailProps {
  steps: RailStep[];
  // 0..1 of the current question's time used; null hides the bar (warm-up,
  // closing, or a question whose clock the server has closed).
  currentProgress: number | null;
  // "11:40 left" for the current question, or null.
  currentTimeLabel: string | null;
  // The current question's time is nearly up: the bar and label turn red.
  warning: boolean;
  roleTitle: string | null;
  hiringCompany: string | null;
  minutesLeft: number;
  onLeave: () => void;
  // Optional block above the time-left row: the interviewer's status and
  // the self-view while a coding question has the main area.
  footer?: ReactNode;
}

// Direction C: the whole hour on a rail. The rail never changes shape
// between spoken and coding questions, so moving from one to the other
// never moves the candidate's bearings.
export default function AgendaRail({
  steps,
  currentProgress,
  currentTimeLabel,
  warning,
  roleTitle,
  hiringCompany,
  minutesLeft,
  onLeave,
  footer,
}: AgendaRailProps) {
  const heading = hiringCompany ? `${hiringCompany} interview` : "Interview";
  return (
    <aside
      aria-label="Interview agenda"
      className="hidden lg:flex w-[280px] xl:w-[300px] shrink-0 flex-col gap-5 border-r border-[#E8E5DF] bg-white px-4 py-6 min-h-0"
    >
      <div className="flex items-center gap-2.5 px-2">
        <div className="h-7 w-7 shrink-0 rounded-[7px] bg-[#0F0F0F] text-[#F5F3EE] flex items-center justify-center text-[15px] font-bold">
          H
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">{heading}</span>
          {roleTitle && <span className="text-xs text-[#404040] truncate">{roleTitle}</span>}
        </div>
      </div>

      <ol className="flex flex-col gap-0.5 min-h-0 overflow-y-auto -mx-1 px-1">
        {steps.map((step) => (
          <RailRow
            key={step.key}
            step={step}
            progress={step.status === "current" ? currentProgress : null}
            timeLabel={step.status === "current" ? currentTimeLabel : null}
            warning={warning}
          />
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3">
        {footer}
        <div className="flex items-center justify-between px-2 text-[13px]">
          <span className="text-[#404040]">Interview time left</span>
          <strong className="font-semibold tabular-nums">{minutesLeft} min</strong>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="h-10 rounded-[10px] border border-[#D4D4D4] bg-white text-[13px] font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors"
        >
          Leave interview
        </button>
      </div>
    </aside>
  );
}

function RailRow({
  step,
  progress,
  timeLabel,
  warning,
}: {
  step: RailStep;
  progress: number | null;
  timeLabel: string | null;
  warning: boolean;
}) {
  const current = step.status === "current";
  const done = step.status === "done";
  const minutes = step.minutes !== null ? `${step.minutes} min` : null;
  const detail = current ? ["Now", timeLabel ?? minutes].filter(Boolean).join(" · ") : minutes;
  return (
    <li
      aria-current={current ? "step" : undefined}
      className={`flex items-start gap-3 rounded-[10px] px-3 py-2.5 ${
        current ? "bg-[#FFF7ED] border border-[#FED7AA]" : "border border-transparent"
      }`}
    >
      <span
        className={`mt-px h-5 w-5 shrink-0 rounded-full flex items-center justify-center box-border ${
          done ? "bg-[#0F0F0F]" : current ? "border-2 border-[#C85A17]" : "border-2 border-[#D4D4D4]"
        }`}
      >
        {done && <Check className="h-3 w-3 text-white" strokeWidth={3.5} aria-hidden="true" />}
        {current && <span className="h-2 w-2 rounded-full bg-[#C85A17]" />}
      </span>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <span className={`text-sm ${current ? "font-semibold" : done ? "text-[#404040]" : ""}`}>
          {step.label}
          {done && <span className="sr-only"> (done)</span>}
        </span>
        {detail && (
          <span className={`text-xs tabular-nums ${current ? (warning ? "text-[#B42318]" : "text-[#7E340B]") : "text-[#737373]"}`}>
            {detail}
          </span>
        )}
        {current && progress !== null && (
          <span className="block h-1 rounded-sm bg-[#FED7AA] overflow-hidden" aria-hidden="true">
            <span
              className={`block h-1 transition-[width] duration-1000 ease-linear ${warning ? "bg-[#B42318]" : "bg-[#C85A17]"}`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
        )}
        {step.note && <span className="text-xs text-[#7E340B]">{step.note}</span>}
      </div>
    </li>
  );
}
