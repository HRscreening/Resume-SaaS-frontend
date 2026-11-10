import { describe, expect, it } from "vitest";

import { SETUP_INCOMPLETE_MESSAGE, publishBlockingReason } from "./roundSetup";

const question = { allocated_minutes: 48 };

function round(over: Partial<Parameters<typeof publishBlockingReason>[0]> = {}) {
  return {
    total_minutes: 60,
    overhead_minutes: 12,
    requirements: { camera: true, screen_share: true, confirmed: true },
    questions: [question],
    ...over,
  };
}

describe("publishBlockingReason", () => {
  it("is the setup first, even when the round is otherwise ready", () => {
    const reason = publishBlockingReason(
      round({ requirements: { camera: true, screen_share: true, confirmed: false } }),
    );
    expect(reason).toBe(SETUP_INCOMPLETE_MESSAGE);
  });

  it("then asks for a question", () => {
    expect(publishBlockingReason(round({ questions: [] }))).toMatch(/at least one question/);
  });

  it("then needs the allocation to add up", () => {
    const reason = publishBlockingReason(round({ questions: [{ allocated_minutes: 30 }] }));
    expect(reason).toMatch(/does not add up/);
  });

  it("is null when the round can be published", () => {
    expect(publishBlockingReason(round())).toBeNull();
  });
});
