import { describe, expect, it } from "vitest";

import {
  INITIAL_MIC_CHECK,
  MIC_CONFIRM_MS,
  MIC_FLOOR_DBFS,
  MIC_ABOVE_NOISE_DB,
  MIC_SPEECH_DBFS,
  meterPercent,
  micCheckProgress,
  rmsDbfs,
  speechThresholdDbfs,
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

const frames = (db: number, ms: number): Array<[number, number]> =>
  Array.from({ length: Math.round(ms / 16) }, () => [db, 16] as [number, number]);

// A quiet room the check has listened to before the candidate speaks.
const QUIET_ROOM = frames(-70, 600);

describe("stepMicCheck", () => {
  it("never confirms on steady background noise, however loud the room", () => {
    // -38 dBFS is louder than the old fixed -50 threshold (UAT, 2026-11-04).
    for (const noise of [-70, -50, -38, -30]) {
      expect(run(frames(noise, 20_000)).voicedMs).toBe(0);
    }
  });

  it("never confirms on noise that wobbles a few dB (a fan, traffic, typing)", () => {
    const wobble = Array.from({ length: 1500 }, (_, i) => [-42 + 6 * Math.sin(i / 7), 16] as [number, number]);
    expect(run(wobble).confirmed).toBe(false);
  });

  it("does not count anything during the warm-up", () => {
    expect(run(frames(-25, 400)).voicedMs).toBe(0);
  });

  it("does not confirm on a single loud frame", () => {
    expect(run([...QUIET_ROOM, [-20, 16]]).confirmed).toBe(false);
  });

  it("confirms after ~1.2 s of cumulative speech above the room", () => {
    const speech = frames(-30, 1184);
    expect(run([...QUIET_ROOM, ...speech]).confirmed).toBe(false);
    expect(run([...QUIET_ROOM, ...speech, [-30, 16]]).confirmed).toBe(true);
  });

  it("confirms speech in a noisy room when the voice is clearly above it", () => {
    const room = frames(-45, 600);
    const speech = Array.from({ length: 120 }, (_, i) => [i % 10 < 7 ? -25 : -45, 16] as [number, number]);
    expect(run([...room, ...speech, ...speech]).confirmed).toBe(true);
  });

  it("accumulates across pauses rather than resetting", () => {
    expect(run([...QUIET_ROOM, ...frames(-30, 640), ...frames(-80, 960), ...frames(-30, 640)]).confirmed).toBe(true);
  });

  it("learns the room while the candidate talks from the very first frame", () => {
    // No quiet start: the gaps between words reveal the room.
    const talk = Array.from({ length: 300 }, (_, i) => [i % 8 < 5 ? -28 : -65, 16] as [number, number]);
    expect(run(talk).confirmed).toBe(true);
  });

  it("caps a long frame gap so one stalled frame cannot confirm", () => {
    const s = run([...QUIET_ROOM, [-20, 5000]]);
    expect(s.confirmed).toBe(false);
    expect(s.voicedMs).toBe(100);
  });

  it("ignores negative or non-finite frame durations", () => {
    const ready = run(QUIET_ROOM);
    expect(stepMicCheck(ready, -20, -50).voicedMs).toBe(0);
    expect(stepMicCheck(ready, -20, Number.NaN).voicedMs).toBe(0);
  });

  it("stays confirmed once confirmed", () => {
    const confirmed = { ...INITIAL_MIC_CHECK, voicedMs: MIC_CONFIRM_MS, confirmed: true };
    expect(stepMicCheck(confirmed, -90, 16)).toBe(confirmed);
  });

  it("raises the bar with the room's noise", () => {
    expect(speechThresholdDbfs(run(QUIET_ROOM))).toBe(MIC_SPEECH_DBFS);
    expect(speechThresholdDbfs(run(frames(-40, 600)))).toBeCloseTo(-40 + MIC_ABOVE_NOISE_DB);
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
    expect(micCheckProgress({ ...INITIAL_MIC_CHECK, voicedMs: MIC_CONFIRM_MS / 2 })).toBeCloseTo(0.5);
    expect(micCheckProgress({ ...INITIAL_MIC_CHECK, confirmed: true })).toBe(1);
  });
});
