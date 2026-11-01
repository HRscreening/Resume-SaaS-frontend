import type { Room } from "livekit-client";
import { TOPIC } from "./notifySubmission";

const REPEAT_COOLDOWN_MS = 10_000;

export type CandidateEvent = "done_speaking" | "repeat" | "moment" | "end_interview";

// Matches the agent's MOMENT_S (voice_agent/away_policy.py): how long the
// interviewer holds back check-ins after "Give me a moment".
export const MOMENT_MS = 90_000;

export function candidateEventPayload(event: CandidateEvent): string {
  return JSON.stringify({ event });
}

/** True when the Repeat control may be pressed again. */
export function canRepeat(lastAtMs: number | null, nowMs: number): boolean {
  return lastAtMs === null || nowMs - lastAtMs >= REPEAT_COOLDOWN_MS;
}

/**
 * Sends an event and waits for it to leave, up to `timeoutMs`. For the Leave
 * button, which disconnects right after: without the wait the disconnect can
 * beat the message, and the interview is held open instead of ended.
 * Never rejects.
 */
export async function sendCandidateEventAndWait(
  room: Room | null,
  event: CandidateEvent,
  timeoutMs = 2_000,
): Promise<void> {
  if (!room) return;
  try {
    const sent = room.localParticipant
      .sendText(candidateEventPayload(event), { topic: TOPIC })
      .then(() => undefined, (err: unknown) => console.warn("candidate event failed", event, err));
    const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs));
    await Promise.race([sent, timeout]);
  } catch (err) {
    console.warn("candidate event failed", event, err);
  }
}

/** Fire-and-forget: a dropped packet must never break the interview UI. */
export function sendCandidateEvent(room: Room | null, event: CandidateEvent): void {
  if (!room) return;
  try {
    void room.localParticipant
      .sendText(candidateEventPayload(event), { topic: TOPIC })
      .catch((err: unknown) => console.warn("candidate event failed", event, err));
  } catch (err) {
    console.warn("candidate event failed", event, err);
  }
}
