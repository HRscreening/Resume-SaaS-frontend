import { useEffect, useState } from "react";
import { Room, RoomEvent, Track } from "livekit-client";

// Tracks the candidate's own published microphone MediaStreamTrack — the
// local-participant counterpart to the interviewer's track InterviewRoom
// already tracks via TrackSubscribed/TrackUnsubscribed. Exists purely so
// VoiceMeter's candidate-side amplitude tap (useAudioAnalyser, unchanged)
// has something real to attach to. This hook never attaches, mutes,
// publishes, or republishes anything itself — it only reads whatever
// LiveKit is already doing with the mic and hands back the current track or
// null.
//
// `room` is the same mirrored Room instance InterviewRoom hands to
// useLiveCaptions/useQuestionSync (its `activeRoom` state): non-null for
// the lifetime of one connected session, null before connect and after a
// full disconnect.
//
// Recomputed on every local-track lifecycle event rather than read once,
// because the candidate's own mic track is not as stable as it looks:
// LiveKit's LocalAudioTrack stops the underlying hardware track on mute by
// default and acquires a brand new MediaStreamTrack on unmute (the old
// instance cannot be un-muted back to life), and a browser- or OS-level mic
// mute can produce the same swap without any action inside this app. Either
// one puts a *different* MediaStreamTrack instance on the same publication,
// which is why this re-reads `getTrackPublication` on every relevant event
// instead of capturing the track once at publish time and trusting it to
// stay valid.
export function useLocalAudioTrack(room: Room | null): MediaStreamTrack | null {
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    if (!room) {
      setTrack(null);
      return;
    }

    const activeRoom = room;

    function sync() {
      const publication = activeRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
      setTrack(publication?.track?.mediaStreamTrack ?? null);
    }

    // Covers the case where the mic was already published by the time this
    // effect subscribes (setMicrophoneEnabled resolves asynchronously in
    // InterviewRoom's connect effect, so the publish can race ahead of
    // this hook's listeners being attached).
    sync();

    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    room.on(RoomEvent.TrackMuted, sync);
    room.on(RoomEvent.TrackUnmuted, sync);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
      room.off(RoomEvent.TrackMuted, sync);
      room.off(RoomEvent.TrackUnmuted, sync);
    };
  }, [room]);

  return track;
}
