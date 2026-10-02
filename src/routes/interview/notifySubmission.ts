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
