import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";

import type { InterviewJoinGrant } from "@/lib/interviewApi";

// The candidate's LiveKit participant identity is always this literal string
// (minted server-side by mint_candidate_token — see backend service.join()).
// The agent is whatever other participant is in the room. Later tasks (live
// captions, in-call chrome) key off this to tell the two voices apart.
export const CANDIDATE_IDENTITY = "candidate";

type CallState = "connecting" | "connected" | "reconnecting" | "disconnected";

type RoomError = { kind: "mic" | "connection"; message: string };

interface InterviewRoomProps {
  grant: InterviewJoinGrant;
  // Resolves once a fresh grant has been applied to props, or rejects (the
  // rejection is what drives the "could not rejoin" error state below).
  onRejoin: () => Promise<unknown>;
}

// The live call. Owns the LiveKit Room instance end to end: connects on
// mount, tears down completely on unmount (a leaked Room keeps the mic hot
// and keeps the agent sitting in an empty room for its 5-minute
// empty_timeout), and renders the states a candidate will actually hit.
//
// Deliberately minimal beyond that: no captions, no in-call chrome. Later
// tasks extend this component rather than replace it.
export default function InterviewRoom({ grant, onRejoin }: InterviewRoomProps) {
  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [callState, setCallState] = useState<CallState>("connecting");
  const [error, setError] = useState<RoomError | null>(null);
  const [rejoining, setRejoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;

    function attachRemoteAudio(track: RemoteTrack, sid: string) {
      if (track.kind !== Track.Kind.Audio) return;
      const el = document.createElement("audio");
      el.autoplay = true;
      track.attach(el);
      audioElsRef.current.set(sid, el);
    }

    function detachRemoteAudio(track: RemoteTrack, sid: string) {
      const el = audioElsRef.current.get(sid);
      if (!el) return;
      track.detach(el);
      el.remove();
      audioElsRef.current.delete(sid);
    }

    function handleTrackSubscribed(
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) {
      attachRemoteAudio(track, publication.trackSid);
    }

    function handleTrackUnsubscribed(
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) {
      detachRemoteAudio(track, publication.trackSid);
    }

    function handleDisconnected() {
      if (!cancelled) setCallState("disconnected");
    }

    function handleReconnecting() {
      if (!cancelled) setCallState("reconnecting");
    }

    function handleReconnected() {
      if (!cancelled) setCallState("connected");
    }

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);

    async function connect() {
      setError(null);
      setCallState("connecting");
      try {
        await room.connect(grant.url, grant.token);
      } catch (err) {
        if (!cancelled) {
          setError({
            kind: "connection",
            message:
              err instanceof Error ? err.message : "Could not connect to the interview.",
          });
        }
        return;
      }
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (err) {
        if (!cancelled) {
          setError({
            kind: "mic",
            message:
              err instanceof Error ? err.message : "Could not access your microphone.",
          });
        }
        return;
      }
      if (!cancelled) setCallState("connected");
    }
    connect();

    return () => {
      cancelled = true;
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
      room.disconnect();
      audioElsRef.current.forEach((el) => el.remove());
      audioElsRef.current.clear();
      roomRef.current = null;
    };
    // grant.token changes on every rejoin (a fresh grant is minted each
    // time), which is exactly when this effect must tear down the old Room
    // and connect a new one.
  }, [grant.url, grant.token]);

  async function handleRejoin() {
    setRejoining(true);
    try {
      await onRejoin();
      // On success the parent hands down a new grant, which re-triggers the
      // connect effect above via its [grant.url, grant.token] deps.
    } catch (err) {
      setError({
        kind: "connection",
        message: err instanceof Error ? err.message : "Could not rejoin the interview.",
      });
    } finally {
      setRejoining(false);
    }
  }

  async function handleRetryMic() {
    const room = roomRef.current;
    if (!room) return;
    setError(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
      setCallState("connected");
    } catch (err) {
      setError({
        kind: "mic",
        message: err instanceof Error ? err.message : "Could not access your microphone.",
      });
    }
  }

  if (error?.kind === "mic") {
    return (
      <Centered>
        <div className="max-w-sm text-center">
          <MicOff className="h-6 w-6 text-[#404040] mx-auto mb-3" />
          <p className="text-sm text-[#404040] mb-4">
            We could not access your microphone. Check your browser's permission prompt or
            site settings, allow microphone access, then try again.
          </p>
          <RetryButton onClick={handleRetryMic} label="Retry" />
        </div>
      </Centered>
    );
  }

  if (error?.kind === "connection") {
    return (
      <Centered>
        <div className="max-w-sm text-center">
          <p className="text-sm text-[#404040] mb-4">
            We could not connect you to the interview. Check your internet connection and
            try again.
          </p>
          <RetryButton onClick={handleRejoin} label="Retry" loading={rejoining} />
        </div>
      </Centered>
    );
  }

  if (callState === "disconnected") {
    return (
      <Centered>
        <div className="max-w-sm text-center">
          <p className="text-sm text-[#404040] mb-4">You have left the interview.</p>
          <RetryButton onClick={handleRejoin} label="Rejoin" loading={rejoining} />
        </div>
      </Centered>
    );
  }

  if (callState === "connecting") {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#737373]" />
          <p className="text-sm text-[#737373]">Connecting you to the interviewer.</p>
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5F3EE" }}>
      {callState === "reconnecting" && (
        <div className="w-full bg-[#FDECD2] text-[#8A4B08] text-xs text-center py-2">
          Reconnecting…
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[#404040]">
          <Mic className="h-4 w-4" />
          <p className="text-sm">You are connected. The interview is in progress.</p>
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#F5F3EE" }}
    >
      {children}
    </div>
  );
}

function RetryButton({
  onClick,
  label,
  loading = false,
}: {
  onClick: () => void;
  label: string;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}
