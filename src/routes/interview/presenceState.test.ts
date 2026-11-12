import { describe, expect, it } from "vitest";
import { derivePresenceState } from "./presenceState";

describe("derivePresenceState", () => {
  it.each(["speaking", "thinking", "listening"] as const)(
    "a known agent state wins over contradicting audio: %s",
    (agentState) => {
      const opposite = agentState === "speaking";
      expect(derivePresenceState(!opposite, opposite, true, agentState)).toBe(agentState);
    },
  );

  it.each([null, undefined, "initializing", "idle", "bogus"])(
    "falls back to the audio guess for %s",
    (agentState) => {
      expect(derivePresenceState(true, false, false, agentState)).toBe("speaking");
      expect(derivePresenceState(false, true, true, agentState)).toBe("listening");
      expect(derivePresenceState(false, false, true, agentState)).toBe("thinking");
      expect(derivePresenceState(false, false, false, agentState)).toBe("listening");
    },
  );
});
