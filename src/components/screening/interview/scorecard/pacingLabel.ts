import type { InterviewQuestionPacing } from "@/types";

const LABELS: Record<string, string> = {
  time_up: "Time ran out",
  submitted: "Submitted",
  model: "Moved on",
  follow_ups: "Follow-ups done",
};

/** Why a question ended, as a short recruiter-facing label; null if unknown. */
export function pacingLabel(p: InterviewQuestionPacing | undefined): string | null {
  return p ? (LABELS[p.reason] ?? null) : null;
}

export function pacingFor(
  pacing: InterviewQuestionPacing[] | undefined,
  questionId: string,
): InterviewQuestionPacing | undefined {
  return pacing?.find((p) => p.question_id === questionId);
}

/** "m of n min" for the label's tooltip; undefined (no tooltip) when a
 *  hand-edited metrics row carries a non-numeric time. */
export function pacingTooltip(p: InterviewQuestionPacing): string | undefined {
  const { seconds, budget_s: budget } = p;
  if (!Number.isFinite(seconds) || !Number.isFinite(budget)) return undefined;
  return `${Math.round(seconds / 60)} of ${Math.round(budget / 60)} min`;
}
