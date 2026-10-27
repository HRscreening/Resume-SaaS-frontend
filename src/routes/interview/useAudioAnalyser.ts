import { useEffect, useState } from "react";

// Taps a live MediaStreamTrack for amplitude without ever joining its
// playback path. The AnalyserNode this returns is fed by a
// MediaStreamAudioSourceNode on its own, private AudioContext, and that
// graph is never connected onward to anything — not to this context's own
// destination, not to any other. There are no speakers anywhere downstream
// of it, so nothing this hook does can affect what the candidate hears.
//
// The track itself keeps being played exactly as it already is: a
// MediaStreamTrack can feed any number of independent consumers at once
// (this is how, e.g., a track can be both recorded and played back
// simultaneously), so wiring one more read-only tap onto it has no effect on
// the <audio> element InterviewRoom already attached it to. This is the
// "tap, do not interrupt" requirement: the analyser is a branch off the
// signal, never in series with it.
//
// Recreated whenever `track` changes — a reconnect or a track replacement
// hands LiveKit a new MediaStreamTrack instance even for "the same" remote
// participant — and torn down completely on unmount or when `track` goes to
// null: the source node is disconnected and the AudioContext is closed, so
// neither a track swap nor the interview ending can leave an AudioContext
// running in the background.
export function useAudioAnalyser(track: MediaStreamTrack | null): AnalyserNode | null {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!track) {
      setAnalyser(null);
      return;
    }

    const context = new AudioContext();
    const stream = new MediaStream([track]);
    const source = context.createMediaStreamSource(stream);
    const node = context.createAnalyser();
    node.fftSize = 256;
    source.connect(node);
    // Deliberately no `node.connect(context.destination)` or anything else
    // downstream: the graph ends here, at a node with no output wired to
    // anything. See the module comment above for why this cannot interrupt
    // playback — there is no path for this context to ever produce sound.

    // A freshly created AudioContext can start "suspended" until a user
    // gesture resumes it. Joining the interview already required one (the
    // browser's microphone permission prompt), so this almost always
    // resolves immediately; if it does not, the visual simply stays at rest
    // until it does. That is not worth surfacing to the candidate — it is a
    // visual flourish, not a signal they depend on to know the call is
    // live (the status pill covers that from real room events instead).
    context.resume().catch(() => {});

    setAnalyser(node);

    return () => {
      source.disconnect();
      node.disconnect();
      context.close().catch(() => {});
    };
  }, [track]);

  return analyser;
}
