// The server's view of where the interview is, published on `hiresort.phase`
// beside the question pointer (backend voice_agent/question_flow.py,
// PHASE_SYNC_TOPIC). Payload: {"phase": str, "ending": bool, "end_reason": str | null}.

// Shown while the interviewer speaks its closing line: the page is about to
// go quiet and the candidate should not think it froze.
export const ENDING_COPY = "Wrapping up: the interview is ending.";
// A quiet heads-up on a long question, well before the red last minute.
export const FIVE_MINUTE_COPY = "About five minutes left on this question.";

export type InterviewPhase = "opening" | "spoken" | "coding" | "walkthrough" | "closing";

const PHASES: ReadonlySet<string> = new Set(["opening", "spoken", "coding", "walkthrough", "closing"]);

export interface PhaseSignal {
  phase: InterviewPhase;
  // The agent is speaking its closing line; the room closes right after.
  ending: boolean;
}

// Null for anything that is not a known phase: an older agent, a malformed
// payload. The caller keeps its last known value, exactly as useQuestionSync
// does for a bad tick.
export function parsePhaseSignal(raw: string): PhaseSignal | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { phase, ending } = parsed as Record<string, unknown>;
  if (typeof phase !== "string" || !PHASES.has(phase)) return null;
  return { phase: phase as InterviewPhase, ending: ending === true };
}

// What the top bar shows for the phases the question counter cannot
// express: the warm-up before any question, and the candidate's own
// questions after the last one. Null while the questions run, where the
// counter already says it.
export function phaseLabel(phase: InterviewPhase | null): string | null {
  if (phase === "opening") return "Warm-up";
  if (phase === "closing") return "Your questions";
  return null;
}

// A one-line notice shown for the first 30 seconds after a question's
// countdown crosses five minutes, so a candidate deep in a long answer gets
// a quiet heads-up well before the red last-minute state. Only for questions
// long enough that five minutes is not the whole question.
export const FIVE_MINUTE_NOTICE_S = 300;
const NOTICE_WINDOW_S = 30;
const MIN_QUESTION_MINUTES_FOR_NOTICE = 6;

export function fiveMinuteNotice(
  secondsRemaining: number,
  allocatedMinutes: number | undefined,
  timerActive: boolean,
): boolean {
  if (!timerActive || (allocatedMinutes ?? 0) < MIN_QUESTION_MINUTES_FOR_NOTICE) return false;
  return (
    secondsRemaining <= FIVE_MINUTE_NOTICE_S && secondsRemaining > FIVE_MINUTE_NOTICE_S - NOTICE_WINDOW_S
  );
}
