import { useCallback, useEffect, useRef, useState } from "react";

// Everything a candidate's machine has to prove before they can start.
//
// The cost of getting this wrong is asymmetric. A candidate who joins with
// a dead speaker sits in silence while an interviewer talks to them, and
// the recording shows them failing to answer. They cannot tell whether the
// interview has started, and there is no second attempt. So each device is
// proved by observation, never by permission:
//
//   microphone  the level meter actually moved, so sound is reaching us
//   speaker     they clicked to say they heard the tone
//   camera      a live video track is rendering, and they can see themselves
//
// A granted permission proves only that the browser asked. A muted mic, a
// camera with the privacy shutter closed, and headphones routed to a
// disconnected device all grant permission and all produce nothing.

const MIC_LEVEL_THRESHOLD = 4;

export interface DeviceCheckState {
  micConfirmed: boolean;
  speakerConfirmed: boolean;
  cameraConfirmed: boolean;
  micError: string | null;
  cameraError: string | null;
  levelPercent: number;
  retry: () => void;
  playTone: () => void;
  confirmSpeaker: () => void;
  tonePlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useDeviceCheck(requiresCamera: boolean): DeviceCheckState {
  const [micConfirmed, setMicConfirmed] = useState(false);
  const [speakerConfirmed, setSpeakerConfirmed] = useState(false);
  const [cameraConfirmed, setCameraConfirmed] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [levelPercent, setLevelPercent] = useState(0);
  const [tonePlaying, setTonePlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    confirmedRef.current = false;

    async function start() {
      // Audio and video are requested in one call so the candidate sees a
      // single permission prompt rather than two in a row, which reads as
      // the page malfunctioning.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: requiresCamera,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        if (requiresCamera) {
          const track = stream.getVideoTracks()[0];
          if (track && track.readyState === "live") {
            setCameraConfirmed(true);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          } else {
            setCameraError("Your camera did not start. Check it is not in use by another app.");
          }
        }

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          const pct = Math.min(100, Math.round((avg / 128) * 100));
          setLevelPercent(pct);
          if (pct > MIC_LEVEL_THRESHOLD && !confirmedRef.current) {
            confirmedRef.current = true;
            setMicConfirmed(true);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error && err.name === "NotAllowedError"
            ? requiresCamera
              ? "Camera and microphone access were blocked. Allow them in your browser, then try again."
              : "Microphone access was blocked. Allow it in your browser, then try again."
            : err instanceof Error
              ? err.message
              : "Could not reach your microphone.";
        setMicError(message);
        if (requiresCamera) setCameraError(message);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [attempt, requiresCamera]);

  // A short, quiet tone through the same path the interviewer's voice will
  // take. Generated rather than fetched so there is no asset to fail to
  // load, and deliberately brief: this is a check, not a sound test.
  const playTone = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 528;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTonePlaying(true);
      osc.stop(ctx.currentTime + 0.95);
      osc.onended = () => {
        setTonePlaying(false);
        ctx.close().catch(() => {});
      };
    } catch {
      setTonePlaying(false);
    }
  }, []);

  const confirmSpeaker = useCallback(() => setSpeakerConfirmed(true), []);

  const retry = useCallback(() => {
    setMicError(null);
    setCameraError(null);
    setMicConfirmed(false);
    setCameraConfirmed(false);
    setLevelPercent(0);
    setAttempt((n) => n + 1);
  }, []);

  return {
    micConfirmed, speakerConfirmed, cameraConfirmed,
    micError, cameraError, levelPercent,
    retry, playTone, confirmSpeaker, tonePlaying, videoRef,
  };
}

export function deviceCheckPassed(
  state: DeviceCheckState, requiresCamera: boolean,
): boolean {
  return (
    state.micConfirmed &&
    state.speakerConfirmed &&
    (!requiresCamera || state.cameraConfirmed)
  );
}

function CheckRow({
  label, detail, done, children,
}: {
  label: string;
  detail: string;
  done: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-[#F0EEE6] last:border-b-0">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
            done ? "bg-[#15803D] text-white" : "border border-[#D4D4D4] text-transparent"
          }`}
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#0F0F0F]">{label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">{detail}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function DeviceCheckPanel({
  state, requiresCamera,
}: {
  state: DeviceCheckState;
  requiresCamera: boolean;
}) {
  const error = state.micError ?? state.cameraError;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-700">We could not reach your devices</p>
        <p className="mt-1 text-xs leading-relaxed text-red-600">{error}</p>
        <button
          type="button"
          onClick={state.retry}
          className="mt-3 h-8 rounded-lg border border-red-300 bg-white px-3 text-xs font-medium text-red-700 transition-colors hover:bg-red-50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8E5DF] bg-white px-4">
      {requiresCamera && (
        <CheckRow
          label="Camera"
          detail={
            state.cameraConfirmed
              ? "Looking good. This round is recorded with video."
              : "Starting your camera..."
          }
          done={state.cameraConfirmed}
        >
          <div className="mt-2 overflow-hidden rounded-lg bg-[#0F0F0F]">
            <video
              ref={state.videoRef}
              muted
              playsInline
              className="h-32 w-full scale-x-[-1] object-cover"
            />
          </div>
        </CheckRow>
      )}

      <CheckRow
        label="Microphone"
        detail={
          state.micConfirmed
            ? "We can hear you."
            : "Say something so we can check we can hear you."
        }
        done={state.micConfirmed}
      >
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F0EEE6]">
          <div
            className="h-full bg-[#C85A17] transition-[width] duration-75"
            style={{ width: `${state.levelPercent}%` }}
          />
        </div>
      </CheckRow>

      <CheckRow
        label="Speaker"
        detail={
          state.speakerConfirmed
            ? "You can hear us."
            : "Play the test sound. Your interviewer speaks, so you need to hear them."
        }
        done={state.speakerConfirmed}
      >
        {!state.speakerConfirmed && (
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={state.playTone}
              className="h-8 rounded-lg border border-[#D4D4D4] bg-white px-3 text-xs font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE]"
            >
              {state.tonePlaying ? "Playing..." : "Play test sound"}
            </button>
            <button
              type="button"
              onClick={state.confirmSpeaker}
              className="h-8 rounded-lg border border-[#D4D4D4] bg-white px-3 text-xs font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE]"
            >
              I heard it
            </button>
          </div>
        )}
      </CheckRow>
    </div>
  );
}
