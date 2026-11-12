import { useCallback, useEffect, useRef, useState } from "react";

import { isMissingDeviceError, micCaptureOptions } from "./micCapture";
import {
  INITIAL_MIC_CHECK,
  MIC_THRESHOLD_METER_PERCENT,
  MIC_VOICING_MIN,
  meterPercent,
  micCheckProgress,
  rmsDbfs,
  speechThresholdDbfs,
  stepMicCheck,
  voicing,
  type MicCheckState,
} from "./micCheck";

// Everything a candidate's machine has to prove before they can start.
//
// The cost of getting this wrong is asymmetric. A candidate who joins with
// a dead speaker sits in silence while an interviewer talks to them, and
// the recording shows them failing to answer. They cannot tell whether the
// interview has started, and there is no second attempt. So each device is
// proved by observation, never by permission:
//
//   microphone  they spoke a prompted sentence loud enough, for long enough
//               (cumulative ~1.2 s above -50 dBFS), so it is their voice
//               reaching us and not the room's background noise
//   speaker     they clicked to say they heard the tone
//   camera      a live video track is rendering, and they can see themselves
//
// A granted permission proves only that the browser asked. A muted mic, a
// camera with the privacy shutter closed, and headphones routed to a
// disconnected device all grant permission and all produce nothing.

// The prompted sentence: long enough to clear MIC_CONFIRM_MS of speech at a
// normal pace, and natural to say out loud.
export const MIC_PROMPT = "Say: “My name is …, and I'm ready.”";

export interface AudioInputOption {
  deviceId: string;
  label: string;
}

export interface DeviceCheckState {
  micConfirmed: boolean;
  speakerConfirmed: boolean;
  cameraConfirmed: boolean;
  micError: string | null;
  cameraError: string | null;
  levelPercent: number;
  // Where speech starts counting on the meter; follows the room's noise.
  thresholdPercent: number;
  // 0..1 of the cumulative speech the mic check needs.
  micProgress: number;
  // The deviceId of the microphone that actually passed the check (from the
  // live track's settings, not the request), handed to the room so it opens
  // the same device. Null until a track is live.
  micDeviceId: string | null;
  audioInputs: AudioInputOption[];
  selectMic: (deviceId: string) => void;
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
  const [micProgress, setMicProgress] = useState(0);
  const [thresholdPercent, setThresholdPercent] = useState(MIC_THRESHOLD_METER_PERCENT);
  const [tonePlaying, setTonePlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The device the candidate picked; undefined means the browser default.
  const [requestedMicId, setRequestedMicId] = useState<string | undefined>(undefined);
  const [micDeviceId, setMicDeviceId] = useState<string | null>(null);
  const [audioInputs, setAudioInputs] = useState<AudioInputOption[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let check: MicCheckState = INITIAL_MIC_CHECK;
    setMicConfirmed(false);
    setMicProgress(0);
    setLevelPercent(0);

    async function start() {
      // Audio and video are requested in one call so the candidate sees a
      // single permission prompt rather than two in a row, which reads as
      // the page malfunctioning. The audio processing matches what the room
      // will use (micCaptureOptions), so the check hears what the
      // interviewer will hear.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: micCaptureOptions(requestedMicId) as MediaTrackConstraints,
          video: requiresCamera,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];
        setMicDeviceId(audioTrack?.getSettings().deviceId ?? requestedMicId ?? null);
        // Labels are only exposed once permission is granted, so the list
        // is read after getUserMedia. Failure just hides the picker.
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            if (cancelled) return;
            setAudioInputs(
              devices
                .filter((d) => d.kind === "audioinput" && d.deviceId)
                .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })),
            );
          })
          .catch(() => {});

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
        analyser.fftSize = 2048;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        let lastAt = performance.now();
        let lastProgress = 0;
        let lastThreshold = MIC_THRESHOLD_METER_PERCENT;

        // Loudness and voicing each frame; confirmation needs ~1.2 s of
        // voiced speech well above the room's own noise, in separate
        // stretches (see micCheck.ts), so noise, a tap, a clap or a held hum
        // cannot pass it.
        const tick = () => {
          const now = performance.now();
          const dt = now - lastAt;
          lastAt = now;
          analyser.getFloatTimeDomainData(samples);
          const dbfs = rmsDbfs(samples);
          setLevelPercent(meterPercent(dbfs));
          if (!check.confirmed) {
            const voiced = voicing(samples, audioCtx.sampleRate) >= MIC_VOICING_MIN;
            check = stepMicCheck(check, dbfs, dt, voiced);
            const threshold = meterPercent(speechThresholdDbfs(check));
            if (threshold !== lastThreshold) {
              lastThreshold = threshold;
              setThresholdPercent(threshold);
            }
            const progress = micCheckProgress(check);
            if (progress !== lastProgress) {
              lastProgress = progress;
              setMicProgress(progress);
            }
            if (check.confirmed) setMicConfirmed(true);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        // The picked microphone was unplugged: go back to the default one
        // instead of showing an error the candidate cannot act on.
        if (requestedMicId && isMissingDeviceError(err)) {
          setRequestedMicId(undefined);
          return;
        }
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
  }, [attempt, requiresCamera, requestedMicId]);

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

  // Switching microphones restarts the check: the new one has to prove
  // itself, and it is the one the room will open.
  const selectMic = useCallback((deviceId: string) => {
    setMicError(null);
    setCameraError(null);
    setCameraConfirmed(false);
    setRequestedMicId(deviceId || undefined);
  }, []);

  return {
    micConfirmed, speakerConfirmed, cameraConfirmed,
    micError, cameraError, levelPercent, thresholdPercent, micProgress,
    micDeviceId, audioInputs, selectMic,
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
              ? "Looking good."
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
            : state.micProgress > 0
              ? "Keep going, a little more..."
              : "Read the line below out loud at your normal speaking volume."
        }
        done={state.micConfirmed}
      >
        {!state.micConfirmed && (
          <p className="mt-2 text-sm font-medium text-[#0F0F0F]">{MIC_PROMPT}</p>
        )}
        {/* The level meter, with a tick where speech starts counting. */}
        <div
          className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F0EEE6]"
          role="meter"
          aria-label="Microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={state.levelPercent}
        >
          <div
            className={`h-full transition-[width] duration-75 ${
              state.levelPercent >= state.thresholdPercent ? "bg-[#15803D]" : "bg-[#C85A17]"
            }`}
            style={{ width: `${state.levelPercent}%` }}
          />
          <span
            aria-hidden="true"
            className="absolute top-0 h-full w-px bg-[#737373]"
            style={{ left: `${state.thresholdPercent}%` }}
          />
        </div>
        {!state.micConfirmed && (
          <div
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#F0EEE6]"
            aria-hidden="true"
          >
            <div
              className="h-full bg-[#15803D] transition-[width] duration-150"
              style={{ width: `${Math.round(state.micProgress * 100)}%` }}
            />
          </div>
        )}
        {state.audioInputs.length > 1 && (
          <label className="mt-2 flex items-center gap-2 text-xs text-[#737373]">
            <span className="shrink-0">Microphone</span>
            <select
              value={state.micDeviceId ?? ""}
              onChange={(e) => state.selectMic(e.target.value)}
              className="h-8 min-w-0 flex-1 rounded-lg border border-[#D4D4D4] bg-white px-2 text-xs text-[#404040]"
            >
              {state.micDeviceId === null && <option value="">Default</option>}
              {state.audioInputs.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        )}
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
