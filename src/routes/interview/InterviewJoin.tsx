import { useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Loader2, Mic, ScreenShare } from "lucide-react";

import {
  getInterviewBrief,
  joinInterview,
  InterviewRetryableError,
  type InterviewBrief,
  type InterviewJoinGrant,
} from "@/lib/interviewApi";
import InterviewRoom from "@/routes/interview/InterviewRoom";
import {
  DeviceCheckPanel,
  deviceCheckPassed,
  useDeviceCheck,
} from "@/routes/interview/DeviceCheck";

// Describes only what the browser round actually does. Audio recording is
// deliberately gated off for browser sessions (nothing writes
// audio_recording_url), so claiming it here was false in the one piece of
// copy whose accuracy is the entire point.
const RECORDING_DISCLOSURE =
  "This interview is conducted by an AI interviewer. A written transcript of the conversation is made, so the hiring team can review your answers. Your audio is not recorded. Live captions of both voices appear on screen while you talk. Nothing is shared outside the hiring team for this role.";

// Candidate holds an HMAC-signed invite link with no HireSort account behind
// it. This route sits directly off rootRoute (see App.tsx) with no AuthGuard
// and no AppLayout: it must render for a logged-out visitor exactly as it
// would for one who happens to be signed in on the same browser.
export default function InterviewJoin() {
  const { token } = useParams({ strict: false }) as { token: string };

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["interview", token],
    queryFn: () => getInterviewBrief(token),
    retry: false,
  });

  const [grant, setGrant] = useState<InterviewJoinGrant | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Returns the grant (or throws) so InterviewRoom's Rejoin button can react
  // to a failed rejoin, not just the initial Join click below, which reads
  // joinError off state instead of awaiting this promise.
  async function handleJoin(): Promise<InterviewJoinGrant> {
    setJoining(true);
    setJoinError(null);
    try {
      const nextGrant = await joinInterview(token);
      setGrant(nextGrant);
      return nextGrant;
    } catch (err) {
      // joinInterview only ever throws InterviewApiError (the server's own
      // detail: "already completed", "not valid") or an
      // InterviewRetryableError ("could not reach the server", "could not
      // start your interview just now"). All of them carry a candidate-safe
      // .message, never a raw fetch/browser exception string.
      const message =
        err instanceof Error ? err.message : "Could not join the interview. Please try again.";
      setJoinError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setJoining(false);
    }
  }

  // Re-describes the session so InterviewRoom can tell the two kinds of
  // disconnect apart. The usual ending of an interview is the AGENT calling
  // end_call, which deletes the room and reaches the browser as a plain
  // Disconnected event, indistinguishable from the candidate's wifi dying.
  // The brief is the existing, already-deployed way to ask which it was.
  async function checkCompleted(): Promise<boolean> {
    const brief = await getInterviewBrief(token);
    return brief.already_completed;
  }

  // Once the server has minted a grant, InterviewRoom owns the LiveKit Room
  // instance for the rest of the call. Rejoin (after a disconnect) just
  // calls handleJoin again: joining is idempotent server-side, so a fresh
  // grant resumes the same session rather than starting over.
  //
  // `data` is guaranteed populated by the time `grant` exists: joining is
  // only reachable from PreJoinScreen below, which itself requires `data`.
  // The `&& data` guard exists for type narrowing, not because that case is
  // expected to occur.
  if (grant && data) {
    return (
      <InterviewRoom
        grant={grant}
        token={token}
        durationMinutes={data.duration_minutes}
        onRejoin={handleJoin}
        onCheckCompleted={checkCompleted}
      />
    );
  }

  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-[#737373]" />
      </Centered>
    );
  }

  if (isError) {
    // A transport failure (offline, DNS, dropped connection) never reached
    // the server, and a 503 reached it but found the infrastructure down.
    // Neither says anything about whether the link is valid, so blaming the
    // link here would be both false and a dead end.
    if (error instanceof InterviewRetryableError) {
      return (
        <Centered>
          <div className="max-w-sm text-center">
            <p className="text-sm text-[#404040] mb-4">{error.message}</p>
            <TryAgainButton onClick={() => refetch()} loading={isFetching} />
          </div>
        </Centered>
      );
    }
    // A real 404: the link itself does not resolve. No retry helps.
    return (
      <Centered>
        <p className="text-sm text-[#404040] max-w-sm text-center">
          This interview link is not valid. Ask your recruiter for a new one.
        </p>
      </Centered>
    );
  }

  if (!data) {
    return null;
  }

  if (data.already_completed) {
    return (
      <Centered>
        <p className="text-sm text-[#404040] max-w-sm text-center">
          You have already completed this interview.
        </p>
      </Centered>
    );
  }

  return (
    <PreJoinScreen
      brief={data}
      joining={joining}
      joinError={joinError}
      // handleJoin rethrows on failure (so InterviewRoom's Rejoin can react
      // to it); the failure is already surfaced here via joinError state,
      // so swallow the rejection at this call site rather than let it go
      // unhandled.
      onJoin={() => {
        handleJoin().catch(() => {});
      }}
    />
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

function TryAgainButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="h-10 px-5 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Try again
    </button>
  );
}

