// API client for the interview round authoring surface: a hiring manager
// chats with an AI to build a round's questions, then publishes it. This
// screen is recruiter-facing and sits behind AuthGuard, unlike the
// candidate-facing interview (see interviewApi.ts, which deliberately does
// NOT use request() because a candidate has no account). Built on the
// authenticated request() helper from lib/api.ts, which already attaches
// the bearer token and calls assertWritable() to mirror the server's
// viewer/writer split client-side.
//
// Endpoint shapes come from
// .superpowers/sdd/2026-09-28-interview-round-authoring/api-contract.md —
// what backend/app/modules/interview/authoring/route.py actually shipped
// (Task 9), not the earlier plan prose.
//
// Error handling: request() throws ApiError (lib/api.ts), which carries the
// HTTP status alongside the server's detail message. The status codes are
// meaningful here and callers must branch on them rather than on message
// text:
//   409  chat on a published round (frozen); publish on an already-published
//        round; invites requested before publish
//   422  publish with an unsatisfied budget or zero questions; malformed
//        round/screening id
//   404  round not found, or belongs to another account (never distinguished)
//   403  a viewer attempting to author (read is allowed, writes are not) —
//        assertWritable() inside request() already refuses most of these
//        client-side before the network call, but the server is still the
//        authority
// Callers should `catch (e) { if (e instanceof ApiError && e.status === 409) ... }`
// rather than inspecting e.message.
import { request } from "@/lib/api";
import type {
  ChatTurnResponse,
  RoundResponse,
  RoundSummary,
} from "@/types";

export async function listRounds(screeningId: string): Promise<RoundSummary[]> {
  return request<RoundSummary[]>(`/api/v1/screenings/${screeningId}/rounds`);
}

export async function createRound(
  screeningId: string,
  title: string,
): Promise<RoundResponse> {
  return request<RoundResponse>(`/api/v1/screenings/${screeningId}/rounds`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function getRound(roundId: string): Promise<RoundResponse> {
  return request<RoundResponse>(`/api/v1/rounds/${roundId}`);
}

// One turn of the authoring conversation. Responses arrive whole (no
// streaming) — the returned `round` is the full draft after the AI's tool
// calls landed, and `reply` is the text to show in the chat panel. 409 when
// the round is already published (frozen); a hiring manager should be
// pointed at cloneRound() instead of retried.
export async function sendChatTurn(
  roundId: string,
  message: string,
): Promise<ChatTurnResponse> {
  return request<ChatTurnResponse>(`/api/v1/rounds/${roundId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// Freezes the round and unlocks candidate invites. No undo. 409 if already
// published; 422 if the allocation doesn't balance or there are no
// questions yet — both are conditions the UI should show inline rather than
// let the button no-op.
export async function publishRound(roundId: string): Promise<RoundResponse> {
  return request<RoundResponse>(`/api/v1/rounds/${roundId}/publish`, {
    method: "POST",
  });
}

// Deep-copies a published round into a new, editable draft. Only valid from
// a published round (409 otherwise) — cloning a draft is not a supported
// operation.
export async function cloneRound(roundId: string): Promise<RoundResponse> {
  return request<RoundResponse>(`/api/v1/rounds/${roundId}/clone`, {
    method: "POST",
  });
}
