import type { Room } from "livekit-client";
import type { InterviewLanguage } from "@/lib/interviewApi";

const TOPIC = "hiresort.candidate";

// Tells the agent, best-effort, that the candidate just submitted a coding
// question (flow-completion-contract.md, "4. The agent learns the candidate
// submitted"). Mirrors useLiveCaptions'/useQuestionSync's subscribe side
// (same room, a text-stream topic) but in the other direction.
//
// Called only after POST /submit has already succeeded — the submission is
// durable on the server by the time this runs. This is a courtesy nudge so
// the agent stops waiting in silence, never a step the candidate's result
// depends on: it is fire-and-forget by design, and every failure mode (no
// room, the room mid-teardown, sendText itself throwing or rejecting) is
// swallowed here rather than surfaced to the caller. A dropped data packet
// is cosmetic; a submit that looked like it failed because this did would
// not be.
export function notifySubmitted(
  room: Room | null,
  questionId: string,
  language: InterviewLanguage,
): void {
  if (!room) return;
  try {
    const payload = JSON.stringify({ event: "submitted", question_id: questionId, language });
    void room.localParticipant.sendText(payload, { topic: TOPIC }).catch(() => {
      // Best-effort: the agent re-derives state from the candidate's next
      // turn (or its own polling) if this particular packet never arrives.
    });
  } catch {
    // A synchronous throw from sendText (room in a bad state, not yet
    // connected) is just as cosmetic as an async rejection above.
  }
}


// How often typing is reported, at most. Presence is all the agent needs,
// and it judges it over five minutes, so one packet every half minute is
// ample. Throttling matters: an un-throttled keystroke feed would be a
// data packet per character, and the agent would be parsing them instead
// of listening.
const ACTIVITY_THROTTLE_MS = 30_000;

let lastActivitySentAt = 0;

/**
 * Tells the agent the candidate is typing. Presence only: no keystrokes,
 * no content, not even which question.
 *
 * This is the other half of the dead-air fix. Silence during a coding
 * question is the candidate WORKING, but the agent hears only audio, so
 * without this it cannot tell "writing code" from "gone". The backend's
 * coding_presence watches speech AND this signal, and checks in only when
 * both have been quiet.
 *
 * Deliberately carries nothing about the code. Sending content would put
 * the candidate's half-finished solution in the model's context, which is
 * the one thing the interviewer must not have while they are still
 * working on it.
 *
 * Fire-and-forget like notifySubmitted, and throttled by the module-level
 * clock so every caller shares one budget.
 */
export function notifyActivity(room: Room | null): void {
  if (!room) return;
  const now = Date.now();
  if (now - lastActivitySentAt < ACTIVITY_THROTTLE_MS) return;
  lastActivitySentAt = now;
  try {
    void room.localParticipant
      .sendText(JSON.stringify({ event: "activity" }), { topic: TOPIC })
      .catch(() => {
        // Best-effort: a missed packet only costs one check-in the
        // candidate can answer with a word.
      });
  } catch {
    // As above: a synchronous throw here is cosmetic.
  }
}

/** Test seam: lets a test exercise the throttle without faking the clock. */
export function _resetActivityThrottle(): void {
  lastActivitySentAt = 0;
}
