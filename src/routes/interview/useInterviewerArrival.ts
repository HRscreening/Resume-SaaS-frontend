import { useEffect, useRef, useState } from "react";
import { RoomEvent, type Room } from "livekit-client";

import { interviewerArrival, interviewerRequestDue, type InterviewerArrival } from "./interviewerArrival";

function interviewerInRoom(room: Room): boolean {
  for (const participant of room.remoteParticipants.values()) {
    if (participant.isAgent) return true;
  }
  return false;
}

// Watches for the interviewer while the candidate is connected and, for as
// long as there is none, asks the server for one at a steady pace (see
// interviewerArrival.ts). `requestInterviewer` is the join call: the
// server dispatches an interviewer into a room that has none.
export function useInterviewerArrival(
  room: Room | null,
  connected: boolean,
  requestInterviewer: () => Promise<unknown>,
): InterviewerArrival {
  const [present, setPresent] = useState(false);
  const [waitedMs, setWaitedMs] = useState(0);
  // Held in a ref: the parent re-creates the callback on every render.
  const requestRef = useRef(requestInterviewer);
  requestRef.current = requestInterviewer;

  useEffect(() => {
    if (!room) {
      setPresent(false);
      return;
    }
    const refresh = () => setPresent(interviewerInRoom(room));
    refresh();
    room.on(RoomEvent.ParticipantConnected, refresh);
    room.on(RoomEvent.ParticipantDisconnected, refresh);
    return () => {
      room.off(RoomEvent.ParticipantConnected, refresh);
      room.off(RoomEvent.ParticipantDisconnected, refresh);
    };
  }, [room]);

  useEffect(() => {
    setWaitedMs(0);
    if (!connected || present) return;
    const startedAt = Date.now();
    let requests = 0;
    const id = window.setInterval(() => {
      const waited = Date.now() - startedAt;
      setWaitedMs(waited);
      if (interviewerRequestDue(false, waited, requests)) {
        requests += 1;
        // A failed request is simply made again at the next interval.
        requestRef.current().catch(() => {});
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [connected, present]);

  return interviewerArrival(present, waitedMs);
}
