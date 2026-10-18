export const SILENCE_WARNING_MS = 20_000;

export const SILENCE_WARNING_COPY =
  "We can't hear you. Check that your microphone is on and not muted.";

export function shouldWarnSilence(input: {
  micMuted: boolean;
  agentListening: boolean;
  agentHasSpoken: boolean;
  lastHeardAtMs: number;
  nowMs: number;
}): boolean {
  if (!input.agentHasSpoken) return false;
  if (input.micMuted) return true;
  return input.agentListening && input.nowMs - input.lastHeardAtMs >= SILENCE_WARNING_MS;
}
