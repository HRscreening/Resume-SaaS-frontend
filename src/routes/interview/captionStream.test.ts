import { describe, expect, it } from "vitest";

import {
  MAX_CAPTION_LINES,
  isFinal,
  segmentIdFor,
  settleLine,
  speakerFor,
  upsertLine,
  type CaptionLine,
} from "./captionStream";

const LOCAL = "candidate";
const MIC = "TR_candidate_mic";

describe("speakerFor", () => {
  it("attributes a stream about the local mic track to the candidate", () => {
    expect(speakerFor({ "lk.transcribed_track_id": MIC }, "candidate", MIC, LOCAL)).toBe("candidate");
  });

  it("attributes a stream about the agent's track to the agent", () => {
    expect(speakerFor({ "lk.transcribed_track_id": "TR_agent" }, "agent-AJ_123", MIC, LOCAL)).toBe("agent");
  });

  it("trusts the track id over the publisher identity", () => {
    // The agent process publishing the candidate's transcript under its own identity.
    expect(speakerFor({ "lk.transcribed_track_id": MIC }, "agent-AJ_123", MIC, LOCAL)).toBe("candidate");
    // A stream naming some other track, even if published as the candidate.
    expect(speakerFor({ "lk.transcribed_track_id": "TR_agent" }, "candidate", MIC, LOCAL)).toBe("agent");
  });

  it("falls back to identity when the track id is missing", () => {
    expect(speakerFor({}, "candidate", MIC, LOCAL)).toBe("candidate");
    expect(speakerFor(undefined, "agent-AJ_1", MIC, LOCAL)).toBe("agent");
  });

  it("falls back to identity before the local mic is published", () => {
    expect(speakerFor({ "lk.transcribed_track_id": "TR_x" }, "candidate", undefined, LOCAL)).toBe("candidate");
    expect(speakerFor({ "lk.transcribed_track_id": "TR_x" }, "agent-AJ_1", null, LOCAL)).toBe("agent");
  });
});

describe("isFinal", () => {
  it("is true only for the exact string 'true'", () => {
    expect(isFinal({ "lk.transcription_final": "true" })).toBe(true);
    expect(isFinal({ "lk.transcription_final": "false" })).toBe(false);
    expect(isFinal({})).toBe(false);
    expect(isFinal(undefined)).toBe(false);
  });

  it("sees a final flag merged in by the trailer after the chunks", () => {
    // Mirrors LiveKit: the trailer replaces info.attributes on the same info object.
    const info: { attributes: Record<string, string> } = { attributes: { "lk.segment_id": "s1" } };
    expect(isFinal(info.attributes)).toBe(false);
    info.attributes = { ...info.attributes, "lk.transcription_final": "true" };
    expect(isFinal(info.attributes)).toBe(true);
  });
});

describe("segmentIdFor", () => {
  it("prefers the segment id and falls back to the stream id", () => {
    expect(segmentIdFor({ "lk.segment_id": "SG_1" }, "stream")).toBe("SG_1");
    expect(segmentIdFor({}, "stream")).toBe("stream");
    expect(segmentIdFor(undefined, "stream")).toBe("stream");
  });
});

describe("upsertLine", () => {
  it("appends agent deltas within a segment", () => {
    let lines: CaptionLine[] = [];
    lines = upsertLine(lines, "s1", "Hello ", false, true);
    lines = upsertLine(lines, "s1", "there.", false, true);
    expect(lines).toEqual([{ id: "s1", text: "Hello there.", final: false }]);
  });

  it("replaces candidate text within a segment", () => {
    let lines: CaptionLine[] = [];
    lines = upsertLine(lines, "s1", "My name", false, false);
    lines = upsertLine(lines, "s1", "My name is Asha", true, false);
    expect(lines).toEqual([{ id: "s1", text: "My name is Asha", final: true }]);
  });

  it("keeps separate segments separate and bounds the list", () => {
    let lines: CaptionLine[] = [];
    for (let i = 0; i < MAX_CAPTION_LINES + 5; i++) lines = upsertLine(lines, `s${i}`, "x", true, true);
    expect(lines).toHaveLength(MAX_CAPTION_LINES);
    expect(lines[0]!.id).toBe("s5");
  });
});

describe("settleLine", () => {
  it("marks the segment final without touching its text", () => {
    const lines = [{ id: "s1", text: "Hi.", final: false }, { id: "s2", text: "Yo", final: false }];
    expect(settleLine(lines, "s1")).toEqual([{ id: "s1", text: "Hi.", final: true }, lines[1]]);
  });
  it("returns the same array when nothing changes", () => {
    const lines = [{ id: "s1", text: "Hi.", final: true }];
    expect(settleLine(lines, "s1")).toBe(lines);
    expect(settleLine(lines, "missing")).toBe(lines);
  });
});
