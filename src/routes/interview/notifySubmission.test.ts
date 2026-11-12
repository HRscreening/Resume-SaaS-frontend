import { describe, expect, it, vi } from "vitest";
import type { Room } from "livekit-client";
import { TOPIC, notifySubmitted } from "./notifySubmission";

function fakeRoom() {
  const sendText = vi.fn().mockResolvedValue(undefined);
  return { room: { localParticipant: { sendText } } as unknown as Room, sendText };
}

describe("notifySubmitted", () => {
  it("sends a plain submission without moved_on", () => {
    const { room, sendText } = fakeRoom();
    notifySubmitted(room, "q2", "python");
    expect(JSON.parse(sendText.mock.calls[0][0])).toEqual({
      event: "submitted",
      question_id: "q2",
      language: "python",
    });
    expect(sendText.mock.calls[0][1]).toEqual({ topic: TOPIC });
  });
  it("flags a Move on so the agent never starts a walkthrough", () => {
    const { room, sendText } = fakeRoom();
    notifySubmitted(room, "q2", "python", { movedOn: true });
    expect(JSON.parse(sendText.mock.calls[0][0])).toEqual({
      event: "submitted",
      question_id: "q2",
      language: "python",
      moved_on: true,
    });
  });
});
