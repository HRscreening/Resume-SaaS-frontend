import { useEffect, useRef, useState } from "react";
import { Loader2, MicOff } from "lucide-react";
import {
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";

import {
  InterviewApiError,
  InterviewRetryableError,
  type InterviewJoinGrant,
} from "@/lib/interviewApi";
import CodingPane from "./CodingPane";
import TopBar from "./TopBar";
import PinnedQuestion from "./PinnedQuestion";
import Transcript from "./Transcript";
import { useLiveCaptions } from "./useLiveCaptions";
import { useElapsedTime } from "./useElapsedTime";
import { useCodingQuestions } from "./useCodingQuestions";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { useLocalAudioTrack } from "./useLocalAudioTrack";
import { useTranscript } from "./useTranscript";
import { derivePresenceState } from "./presenceState";

// The candidate's LiveKit participant identity is always this literal string
// (minted server-side by mint_candidate_token — see backend service.join()).
// The agent is whatever other participant is in the room. Later tasks (live
// captions, in-call chrome) key off this to tell the two voices apart.
export const CANDIDATE_IDENTITY = "candidate";

type CallState = "connecting" | "connected" | "reconnecting" | "disconnected";

// `message` is shown to the candidate only when `fromServer` is set. A
// LiveKit or getUserMedia failure puts a raw browser string in there
// ("could not establish signal connection"), which is not copy a candidate
// should ever read; the server's own details are written for them.
type RoomError = { kind: "mic" | "connection"; message: string; fromServer?: boolean };

const CAPTIONS_PREFERENCE_KEY = "hiresort.interview.captionsEnabled";

// localStorage throws outright in some privacy modes. A thrown caption
// preference must never take down the interview, so every access is
// wrapped and falls back to "captions on" (the default a candidate expects).
function readCaptionsPreference(): boolean {
  try {
    return window.localStorage.getItem(CAPTIONS_PREFERENCE_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeCaptionsPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(CAPTIONS_PREFERENCE_KEY, String(enabled));
  } catch {
    // Nothing to recover: the toggle still works for this session, it just
    // will not be remembered next time.
  }
}

interface InterviewRoomProps {
  grant: InterviewJoinGrant;
  // The invite token from the URL. Carried here (rather than read again off
  // the route) only to call the three coding-pane endpoints, which are
  // authenticated solely by this token, exactly like join() above.
  token: string;
  // From the interview brief (InterviewJoin's getInterviewBrief call). Used
  // only to label the elapsed-time counter ("12:04 of about 50 minutes") —
  // never as a countdown or a deadline the UI enforces.
  durationMinutes: number;
  // Resolves once a fresh grant has been applied to props, or rejects (the
  // rejection is what drives the "could not rejoin" error state below).
  onRejoin: () => Promise<unknown>;
  // Re-describes the session: true once the server considers the interview
  // finished. Used to tell the agent ending the interview apart from the
  // candidate dropping out of it, which look identical from the browser.
  onCheckCompleted: () => Promise<boolean>;
}

// The live call. Owns the LiveKit Room instance end to end: connects on
// mount, tears down completely on unmount (a leaked Room keeps the mic hot
// and keeps the agent sitting in an empty room for its 5-minute
// empty_timeout), and renders the states a candidate will actually hit, plus
// the live caption panes. Deliberately minimal beyond that: no other in-call
// chrome. Later tasks extend this component rather than replace it.
export default function InterviewRoom({
  grant,
  token,
  durationMinutes,
  onRejoin,
  onCheckCompleted,
}: InterviewRoomProps) {
  const roomRef = useRef<Room | null>(null);
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const [callState, setCallState] = useState<CallState>("connecting");
  const [error, setError] = useState<RoomError | null>(null);
  const [rejoining, setRejoining] = useState(false);
  // Timestamp of the first successful connect. Set once and never cleared by
  // a reconnect or rejoin — see useElapsedTime for why.
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // The candidate deliberately ended the interview. Distinct from
  // callState === "disconnected", which also covers an accidental drop and
  // offers a Rejoin button — ending on purpose is final, with no rejoin.
  const [completed, setCompleted] = useState(false);
  // True while the post-disconnect brief re-fetch is in flight. Without it
  // the candidate sees "You have left the interview." flash up for the
  // duration of that request at the end of every normal interview.
  const [checkingIfFinished, setCheckingIfFinished] = useState(false);
  // Mirrors roomRef in state: the captions hook needs a value that changes
  // reference (and re-renders) on every connect/reconnect, which a ref alone
  // does not give us.
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [captionsEnabled, setCaptionsEnabled] = useState(() => readCaptionsPreference());
  // The interviewer's own MediaStreamTrack, held purely so VoiceMeter's
  // amplitude tap (useAudioAnalyser) has something to attach to. Never
  // attached to anything itself — attachRemoteAudio below already handles
  // the <audio> element this track is actually played through.
  const [agentAudioTrack, setAgentAudioTrack] = useState<MediaStreamTrack | null>(null);

  // Held in a ref so the connect effect below keeps its [grant] deps: the
  // parent re-creates this callback on every render, and depending on it
  // would tear down and rebuild the LiveKit Room mid-interview.
  const checkCompletedRef = useRef(onCheckCompleted);
  checkCompletedRef.current = onCheckCompleted;
  // Set when the candidate ends the interview themselves. The Disconnected
  // event that follows needs no round trip to the server: we already know
  // what happened, and the completion screen is already up.
  const endedByCandidateRef = useRef(false);

  const { agent: agentCaptions, candidate: candidateCaptions } = useLiveCaptions(
    activeRoom,
    CANDIDATE_IDENTITY,
  );
  const agentSpeaking = [...activeSpeakerIds].some((id) => id !== CANDIDATE_IDENTITY);
  const candidateSpeaking = activeSpeakerIds.has(CANDIDATE_IDENTITY);
  const elapsedLabel = useElapsedTime(connectedAt);
  // Real amplitude, tapped off the interviewer's audio track (never in
  // series with it — see useAudioAnalyser). `agentSpeaking` above, not this,
  // is what decides the orb's color and the status pill's label: this only
  // drives how much the shape moves.
  const agentAnalyser = useAudioAnalyser(agentAudioTrack);
  // The candidate's own microphone track, found the same way the agent's
  // track is found above — via LiveKit's own publication/mute lifecycle,
  // never by attaching anything new to the mic. Fed through the exact same
  // useAudioAnalyser hook as the interviewer's track: a read-only tap on
  // its own private AudioContext with nothing connected downstream, so it
  // cannot affect what the candidate's mic actually publishes. See
  // useLocalAudioTrack and useAudioAnalyser for the respective guarantees.
  const candidateMicTrack = useLocalAudioTrack(activeRoom);
  const candidateAnalyser = useAudioAnalyser(candidateMicTrack);
  // One chronological transcript built from the two per-speaker lists
  // useLiveCaptions produces, without touching that hook's own delta/replace
  // logic.
  const transcriptTurns = useTranscript(agentCaptions, candidateCaptions);

  // Owns the question list, which question is current (the agent's own
  // hiresort.question signal when one has arrived, a local fallback
  // otherwise), the per-question timer, and the Run/Submit buffers. Runs
  // regardless of call state: a candidate who reconnects mid-question must
  // find their code and their remaining time exactly as they left them, not
  // reset by the reconnect. `activeRoom` is threaded in so it can subscribe
  // to that signal the same way useLiveCaptions subscribes to captions.
  const coding = useCodingQuestions(token, activeRoom);
  // The split view replaces today's screen only once the agent's own
  // `hiresort.question` signal has named a coding question — never on the
  // local fallback index alone, and never for a question the candidate has
  // already submitted. See useCodingQuestions' `showPane` for the full
  // rule. A spoken question, no question data yet, or no signal at all
  // renders exactly what this screen has always rendered — there is
  // deliberately no "empty pane" for any of those cases.
  const showCodingPane = coding.showPane;
  // The pinned slot's spoken half — see useCodingQuestions' `pinned` for
  // the reveal rules. Null for the entire warm-up (nothing presented yet),
  // null again whenever a coding question is current instead (CodingPane
  // fills the slot in that case; the two never render together), and null
  // for the brief gap after a new spoken question is presented but before
  // its text has arrived.
  const pinnedSpoken = coding.pinned;

  // Three states, drawn as three different things (see TopBar/VoiceMeter/
  // ThinkingDots): the same animation for listening and speaking, and no
  // distinct state at all for the pause between them, are exactly the two
  // anti-patterns this redesign exists to fix. `transcriptTurns.length > 0`
  // is what tells "nobody has spoken yet" apart from "the interviewer just
  // finished listening and is about to respond" — see presenceState.ts.
  const presenceState = derivePresenceState(
    agentSpeaking,
    candidateSpeaking,
    transcriptTurns.length > 0,
  );

  function handleToggleCaptions() {
    setCaptionsEnabled((prev) => {
      const next = !prev;
      writeCaptionsPreference(next);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    setActiveRoom(room);

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
      // The candidate identity never publishes a track back to itself, so
      // any remote audio track here is the interviewer's — there is only
      // ever one to track for the orb's amplitude tap.
      if (track.kind === Track.Kind.Audio && !cancelled) {
        setAgentAudioTrack(track.mediaStreamTrack);
      }
    }

    function handleTrackUnsubscribed(
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) {
      detachRemoteAudio(track, publication.trackSid);
      if (track.kind === Track.Kind.Audio && !cancelled) {
        setAgentAudioTrack((prev) => (prev === track.mediaStreamTrack ? null : prev));
      }
    }

    function handleDisconnected() {
      if (cancelled) return;
      setCallState("disconnected");
      if (endedByCandidateRef.current) return;
      // The most-travelled ending of all: the agent finished, end_call
      // deleted the room, and the browser learns about it as a bare
      // Disconnected event that looks exactly like a dropped connection. A
      // page refresh lands here too (CLIENT_INITIATED is one of LiveKit's
      // default close reasons, so refreshing finalises the session). Asking
      // the server which it was is the only way to tell them apart, and
      // getting it wrong shows a finished candidate an error screen with a
      // Rejoin button that can only 409.
      setCheckingIfFinished(true);
      checkCompletedRef.current()
        .then((isCompleted) => {
          if (cancelled) return;
          if (isCompleted) setCompleted(true);
        })
        .catch(() => {
          // Could not ask. Fall through to today's behaviour: assume the
          // candidate genuinely dropped, because offering a Rejoin that
          // might 409 beats stranding someone whose interview is still live.
        })
        .finally(() => {
          if (!cancelled) setCheckingIfFinished(false);
        });
    }

    function handleReconnecting() {
      if (!cancelled) setCallState("reconnecting");
    }

    function handleReconnected() {
      if (!cancelled) setCallState("connected");
    }

    function handleActiveSpeakersChanged(speakers: Participant[]) {
      if (!cancelled) setActiveSpeakerIds(new Set(speakers.map((p) => p.identity)));
    }

    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);

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
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
      room.disconnect();
      audioElsRef.current.forEach((el) => el.remove());
      audioElsRef.current.clear();
      roomRef.current = null;
      setActiveRoom(null);
      setActiveSpeakerIds(new Set());
      setAgentAudioTrack(null);
    };
    // grant.token changes on every rejoin (a fresh grant is minted each
    // time), which is exactly when this effect must tear down the old Room
    // and connect a new one.
  }, [grant.url, grant.token]);

  // Starts the elapsed-time clock on the first successful connect. The
  // `connectedAt === null` guard makes this fire exactly once per mount, so
  // reconnects and rejoins do not restart the counter.
  useEffect(() => {
    if (callState === "connected" && connectedAt === null) {
      setConnectedAt(Date.now());
    }
  }, [callState, connectedAt]);

  // A candidate who closes the tab mid-interview loses it: close_on_disconnect
  // means the agent finalizes the session the moment the room drops. The
  // guard is armed only while a live call is actually up, and torn down the
  // instant it is not, so it never follows the candidate to another page.
  //
  // The `completed` check matters on its own, not just as a subset of
  // callState: room.disconnect() below is async, and its Disconnected event
  // (which flips callState) can lag behind the completion screen appearing.
  // Without this, a candidate who confirms "End interview" and immediately
  // tries to close the tab would still see a "leave site" prompt for an
  // interview that has, from their perspective, already been submitted.
  useEffect(() => {
    if (completed) return;
    if (callState !== "connected" && callState !== "reconnecting") return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [callState, completed]);

  function handleEndInterview() {
    setShowEndConfirm(true);
  }

  function handleCancelEnd() {
    setShowEndConfirm(false);
  }

  function handleConfirmEnd() {
    setShowEndConfirm(false);
    // The backend finalizes the session on disconnect (close_on_disconnect),
    // so this is the real, irreversible end of the interview for the
    // candidate — the completion screen below reflects that, not a "you can
    // rejoin" state.
    endedByCandidateRef.current = true;
    roomRef.current?.disconnect();
    setCompleted(true);
  }

  async function handleRejoin() {
    setRejoining(true);
    try {
      await onRejoin();
      // On success the parent hands down a new grant, which re-triggers the
      // connect effect above via its [grant.url, grant.token] deps.
    } catch (err) {
      // 409 means the session finished between the disconnect and this
      // click. That is a completed interview, not a failure the candidate
      // can do anything about, so it gets the completion screen rather than
      // an error with a button that will 409 again.
      if (err instanceof InterviewApiError && err.status === 409) {
        setCompleted(true);
        return;
      }
      // A 503 (LiveKit down, or a misconfigured deployment) is retryable but
      // has nothing to do with the candidate's connection, so it shows the
      // server's own plain-language reason above the same Retry control.
      setError({
        kind: "connection",
        message: err instanceof Error ? err.message : "Could not rejoin the interview.",
        fromServer: err instanceof InterviewRetryableError,
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

  if (completed) {
    return (
      <Centered>
        <p className="text-sm text-[#404040] max-w-sm text-center">
          Thank you. Your interview has been submitted and the hiring team will be in touch.
        </p>
      </Centered>
    );
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
            {error.fromServer
              ? error.message
              : "We could not connect you to the interview. Check your internet connection and try again."}
          </p>
          <RetryButton onClick={handleRejoin} label="Retry" loading={rejoining} />
        </div>
      </Centered>
    );
  }

  // Still asking the server whether the interview finished. Neither the
  // completion screen nor the left-the-interview screen is honest yet.
  if (callState === "disconnected" && checkingIfFinished) {
    return (
      <Centered>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#737373]" />
          <p className="text-sm text-[#737373]">Finishing up.</p>
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

  // The pinned slot is occupied by exactly one of: the coding pane (an
  // actually-presented, not-yet-dismissed coding question), the spoken
  // pinned question (one whose text has been revealed), or nothing at all
  // (before anything is presented — the warm-up, same as today: just the
  // conversation, no claim made about a question on screen).
  const hasPinnedSlot = showCodingPane || pinnedSpoken !== null;

  return (
    // h-screen + overflow-hidden (rather than the min-h-screen used by every
    // other state above) so the coding split view below can give its two
    // columns a real, bounded height to scroll independently within. The
    // pinned slot must stay on screen for the whole question — it must
    // never be something the page itself can scroll past.
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#F5F3EE" }}>
      {callState === "reconnecting" && (
        <div className="w-full bg-[#FDECD2] text-[#8A4B08] text-xs text-center py-2">
          Reconnecting…
        </div>
      )}
      <TopBar
        elapsedLabel={elapsedLabel}
        durationMinutes={durationMinutes}
        presenceState={presenceState}
        reconnecting={callState === "reconnecting"}
        interviewerAnalyser={agentAnalyser}
        interviewerSpeaking={agentSpeaking}
        candidateAnalyser={candidateAnalyser}
        candidateSpeaking={candidateSpeaking}
        questionIndex={coding.index}
        questionTotal={coding.total}
        onEndInterview={handleEndInterview}
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* The pinned slot: question in focus, for as long as it is the
            current one. Coding gets the larger share of the available
            height (it has a whole editor beside it); a spoken question is
            just its own text and needs only as much height as that takes. */}
        {showCodingPane && (
          <div className="flex-[3] min-h-0 overflow-hidden">
            <CodingPane coding={coding} />
          </div>
        )}
        {!showCodingPane && pinnedSpoken && <PinnedQuestion prompt={pinnedSpoken.prompt} />}

        {hasPinnedSlot && <div className="border-t border-[#E5E1D8]" />}

        {/* The conversation, always underneath. Never shrunk down to a
            "compact" strip next to a voice presence any more — the voice
            presence lives in TopBar now, so this is just the transcript,
            full height, whether or not anything is pinned above it. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5">
          <div className="w-full max-w-2xl mx-auto">
            <Transcript turns={transcriptTurns} enabled={captionsEnabled} onToggle={handleToggleCaptions} />
          </div>
        </div>
      </div>

      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-50">
          <div className="max-w-sm w-full rounded-xl border border-[#D4D4D4] bg-white p-5 text-center">
            <p className="text-sm text-[#0F0F0F] mb-5">
              End the interview now? You will not be able to rejoin once it is finished.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCancelEnd}
                className="h-9 px-4 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-lg hover:bg-[#F5F3EE] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEnd}
                className="h-9 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-lg hover:bg-[#1C1C1C] transition-colors"
              >
                End interview
              </button>
            </div>
          </div>
        </div>
      )}
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
