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
// Cumulative voiced time needed to confirm. Voiced time is only the vowels
// of what is said: a spoken sentence reached about 1.2 s of it in 3.6 s, so
// 800 ms is about a second and a half of talking. Noise, taps and a held
// hum are refused by voicing and stretches, not by this.
export const MIC_CONFIRM_MS = 800;
// A frame gap longer than this (a backgrounded tab, a GC pause) only counts
// as this long, so one stalled frame over noise cannot confirm on its own.
export const MIC_MAX_FRAME_MS = 100;

// Loudness alone still passed on a tap, a clap or music (UAT, 2026-11-06),
// so a frame also has to be voiced: periodic at a speaking pitch, which
// vocal cords are and taps, rustling and fan noise are not (`voicing`).
export const MIC_VOICING_MIN = 0.5;
// And the voiced time has to come in separate stretches, the way syllables
// do between consonants, so one held hum or whistle cannot pass either.
export const MIC_MIN_VOICED_STRETCHES = 3;
// The pitch range of speaking voices, low male to high child.
const PITCH_MIN_HZ = 70;
const PITCH_MAX_HZ = 400;
// Voicing is measured on the signal resampled to about this rate: plenty
// for speaking pitch, and a sixteenth of the work at 48 kHz.
const VOICING_RATE_HZ = 12_000;

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

/**
 * How voiced a frame is, 0..1: the peak normalized autocorrelation over
 * the lags of speaking pitch (70-400 Hz). A vowel repeats every pitch
 * period and scores near 1; noise, a click or a tap scores near 0. The
 * signal is first-differenced, which flattens low rumble (a fan, traffic)
 * that would otherwise correlate with itself at short lags.
 */
export function voicing(samples: ArrayLike<number>, sampleRate: number): number {
  const step = Math.max(1, Math.round(sampleRate / VOICING_RATE_HZ));
  const n = Math.floor(samples.length / step);
  const x = new Float32Array(n);
  let previous = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += samples[i * step + j]!;
    const value = sum / step;
    x[i] = value - previous;
    previous = value;
  }
  const rate = sampleRate / step;
  const minLag = Math.floor(rate / PITCH_MAX_HZ);
  const maxLag = Math.min(Math.ceil(rate / PITCH_MIN_HZ), n >> 1);
  let best = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let cross = 0;
    let head = 0;
    let tail = 0;
    for (let i = 1; i + lag < n; i++) {
      cross += x[i]! * x[i + lag]!;
      head += x[i]! * x[i]!;
      tail += x[i + lag]! * x[i + lag]!;
    }
    if (head > 0 && tail > 0) best = Math.max(best, cross / Math.sqrt(head * tail));
  }
  return best;
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
  /** Separate stretches of counted speech so far. */
  stretches: number;
  /** Whether the last frame counted as speech. */
  inStretch: boolean;
}

export const INITIAL_MIC_CHECK: MicCheckState = {
  voicedMs: 0, confirmed: false, noiseDbfs: null, elapsedMs: 0, stretches: 0, inStretch: false,
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
 * while the frame is voiced (`voicing` at or above MIC_VOICING_MIN) and its
 * level is clearly above both the minimum and the room's noise; other
 * frames neither add nor reset (people pause between words). Confirms on
 * enough speech time over at least MIC_MIN_VOICED_STRETCHES stretches.
 * Once confirmed it stays confirmed.
 */
export function stepMicCheck(
  state: MicCheckState,
  dbfs: number,
  dtMs: number,
  voiced: boolean,
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

  const counts = voiced && prevNoise !== null && state.elapsedMs >= warmupMs && level > threshold && dt > 0;
  const voicedMs = state.voicedMs + (counts ? dt : 0);
  const stretches = state.stretches + (counts && !state.inStretch ? 1 : 0);
  const confirmed = voicedMs >= confirmMs && stretches >= MIC_MIN_VOICED_STRETCHES;
  return { voicedMs, confirmed, noiseDbfs, elapsedMs, stretches, inStretch: counts };
}

/** 0..1 of the way to confirmation, for a progress hint. */
export function micCheckProgress(state: MicCheckState, confirmMs = MIC_CONFIRM_MS): number {
  if (state.confirmed) return 1;
  return Math.min(1, Math.max(0, state.voicedMs / confirmMs));
}
