// Drift beyond this between the local countdown and the server's clock makes
// the screen adopt the server's value. Under it, the local deadline is kept:
// the signal arrives every ~5s with network jitter, and snapping to each one
// would make the visible seconds stutter for no real gain.
export const DEADLINE_REALIGN_MS = 3000;

export interface QuestionSignal {
  questionId: string;
  remainingS: number | null;
}

// Parses the `hiresort.question` payload:
// {"index": 2, "question_id": "q3", "remaining_s": 123.4 | null}.
// Returns null unless `question_id` is a non-empty string. `remaining_s` is
// only trusted when it is a finite number; anything else (absent, null, a
// string) means "the server has no clock for this question", and the caller
// falls back to its own countdown.
export function parseQuestionSignal(raw: string): QuestionSignal | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { question_id: id, remaining_s: remaining } = parsed as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0) return null;
  return {
    questionId: id,
    remainingS: typeof remaining === "number" && Number.isFinite(remaining) ? remaining : null,
  };
}

// Folds the server's remaining time into the local deadline (epoch ms).
// The server is the one authoritative clock, but it is only adopted when it
// disagrees with the local deadline by more than DEADLINE_REALIGN_MS.
export function reconcileDeadline(
  existing: number | null,
  remainingS: number | null,
  nowMs: number,
): number | null {
  if (remainingS === null) return existing;
  const serverDeadline = nowMs + remainingS * 1000;
  if (existing === null) return serverDeadline;
  return Math.abs(existing - serverDeadline) > DEADLINE_REALIGN_MS ? serverDeadline : existing;
}

// True only when the server's clock for the SAME question goes from a number to
// null: the server closed the question (e.g. the last spoken one ended early),
// so the local countdown must stop rather than run on into the next phase.
// A null that was never preceded by a number is just "no server clock yet",
// and the local fallback deadline stays.
export function shouldClearDeadline(
  prevRemainingS: number | null,
  nextRemainingS: number | null,
): boolean {
  return prevRemainingS !== null && nextRemainingS === null;
}
