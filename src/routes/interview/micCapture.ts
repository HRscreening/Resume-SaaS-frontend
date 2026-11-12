import type { AudioCaptureOptions, TrackPublishOptions } from "livekit-client";

// How the room opens the candidate's microphone.
//
// Two things went wrong with livekit-client's defaults:
//  - it opened the browser's default input, not the one the candidate had
//    just proved works on the join page, so a candidate with a headset could
//    pass the check on the headset and be heard through the laptop mic;
//  - it turns on voiceIsolation, which on some machines gates quiet or
//    accented speech hard enough that the interviewer hears nothing.
// Standard echo cancellation / noise suppression / AGC stay on: the
// interviewer's voice comes out of the same machine's speakers.
export function micCaptureOptions(deviceId?: string | null): AudioCaptureOptions {
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    voiceIsolation: false,
  };
}

// The tested device was unplugged (or its id rotated) between the check and
// the room: getUserMedia rejects an `exact` deviceId it cannot satisfy.
// Some browsers report NotFoundError instead of OverconstrainedError.
export function isMissingDeviceError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const name = (err as { name?: unknown }).name;
  return name === "OverconstrainedError" || name === "NotFoundError";
}

export interface MicEnabler {
  setMicrophoneEnabled(
    enabled: boolean,
    options?: AudioCaptureOptions,
    publishOptions?: TrackPublishOptions,
  ): Promise<unknown>;
}

// Turns the microphone on with the capture options above, on the tested
// device when one is known. If that device is gone, falls back to the
// browser's default input rather than failing the interview outright.
export async function enableMicrophone(
  participant: MicEnabler,
  deviceId: string | null | undefined,
  publishOptions?: TrackPublishOptions,
): Promise<void> {
  try {
    await participant.setMicrophoneEnabled(true, micCaptureOptions(deviceId), publishOptions);
  } catch (err) {
    if (!deviceId || !isMissingDeviceError(err)) throw err;
    await participant.setMicrophoneEnabled(true, micCaptureOptions(undefined), publishOptions);
  }
}
