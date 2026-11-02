import { useEffect, useState } from "react";
import { Track, type Room, type TextStreamHandler } from "livekit-client";

import {
  isFinal,
  segmentIdFor,
  settleLine,
  speakerFor,
  upsertLine,
  type CaptionLine,
} from "./captionStream";

export type { CaptionLine } from "./captionStream";

const TOPIC = "lk.transcription";

// Subscribes to the `lk.transcription` text-stream topic that livekit-agents
// publishes for both voices in the room, and produces two bounded,
// speaker-keyed caption lists. This is a reading aid only: the scoring
// transcript is the server-side one, and this hook never persists anything.
//
// The handler registers as soon as the Room object exists. InterviewRoom
// connects only after this effect has run, so the first caption of the
// interview cannot arrive before anyone is listening for it.
export function useLiveCaptions(room: Room | null, localIdentity: string) {
  const [agent, setAgent] = useState<CaptionLine[]>([]);
  const [candidate, setCandidate] = useState<CaptionLine[]>([]);

  useEffect(() => {
    if (!room) return;

    const handler: TextStreamHandler = async (reader, participant) => {
      // Read at stream start, not at registration: the mic publication (and
      // its sid) only exists once the room has connected and published it.
      const localMicSid = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.trackSid;
      const speaker = speakerFor(reader.info.attributes, participant.identity, localMicSid, localIdentity);
      const setLines = speaker === "candidate" ? setCandidate : setAgent;

      // The agent's transcription is a DELTA stream: each chunk is a
      // fragment to append to what came before (livekit-agents room_io,
      // is_delta_stream=True). The candidate's own transcription is NOT a
      // delta stream: each chunk is the full current text and REPLACES the
      // previous one (is_delta_stream=False). Rendering both as append
      // garbles the candidate's caption into repeated text; rendering both
      // as replace drops all but the last fragment of the interviewer's
      // sentence. Keep this comment if you touch the logic.
      const appendMode = speaker === "agent";
      const id = segmentIdFor(reader.info.attributes, reader.info.id);

      try {
        for await (const chunk of reader) {
          const final = isFinal(reader.info.attributes);
          setLines((prev) => upsertLine(prev, id, chunk, final, appendMode));
        }
      } catch {
        // The transport tore down (room disconnect, unmount) while this
        // stream was still being read. LiveKit invokes text-stream handlers
        // fire-and-forget, so an uncaught throw here becomes an unhandled
        // promise rejection rather than a graceful stop. Drop the partial
        // stream quietly and leave the line as it last rendered.
        return;
      }

      // The final flag usually arrives in the stream TRAILER, which LiveKit
      // merges into reader.info.attributes only after the last chunk has
      // been delivered. Reading it inside the loop alone meant the agent's
      // lines (one long delta stream) never settled. Re-read it here.
      //
      // Only promote when THIS stream said final: a speaker whose interim
      // revisions arrive as separate non-final streams sharing a segment id
      // must not flicker solid on every close.
      if (isFinal(reader.info.attributes)) {
        setLines((prev) => settleLine(prev, id));
      }
    };

    room.registerTextStreamHandler(TOPIC, handler);
    return () => room.unregisterTextStreamHandler(TOPIC);
  }, [room, localIdentity]);

  return { agent, candidate };
}
