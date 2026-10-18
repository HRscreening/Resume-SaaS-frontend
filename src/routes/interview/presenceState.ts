export type PresenceState = "speaking" | "listening" | "thinking";

// When the agent's own state is known it wins (see the `agentState`
// argument); the rules below are the fallback.
//
// Three states, not two: "the same animation for listening and speaking"
// and "no distinct thinking state" are the two anti-patterns this screen
// used to commit (see ThinkingDots). There is no explicit "thinking" signal
// from the backend — LiveKit's active-speaker set only ever says who is
// making sound right now — so this derives it from the one fact available:
// whether the conversation has produced a turn yet.
//
// - The interviewer's track is in the active-speaker set: "speaking".
// - It is not, but the candidate's is: "listening" (the interviewer is
//   listening to the candidate).
// - Neither is, and at least one turn has already happened: "thinking" —
//   the gap between a candidate's answer and the interviewer's next turn,
//   where nothing currently on screen used to change at all.
// - Neither is, and nothing has been said yet: "listening" — the warm-up's
//   original default ("the interviewer is listening, go ahead and
//   answer"), not "thinking", since there is nothing yet for the
//   interviewer to be processing.
export function derivePresenceState(
  interviewerSpeaking: boolean,
  candidateSpeaking: boolean,
  hasHeardAnything: boolean,
  agentState?: string | null,
): PresenceState {
  // The agent publishes its real state (`lk.agent.state`), which beats any
  // guess from audio. "initializing" and "idle" say nothing useful about
  // what the interviewer is doing, so they fall through to the audio rules
  // below, as does a missing attribute.
  if (agentState === "speaking" || agentState === "thinking" || agentState === "listening") {
    return agentState;
  }
  if (interviewerSpeaking) return "speaking";
  if (candidateSpeaking) return "listening";
  return hasHeardAnything ? "thinking" : "listening";
}

export function describePresence(state: PresenceState, reconnecting: boolean): string {
  // A connection problem always wins the read over a voice-activity one — a
  // candidate who cannot tell the call is unstable is worse off than one
  // who briefly cannot tell who is talking. Same precedence the old
  // StatusPill used.
  if (reconnecting) return "Reconnecting you to the interview.";
  switch (state) {
    case "speaking":
      return "The interviewer is speaking.";
    case "thinking":
      return "The interviewer is thinking.";
    case "listening":
    default:
      return "Listening to you.";
  }
}
