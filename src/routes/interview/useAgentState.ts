import { useEffect, useState } from "react";
import { RoomEvent, type Room } from "livekit-client";

const AGENT_STATE_ATTRIBUTE = "lk.agent.state";

function readAgentState(room: Room): string | null {
  for (const participant of room.remoteParticipants.values()) {
    const state = participant.attributes?.[AGENT_STATE_ATTRIBUTE];
    if (state) return state;
  }
  return null;
}

// The agent's own report of what it is doing. Null until it publishes one,
// which is the cue for callers to fall back to guessing from audio.
export function useAgentState(room: Room | null): string | null {
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    if (!room) {
      setState(null);
      return;
    }
    const refresh = () => setState(readAgentState(room));
    refresh();
    room.on(RoomEvent.ParticipantAttributesChanged, refresh);
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, refresh);
      room.off(RoomEvent.ParticipantConnected, refresh);
      room.off(RoomEvent.ParticipantDisconnected, refresh);
    };
  }, [room]);

  return state;
}
