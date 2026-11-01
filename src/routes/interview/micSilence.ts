export const SILENCE_WARNING_MS = 20_000;

export const SILENCE_WARNING_COPY =
  "We can't hear you. Check that your microphone is on and not muted.";

export function shouldWarnSilence(input: {
  micMuted: boolean;
  agentListening: boolean;
  agentHasSpoken: boolean;
  lastHeardAtMs: number;
  nowMs: number;
  // Silence is the candidate working while the editor is open: only a muted
  // mic is worth a warning then.
  codingPaneOpen: boolean;
}): boolean {
  if (!input.agentHasSpoken) return false;
  if (input.micMuted) return true;
  if (input.codingPaneOpen) return false;
  return input.agentListening && input.nowMs - input.lastHeardAtMs >= SILENCE_WARNING_MS;
}
