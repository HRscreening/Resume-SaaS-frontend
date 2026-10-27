// A requestAnimationFrame loop that turns a live AnalyserNode into a single
// smoothed 0..1 amplitude value, frame by frame. Deliberately not a React
// hook: both VoiceMeter (a direct DOM style update, no React state) and
// anything else that wants a live level need to run work on every frame
// without going through React state
// (a state update per animation frame, for up to an hour, is the kind of
// thing that is cheap in isolation and not worth paying 60 times a second
// next to a candidate's code editor).
//
// Amplitude comes from the time-domain waveform (getByteTimeDomainData),
// not frequency data: it is a direct read of "how loud is this signal right
// now" with no assumption about where a voice's energy sits in the
// spectrum, which also means it is unaffected by AnalyserNode.smoothingTimeConstant
// (that setting only smooths the frequency-domain methods).
export function createLevelLoop(
  analyser: AnalyserNode,
  onLevel: (level: number) => void,
): () => void {
  const data = new Uint8Array(analyser.fftSize);
  let smoothed = 0;
  let frameId: number;

  function tick() {
    analyser.getByteTimeDomainData(data);
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const centered = (data[i]! - 128) / 128;
      sumSquares += centered * centered;
    }
    const rms = Math.sqrt(sumSquares / data.length);
    // Conversational speech rarely drives RMS past ~0.25; this gain brings
    // normal speaking volume into view without clipping on a raised voice
    // (clamped to 1 either way).
    const raw = Math.min(1, rms * 4);
    // Asymmetric smoothing: jump toward a louder reading quickly (a word
    // starting should register right away) but settle back down slowly (a
    // brief pause between words should not make the shape flicker). This is
    // filtering of the real signal, not synthetic motion — with silence,
    // `raw` is 0 and `smoothed` decays to 0 and stays there.
    const attack = 0.5;
    const release = 0.08;
    smoothed += (raw - smoothed) * (raw > smoothed ? attack : release);
    onLevel(smoothed);
    frameId = requestAnimationFrame(tick);
  }

  frameId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frameId);
}
