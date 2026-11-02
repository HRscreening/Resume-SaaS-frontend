// Pure decisions for the `lk.transcription` caption stream (see
// useLiveCaptions for the transport).

export type CaptionLine = { id: string; text: string; final: boolean };
export type CaptionSpeaker = "agent" | "candidate";

export const ATTR_FINAL = "lk.transcription_final";
export const ATTR_SEGMENT = "lk.segment_id";
export const ATTR_TRACK = "lk.transcribed_track_id";

// Keep the last N lines per speaker. The full record lives on the server;
// this is a reading aid, and an unbounded list across a 50-minute interview
// is a leak.
export const MAX_CAPTION_LINES = 40;

type Attrs = Record<string, string> | undefined;

/**
 * Whose words a caption stream carries. The transcribed track id is the
 * reliable signal: livekit-agents stamps every transcription with the sid of
 * the audio track it transcribed, so a stream about the candidate's own mic
 * track is the candidate's, whoever published it. Only when that cannot be
 * compared (older agent without the attribute, or the mic not yet published)
 * does the publisher's identity decide.
 */
export function speakerFor(
  attrs: Attrs,
  identity: string | undefined,
  localMicSid: string | undefined | null,
  localIdentity: string,
): CaptionSpeaker {
  const trackId = attrs?.[ATTR_TRACK];
  if (trackId && localMicSid) return trackId === localMicSid ? "candidate" : "agent";
  return identity === localIdentity ? "candidate" : "agent";
}

/** The stream declared its segment final. */
export function isFinal(attrs: Attrs): boolean {
  return attrs?.[ATTR_FINAL] === "true";
}

/** The segment a stream belongs to; falls back to the stream id. */
export function segmentIdFor(attrs: Attrs, streamId: string): string {
  return attrs?.[ATTR_SEGMENT] || streamId;
}

/**
 * Applies one incoming chunk to a speaker's line list, keyed by segment id.
 * The agent's chunks are fragments to APPEND (a delta stream); the
 * candidate's chunks are the full current text and REPLACE it.
 */
export function upsertLine(
  lines: CaptionLine[],
  id: string,
  chunk: string,
  final: boolean,
  appendMode: boolean,
): CaptionLine[] {
  const next = [...lines];
  const at = next.findIndex((line) => line.id === id);
  if (at === -1) {
    next.push({ id, text: chunk, final });
  } else {
    const existing = next[at]!;
    next[at] = { id, text: appendMode ? existing.text + chunk : chunk, final };
  }
  return next.slice(-MAX_CAPTION_LINES);
}

/** Marks a segment final once its stream has closed with the final flag. */
export function settleLine(lines: CaptionLine[], id: string): CaptionLine[] {
  const at = lines.findIndex((line) => line.id === id);
  if (at === -1 || lines[at]!.final) return lines;
  const next = [...lines];
  next[at] = { ...next[at]!, final: true };
  return next;
}
