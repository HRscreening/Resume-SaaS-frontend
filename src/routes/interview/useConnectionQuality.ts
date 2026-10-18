import { useEffect, useState } from "react";
import { ConnectionQuality, RoomEvent, type Participant, type Room } from "livekit-client";

// Quality of the candidate's own link. The event fires for every
// participant, so it is filtered to the local one.
export function useConnectionQuality(room: Room | null): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);

  useEffect(() => {
    if (!room) {
      setQuality(ConnectionQuality.Unknown);
      return;
    }
    setQuality(room.localParticipant.connectionQuality);
    const handleChange = (next: ConnectionQuality, participant: Participant) => {
      if (participant.identity === room.localParticipant.identity) setQuality(next);
    };
    room.on(RoomEvent.ConnectionQualityChanged, handleChange);
    return () => {
      room.off(RoomEvent.ConnectionQualityChanged, handleChange);
    };
  }, [room]);

  return quality;
}
