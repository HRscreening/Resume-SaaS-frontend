// The order a round is built in, as the screen enforces it: confirm the
// candidate setup, add questions, balance the time, publish. Pure so the
// gate logic is tested without a DOM, and shared so the card, the chat and
// the publish gate agree on the wording.
import type { RoundResponse } from "@/types";

export const SETUP_INCOMPLETE_MESSAGE =
  "Confirm the candidate setup (camera and screen share) before publishing.";

export const SETUP_PENDING_CHAT_MESSAGE =
  "Confirm the candidate setup above to start the conversation.";

type PublishableRound = Pick<RoundResponse, "total_minutes" | "overhead_minutes" | "requirements"> & {
  questions: Array<Pick<RoundResponse["questions"][number], "allocated_minutes">>;
};

// Why a draft cannot be published yet, in the order the steps are meant to
// happen, or null once it can. Mirrors the server's own publish checks
// (route.py), which remain the authority.
export function publishBlockingReason(round: PublishableRound): string | null {
  if (!round.requirements.confirmed) return SETUP_INCOMPLETE_MESSAGE;
  if (round.questions.length === 0) return "Add at least one question before publishing.";
  const allocated = round.questions.reduce((sum, q) => sum + q.allocated_minutes, 0);
  if (allocated !== round.total_minutes - round.overhead_minutes) {
    return "The allocation does not add up to the round's time budget yet. Ask the assistant to rebalance.";
  }
  return null;
}