function PreJoinScreen({
  brief,
  joining,
  joinError,
  onJoin,
}: {
  brief: NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof getInterviewBrief>>>>["data"]>;
  joining: boolean;
  joinError: string | null;
  onJoin: () => void;
}) {
  // Camera is checked only when the hiring manager required it for this
  // round: asking for a camera the round does not use is an intrusion, and
  // a candidate who declines it would be blocked from an interview that
  // never needed it.
  const requiresCamera = brief.requires_camera === true;
  const devices = useDeviceCheck(requiresCamera);
  const ready = deviceCheckPassed(devices, requiresCamera);

  const greeting = brief.candidate_name ? `Hi ${brief.candidate_name},` : "Hi,";
  const roleLine =
    brief.role_title && brief.hiring_company
      ? `${brief.role_title} at ${brief.hiring_company}`
      : brief.role_title ?? brief.hiring_company ?? null;

  return (
    <Centered>
      <div className="max-w-md w-full">
        <p className="text-xs font-semibold text-[#C85A17] uppercase tracking-wide mb-3">
          AI interview
        </p>
        <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">{greeting}</h1>
        {roleLine && <p className="text-base text-[#0F0F0F] mb-1">{roleLine}</p>}
        <p className="text-sm text-[#737373] mb-6">
          Expected duration: about {brief.duration_minutes} minutes.
        </p>

        <div className="mb-6">
          <DeviceCheckPanel state={devices} requiresCamera={requiresCamera} />
        </div>

        {joinError && (
          <p className="text-sm text-red-600 mb-3">{joinError}</p>
        )}

        <button
          onClick={onJoin}
          disabled={!ready || joining}
          className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {joining && <Loader2 className="h-4 w-4 animate-spin" />}
          Join interview
        </button>
        {!ready && !devices.micError && !devices.cameraError && (
          <p className="mt-2 text-center text-xs text-[#737373]">
            Finish the checks above to start. There is no second attempt, so it is
            worth knowing your setup works first.
          </p>
        )}
      </div>
    </Centered>
  );
}

// What the hiring manager set when authoring this round (requires_camera /
// requires_screen_share on the brief), surfaced here so a candidate knows
// what to expect before they start, not as a warning: same plain card
// styling as the recording disclosure above it, no amber/red treatment.
// Deliberately does not check whether a camera or screen share actually
// gets turned on; that detection is out of scope for this screen.
function SessionRequirements({ brief }: { brief: Pick<InterviewBrief, "requires_camera" | "requires_screen_share"> }) {
  if (!brief.requires_camera && !brief.requires_screen_share) return null;

  return (
    <div className="rounded-xl border border-[#D4D4D4] bg-white p-4 mb-6">
      <p className="text-sm font-medium text-[#0F0F0F] mb-2">What to have ready</p>
      <ul className="flex flex-col gap-1.5">
        {brief.requires_camera && (
          <li className="flex items-center gap-2 text-sm text-[#404040]">
            <Camera className="h-4 w-4 text-[#737373] shrink-0" />
            This interview asks you to turn your camera on.
          </li>
        )}
        {brief.requires_screen_share && (
          <li className="flex items-center gap-2 text-sm text-[#404040]">
            <ScreenShare className="h-4 w-4 text-[#737373] shrink-0" />
            This interview asks you to share your screen.
          </li>
        )}
      </ul>
    </div>
  );
}

