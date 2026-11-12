// Whether the interviewer is in the room, and what to do while they are not.
//
// The interviewer is dispatched with the room, once. LiveKit drops that
// dispatch if no interviewer process is connected at the moment and never
// retries it, so a candidate could sit in a silent room for good while the
// screen said "Listening to you" (local agent outage, 2026-11-06). While
// the interviewer is absent the screen says so, and asks the server again
// at a steady pace: the join endpoint dispatches a new interviewer into a
// room that has none (app/modules/interview/livekit_room.py). The same
// path brings a replacement in if the interviewer drops out mid-interview.

export type InterviewerArrival = "present" | "joining" | "delayed";

// Matches the server's DISPATCH_GRACE_S: a request any sooner would be
// ignored as the room's first interviewer still arriving.
export const INTERVIEWER_REQUEST_EVERY_MS = 20_000;
// Past this, the wait is long enough to say so.
export const INTERVIEWER_DELAYED_MS = 45_000;

export const INTERVIEWER_DELAYED_COPY =
  "Your interviewer is taking longer than usual to join. Stay on this page: we are still connecting them.";

export function interviewerArrival(present: boolean, waitedMs: number): InterviewerArrival {
  if (present) return "present";
  return waitedMs >= INTERVIEWER_DELAYED_MS ? "delayed" : "joining";
}

/** Whether to ask the server for an interviewer again, given how many
 * requests this wait has already made. */
export function interviewerRequestDue(present: boolean, waitedMs: number, requests: number): boolean {
  return !present && waitedMs >= (requests + 1) * INTERVIEWER_REQUEST_EVERY_MS;
}
