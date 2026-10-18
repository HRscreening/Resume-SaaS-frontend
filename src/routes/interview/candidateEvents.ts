import type { Room } from "livekit-client";
import { TOPIC } from "./notifySubmission";

const REPEAT_COOLDOWN_MS = 10_000;

export type CandidateEvent = "done_speaking" | "repeat";

export function candidateEventPayload(event: CandidateEvent): string {
  return JSON.stringify({ event });
}

/** True when the Repeat control may be pressed again. */
export function canRepeat(lastAtMs: number | null, nowMs: number): boolean {
  return lastAtMs === null || nowMs - lastAtMs >= REPEAT_COOLDOWN_MS;
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
