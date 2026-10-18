import { describe, expect, it } from "vitest";
import { candidateEventPayload, canRepeat } from "./candidateEvents";

describe("candidateEventPayload", () => {
  it("serialises each event as {event}", () => {
    expect(candidateEventPayload("done_speaking")).toBe('{"event":"done_speaking"}');
    expect(candidateEventPayload("repeat")).toBe('{"event":"repeat"}');
  });
});

describe("canRepeat", () => {
  it("allows the first press", () => {
    expect(canRepeat(null, 5)).toBe(true);
  });
  it("blocks until 10 s have passed", () => {
    expect(canRepeat(0, 9_999)).toBe(false);
    expect(canRepeat(0, 10_000)).toBe(true);
  });
});
