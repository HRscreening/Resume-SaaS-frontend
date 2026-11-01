import { describe, expect, it } from "vitest";
import { statusLine } from "./InterviewRecordingSection";

describe("statusLine", () => {
  it("says why there is nothing to play", () => {
    expect(statusLine({ status: "none", part_urls: [] })).toMatch(/not recorded/);
    expect(statusLine({ status: "failed", part_urls: [] })).toMatch(/could not be made/);
    expect(statusLine({ status: "processing", part_urls: [] })).toMatch(/still being processed/);
  });

  it("flags a partly uploaded recording and is silent once every part is in", () => {
    expect(statusLine({ status: "processing", part_urls: ["a"] })).toMatch(/Part of/);
    expect(statusLine({ status: "ready", part_urls: ["a", "b"] })).toBeNull();
  });
});
