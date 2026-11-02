import { describe, expect, it } from "vitest";

import {
  INITIAL_MIC_CHECK,
  MIC_CONFIRM_MS,
  MIC_FLOOR_DBFS,
  MIC_SPEECH_DBFS,
  meterPercent,
  micCheckProgress,
  rmsDbfs,
  stepMicCheck,
  type MicCheckState,
} from "./micCheck";

function sine(amplitude: number, n = 1024): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amplitude * Math.sin((2 * Math.PI * i) / 64);
  return out;
}

function run(frames: Array<[number, number]>): MicCheckState {
  return frames.reduce((s, [db, dt]) => stepMicCheck(s, db, dt), INITIAL_MIC_CHECK);
}

describe("rmsDbfs", () => {
  it("is 0 dBFS for a full-scale square wave", () => {
    expect(rmsDbfs([1, -1, 1, -1])).toBeCloseTo(0);
  });
  it("is about -3 dBFS for a full-scale sine", () => {
    expect(rmsDbfs(sine(1))).toBeCloseTo(-3.01, 1);
  });
  it("drops 20 dB per factor of ten in amplitude", () => {
    expect(rmsDbfs(sine(0.1)) - rmsDbfs(sine(1))).toBeCloseTo(-20, 1);
  });
  it("floors silence and empty input instead of returning -Infinity", () => {
    expect(rmsDbfs(new Float32Array(512))).toBe(MIC_FLOOR_DBFS);
    expect(rmsDbfs([])).toBe(MIC_FLOOR_DBFS);
  });
  it("puts quiet background hiss under the speech threshold", () => {
    // amplitude 0.002 is about -57 dBFS
    expect(rmsDbfs(sine(0.002))).toBeLessThan(MIC_SPEECH_DBFS);
    // amplitude 0.05 (normal speech) is about -29 dBFS
    expect(rmsDbfs(sine(0.05))).toBeGreaterThan(MIC_SPEECH_DBFS);
  });
});

describe("stepMicCheck", () => {
  it("never confirms on background noise below the threshold, however long", () => {
    const frames = Array.from({ length: 1000 }, () => [-60, 16] as [number, number]);
    expect(run(frames)).toEqual(INITIAL_MIC_CHECK);
  });

  it("does not confirm on a single loud frame", () => {
    expect(run([[-20, 16]]).confirmed).toBe(false);
  });

  it("confirms after ~1.2 s of cumulative speech", () => {
    const frames = Array.from({ length: 74 }, () => [-30, 16] as [number, number]); // 1184 ms
    expect(run(frames).confirmed).toBe(false);
    expect(run([...frames, [-30, 16]]).confirmed).toBe(true); // 1200 ms
  });

  it("accumulates across pauses rather than resetting", () => {
    const speech = Array.from({ length: 40 }, () => [-30, 16] as [number, number]); // 640 ms
    const pause = Array.from({ length: 60 }, () => [-80, 16] as [number, number]);
    expect(run([...speech, ...pause, ...speech]).confirmed).toBe(true);
  });

  it("caps a long frame gap so one stalled frame cannot confirm", () => {
    const s = stepMicCheck(INITIAL_MIC_CHECK, -20, 5000);
    expect(s.confirmed).toBe(false);
    expect(s.voicedMs).toBe(100);
  });

  it("ignores negative or non-finite frame durations", () => {
    expect(stepMicCheck(INITIAL_MIC_CHECK, -20, -50)).toBe(INITIAL_MIC_CHECK);
    expect(stepMicCheck(INITIAL_MIC_CHECK, -20, Number.NaN)).toBe(INITIAL_MIC_CHECK);
  });

  it("stays confirmed once confirmed", () => {
    const confirmed = { voicedMs: MIC_CONFIRM_MS, confirmed: true };
    expect(stepMicCheck(confirmed, -90, 16)).toBe(confirmed);
  });

  it("honours a tuned threshold and duration", () => {
    const s = stepMicCheck(INITIAL_MIC_CHECK, -45, 50, { thresholdDbfs: -40, confirmMs: 50 });
    expect(s.confirmed).toBe(false);
    expect(stepMicCheck(INITIAL_MIC_CHECK, -35, 50, { thresholdDbfs: -40, confirmMs: 50 }).confirmed).toBe(true);
  });
});

describe("meterPercent / micCheckProgress", () => {
  it("clamps the meter to 0..100", () => {
    expect(meterPercent(MIC_FLOOR_DBFS)).toBe(0);
    expect(meterPercent(0)).toBe(100);
    const mid = meterPercent(MIC_SPEECH_DBFS);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
  });
  it("reports progress toward confirmation", () => {
    expect(micCheckProgress(INITIAL_MIC_CHECK)).toBe(0);
    expect(micCheckProgress({ voicedMs: MIC_CONFIRM_MS / 2, confirmed: false })).toBeCloseTo(0.5);
    expect(micCheckProgress({ voicedMs: 0, confirmed: true })).toBe(1);
  });
});
