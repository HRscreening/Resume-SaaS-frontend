// Pure logic for the pre-join microphone check.
//
// The old check averaged FFT bins and passed on the first frame above a
// near-silent floor, so a fan or room hum confirmed the mic before the
// candidate said a word. This one measures loudness the way a meter does
// (RMS of the time-domain signal, in dBFS) and only confirms after the
// candidate has been audibly speaking for a cumulative stretch, so a single
// click or a steady low hum cannot pass it.

// Level a voice at normal distance comfortably clears (~-35 to -20 dBFS with
// browser AGC on) while a quiet room with noise suppression stays below.
export const MIC_SPEECH_DBFS = -50;
// Cumulative time above MIC_SPEECH_DBFS needed to confirm. Roughly the length
// of the prompted sentence spoken at a normal pace, minus pauses.
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

/** Where the speech threshold sits on the meter, 0..100. */
export const MIC_THRESHOLD_METER_PERCENT = meterPercent(MIC_SPEECH_DBFS);

export interface MicCheckState {
  voicedMs: number;
  confirmed: boolean;
}

export const INITIAL_MIC_CHECK: MicCheckState = { voicedMs: 0, confirmed: false };

export interface MicCheckOptions {
  thresholdDbfs?: number;
  confirmMs?: number;
  maxFrameMs?: number;
}

/**
 * Folds one analyser frame into the check. Time only accumulates while the
 * level is above the threshold; quiet frames neither add nor reset (people
 * pause between words). Once confirmed it stays confirmed.
 */
export function stepMicCheck(
  state: MicCheckState,
  dbfs: number,
  dtMs: number,
  {
    thresholdDbfs = MIC_SPEECH_DBFS,
    confirmMs = MIC_CONFIRM_MS,
    maxFrameMs = MIC_MAX_FRAME_MS,
  }: MicCheckOptions = {},
): MicCheckState {
  if (state.confirmed) return state;
  if (!(dbfs > thresholdDbfs)) return state;
  const dt = Math.min(maxFrameMs, Math.max(0, Number.isFinite(dtMs) ? dtMs : 0));
  if (dt === 0) return state;
  const voicedMs = state.voicedMs + dt;
  return { voicedMs, confirmed: voicedMs >= confirmMs };
}

/** 0..1 of the way to confirmation, for a progress hint. */
export function micCheckProgress(state: MicCheckState, confirmMs = MIC_CONFIRM_MS): number {
  if (state.confirmed) return 1;
  return Math.min(1, Math.max(0, state.voicedMs / confirmMs));
}
