import type { InterviewQuestion } from "@/lib/interviewApi";
import type { InterviewPhase } from "./phaseSignal";
import { formatCountdown } from "./useCountdown";

// The left rail: the whole interview as one timeline, so the candidate
// always knows where they are in the hour and what comes next. Every status
// here comes from the server's own signals (the question pointer and the
// phase), never from a local clock.

export type RailStatus = "done" | "current" | "upcoming";

export interface RailStep {
  key: string;
  label: string;
  // The question's allocated time; null for the warm-up and the closing,
  // which have no fixed slot.
  minutes: number | null;
  status: RailStatus;
  // A short second line under the current step, e.g. the walkthrough.
  note?: string;
}

interface RailInput {
  questions: Pick<InterviewQuestion, "id" | "kind" | "allocated_minutes">[];
  // -1 until the pointer names a known question (the warm-up).
  index: number;
  finished: boolean;
  phase: InterviewPhase | null;
  walkthrough?: boolean;
}

export function railSteps({ questions, index, finished, phase, walkthrough = false }: RailInput): RailStep[] {
  const closing = phase === "closing" || finished;
  const started = index >= 0 || closing;

  const steps: RailStep[] = [
    { key: "warmup", label: "Warm-up", minutes: null, status: started ? "done" : "current" },
  ];

  questions.forEach((q, i) => {
    let status: RailStatus = "upcoming";
    if (closing || (index >= 0 && i < index)) status = "done";
    else if (i === index) status = "current";
    steps.push({
      key: q.id,
      label: `Question ${i + 1} · ${q.kind === "coding" ? "Coding" : "Spoken"}`,
      minutes: q.allocated_minutes,
      status,
      note: status === "current" && walkthrough && q.kind === "coding" ? "Walking through your code" : undefined,
    });
  });

  steps.push({ key: "closing", label: "Your questions", minutes: null, status: closing ? "current" : "upcoming" });
  return steps;
}

// How much of the current question's time is used, 0..1, for its bar.
export function stepProgress(allocatedMinutes: number, secondsRemaining: number): number {
  const total = allocatedMinutes * 60;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - secondsRemaining / total));
}

// Whole seconds left in the interview, rounded up, never negative. A guide,
// not a deadline: the server decides when the interview ends. Before the
// call connects the whole duration is left.
export function interviewSecondsLeft(durationMinutes: number, startedAt: number | null, now: number): number {
  const totalS = Math.max(0, durationMinutes * 60);
  if (startedAt === null) return totalS;
  const leftS = totalS - (now - startedAt) / 1000;
  return Math.min(totalS, Math.max(0, Math.ceil(leftS)));
}

// "59:42 left", ticking every second. Whole minutes rounded up read "60" for
// the entire first minute, which looked frozen through the warm-up. At zero
// it says so rather than sitting at "0:00 left": the interview is not cut off
// by this clock.
export function interviewTimeLeftLabel(secondsLeft: number): string {
  if (!(secondsLeft > 0)) return "Time's up";
  return `${formatCountdown(secondsLeft)} left`;
}
