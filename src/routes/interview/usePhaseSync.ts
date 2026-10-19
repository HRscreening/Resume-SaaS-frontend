import { useEffect, useState } from "react";
import type { Room, TextStreamHandler } from "livekit-client";

import { parsePhaseSignal, type InterviewPhase } from "./phaseSignal";

const TOPIC = "hiresort.phase";

// Subscribes to the server's `hiresort.phase` publishes (same transport and
// pattern as useQuestionSync). Null until the first tick arrives, or with an
// older agent that never sends one: the screen then shows exactly what it
// showed before this signal existed. A malformed tick keeps the last value.
export function usePhaseSync(room: Room | null): { phase: InterviewPhase | null; ending: boolean } {
  const [phase, setPhase] = useState<InterviewPhase | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!room) return;

    const handler: TextStreamHandler = async (reader) => {
      let text = "";
      try {
        for await (const chunk of reader) text += chunk;
      } catch {
        return; // transport tore down mid-read; the next tick corrects it
      }
      const signal = parsePhaseSignal(text);
      if (signal === null) return;
      setPhase(signal.phase);
      setEnding(signal.ending);
    };

    room.registerTextStreamHandler(TOPIC, handler);
    return () => room.unregisterTextStreamHandler(TOPIC);
  }, [room]);

  return { phase, ending };
}
