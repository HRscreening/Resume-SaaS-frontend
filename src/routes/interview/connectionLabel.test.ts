import { ConnectionQuality } from "livekit-client";
import { describe, expect, it } from "vitest";
import { connectionLabel } from "./connectionLabel";

describe("connectionLabel", () => {
  it("labels poor and lost connections", () => {
    expect(connectionLabel(ConnectionQuality.Poor)).toBe("Weak connection");
    expect(connectionLabel(ConnectionQuality.Lost)).toBe("Connection lost");
  });

  it("shows nothing for healthy or unknown quality", () => {
    expect(connectionLabel(ConnectionQuality.Excellent)).toBeNull();
    expect(connectionLabel(ConnectionQuality.Good)).toBeNull();
    expect(connectionLabel(ConnectionQuality.Unknown)).toBeNull();
  });
});
