// Pure logic for the pre-join microphone check.
//
// The old check averaged FFT bins and passed on the first frame above a
// near-silent floor, so a fan or room hum confirmed the mic before the
// candidate said a word. This one measures loudness the way a meter does
// (RMS of the time-domain signal, in dBFS) and only confirms after the
// candidate has been audibly speaking for a cumulative stretch, so a single
// click or a steady low hum cannot pass it.

// A fixed threshold alone is not enough: a fixed -50 dBFS was cleared by
// ordinary room noise, and the check confirmed before the candidate said a
// word (UAT, 2026-11-04). Rooms differ by tens of dB, so the check works
// like an energy voice detector: it tracks the room's own noise level and
// only counts sound well above it.
//
// The absolute minimum a voice must reach, whatever the room. A voice at
// normal distance lands around -35 to -20 dBFS with browser AGC on.
export const MIC_SPEECH_DBFS = -45;
// How far above the room's noise a frame must be to count as speech.
export const MIC_ABOVE_NOISE_DB = 12;
// Noise tracking: falls to any quieter frame at once (the gaps between words
// expose the room), rises only slowly, so speech cannot drag the noise
// estimate up with it, while a fan that switches on is learnt in seconds.
export const MIC_NOISE_RISE_DB_PER_S = 3;
// Listen this long before anything counts, so the noise estimate exists.
export const MIC_WARMUP_MS = 500;
// Cumulative speech time needed to confirm. Roughly the prompted sentence
// spoken at a normal pace, minus pauses.
export const MIC_CONFIRM_MS = 1200;
// A frame gap longer than this (a backgrounded tab, a GC pause) only counts
// as this long, so one stalled frame over noise cannot confirm on its own.
export const MIC_MAX_FRAME_MS = 100;

// The floor reported for digital silence, so callers never see -Infinity.
export const MIC_FLOOR_DBFS = -100;

// The meter's visible range. Below the low end reads empty, above the high
// end reads full.
const METER_LOW_DBFS = -70;
const METER_HIGH_DBFS = -15;

/** RMS of samples in [-1, 1], in dBFS, floored at MIC_FLOOR_DBFS. */
export function rmsDbfs(samples: ArrayLike<number>): number {
  const n = samples.length;
  if (n === 0) return MIC_FLOOR_DBFS;
  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    const v = samples[i]!;
    sumSquares += v * v;
  }
  const rms = Math.sqrt(sumSquares / n);
  if (!(rms > 0)) return MIC_FLOOR_DBFS;
  return Math.max(MIC_FLOOR_DBFS, 20 * Math.log10(rms));
}

/** 0..100 for the level meter. */
export function meterPercent(dbfs: number): number {
  const pct = ((dbfs - METER_LOW_DBFS) / (METER_HIGH_DBFS - METER_LOW_DBFS)) * 100;
  return Math.round(Math.min(100, Math.max(0, pct)));
}

/** Where the minimum speech level sits on the meter, 0..100. */
export const MIC_THRESHOLD_METER_PERCENT = meterPercent(MIC_SPEECH_DBFS);

export interface MicCheckState {
  voicedMs: number;
  confirmed: boolean;
  /** The room's estimated noise level, dBFS; null before the first frame. */
  noiseDbfs: number | null;
  /** Time listened so far. */
  elapsedMs: number;
}

export const INITIAL_MIC_CHECK: MicCheckState = {
  voicedMs: 0, confirmed: false, noiseDbfs: null, elapsedMs: 0,
};

export interface MicCheckOptions {
  thresholdDbfs?: number;
  aboveNoiseDb?: number;
  noiseRiseDbPerS?: number;
  warmupMs?: number;
  confirmMs?: number;
  maxFrameMs?: number;
}

/** The level a frame must exceed to count as speech in this room. */
export function speechThresholdDbfs(
  state: MicCheckState,
  { thresholdDbfs = MIC_SPEECH_DBFS, aboveNoiseDb = MIC_ABOVE_NOISE_DB }: MicCheckOptions = {},
): number {
  return Math.max(thresholdDbfs, (state.noiseDbfs ?? MIC_FLOOR_DBFS) + aboveNoiseDb);
}

/**
 * Folds one analyser frame into the check. Speech time only accumulates
 * while the level is clearly above both the minimum and the room's noise;
 * quiet frames neither add nor reset (people pause between words). Once
 * confirmed it stays confirmed.
 */
export function stepMicCheck(
  state: MicCheckState,
  dbfs: number,
  dtMs: number,
  options: MicCheckOptions = {},
): MicCheckState {
  const {
    noiseRiseDbPerS = MIC_NOISE_RISE_DB_PER_S,
    warmupMs = MIC_WARMUP_MS,
    confirmMs = MIC_CONFIRM_MS,
    maxFrameMs = MIC_MAX_FRAME_MS,
  } = options;
  if (state.confirmed) return state;
  const dt = Math.min(maxFrameMs, Math.max(0, Number.isFinite(dtMs) ? dtMs : 0));
  const level = Number.isFinite(dbfs) ? dbfs : MIC_FLOOR_DBFS;

  // Judge this frame against the noise estimate from before it, then learn.
  const threshold = speechThresholdDbfs(state, options);
  const prevNoise = state.noiseDbfs;
  const noiseDbfs = prevNoise === null || level < prevNoise
    ? level
    : Math.min(level, prevNoise + (noiseRiseDbPerS * dt) / 1000);
  const elapsedMs = state.elapsedMs + dt;

  const counts = prevNoise !== null && state.elapsedMs >= warmupMs && level > threshold && dt > 0;
  const voicedMs = state.voicedMs + (counts ? dt : 0);
  return { voicedMs, confirmed: voicedMs >= confirmMs, noiseDbfs, elapsedMs };
}

/** 0..1 of the way to confirmation, for a progress hint. */
export function micCheckProgress(state: MicCheckState, confirmMs = MIC_CONFIRM_MS): number {
  if (state.confirmed) return 1;
  return Math.min(1, Math.max(0, state.voicedMs / confirmMs));
}
