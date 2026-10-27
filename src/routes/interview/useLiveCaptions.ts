import { useEffect, useState } from "react";
import type { Room, TextStreamHandler } from "livekit-client";

export type CaptionLine = { id: string; text: string; final: boolean };

const TOPIC = "lk.transcription";
const ATTR_FINAL = "lk.transcription_final";
const ATTR_SEGMENT = "lk.segment_id";

// Keep the last N lines per speaker. The full record lives on the server;
// this is a reading aid, and an unbounded list across a 50-minute interview
// is a leak.
const MAX_LINES = 40;

// Applies one incoming chunk to a speaker's line list, keyed by segment id.
// `appendMode` is the whole difficulty of this hook: the agent's chunks are
// fragments to add to what came before, the candidate's chunks are the full
// current text and replace it. See the comment in the handler below for why.
function upsertLine(
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
  return next.slice(-MAX_LINES);
}

// Subscribes to the `lk.transcription` text-stream topic that livekit-agents
// 1.6.4 publishes for both voices in the room, and produces two bounded,
// speaker-keyed caption lists. This is a reading aid only: the scoring
// transcript is the server-side one, and this hook never persists anything.
export function useLiveCaptions(room: Room | null, localIdentity: string) {
  const [agent, setAgent] = useState<CaptionLine[]>([]);
  const [candidate, setCandidate] = useState<CaptionLine[]>([]);

  useEffect(() => {
    if (!room) return;

    const handler: TextStreamHandler = async (reader, participant) => {
      const isLocal = participant.identity === localIdentity;
      const setLines = isLocal ? setCandidate : setAgent;

      // The agent's transcription is a DELTA stream: each chunk is a
      // fragment to append to what came before (livekit-agents
      // room_io.py:152, is_delta_stream=True). The candidate's own
      // transcription is NOT a delta stream: each chunk is the full current
      // text and REPLACES the previous one (room_io.py:145,
      // is_delta_stream=False). Rendering both as append garbles the
      // candidate's own caption into repeated text; rendering both as
      // replace drops all but the last fragment of the interviewer's
      // sentence. Confirmed against livekit-agents 1.6.4 — not guessable
      // from this file alone, so keep this comment if you touch the logic.
      const appendMode = !isLocal;
      const id = reader.info.attributes?.[ATTR_SEGMENT] ?? reader.info.id;
      let streamFinal = false;

      try {
        for await (const chunk of reader) {
          streamFinal = reader.info.attributes?.[ATTR_FINAL] === "true";
          setLines((prev) => upsertLine(prev, id, chunk, streamFinal, appendMode));
        }
      } catch {
        // The transport tore down (room disconnect, unmount) while this
        // stream was still being read. LiveKit invokes text-stream handlers
        // fire-and-forget, so an uncaught throw here becomes an unhandled
        // promise rejection rather than a graceful stop. There is nothing
        // candidate-facing to show for a teardown mid-utterance: drop the
        // partial stream quietly and leave the line as it last rendered.
        return;
      }

      // This stream has closed. Only promote the line to final if THIS
      // stream's own attribute said so: forcing final on every close is
      // correct for the agent's one continuous delta stream, but wrong if a
      // speaker's utterance instead arrives as several streams sharing one
      // segment id (e.g. each interim revision republished as its own
      // stream) -- an earlier, non-final stream closing would otherwise
      // settle the line solid, and the next revision's first chunk
      // (final=false) would un-settle it, flickering on every revision.
      // Leaving the line's existing final state untouched when this stream
      // never declared itself final means a provider that never sets the
      // attribute leaves the line dimmed rather than flickering -- an
      // accepted, visually mild tradeoff.
      if (streamFinal) {
        setLines((prev) =>
          prev.map((line) => (line.id === id ? { ...line, final: true } : line)),
        );
      }
    };

    room.registerTextStreamHandler(TOPIC, handler);
    return () => room.unregisterTextStreamHandler(TOPIC);
  }, [room, localIdentity]);

  return { agent, candidate };
}
