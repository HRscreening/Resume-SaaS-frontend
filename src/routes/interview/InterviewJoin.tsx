import { useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Mic } from "lucide-react";

import { getInterviewBrief, joinInterview, type InterviewJoinGrant } from "@/lib/interviewApi";

const RECORDING_DISCLOSURE =
  "This interview is conducted by an AI interviewer. Your audio is recorded and a written transcript is made, so the hiring team can review your answers. Live captions of both voices appear on screen while you talk. Nothing is shared outside the hiring team for this role.";

// Candidate holds an HMAC-signed invite link with no HireSort account behind
// it. This route sits directly off rootRoute (see App.tsx) with no AuthGuard
// and no AppLayout: it must render for a logged-out visitor exactly as it
// would for one who happens to be signed in on the same browser.
export default function InterviewJoin() {
  const { token } = useParams({ strict: false }) as { token: string };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["interview", token],
    queryFn: () => getInterviewBrief(token),
    retry: false,
  });

  const [grant, setGrant] = useState<InterviewJoinGrant | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  async function handleJoin() {
    setJoining(true);
    setJoinError(null);
    try {
      const nextGrant = await joinInterview(token);
      setGrant(nextGrant);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Could not join the interview. Please try again.",
      );
    } finally {
      setJoining(false);
    }
  }

  // InterviewRoom (the live call) lands in a later change; for now a
  // successful join just confirms the grant was minted.
  if (grant) {
    return (
      <Centered>
        <Loader2 className="h-6 w-6 animate-spin text-[#737373]" />
      </Centered>
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
      onJoin={handleJoin}
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
  const { micReady, micError, levelPercent, retryMic } = useMicCheck();

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

        <div className="rounded-xl border border-[#D4D4D4] bg-white p-4 mb-6">
          <p className="text-sm text-[#404040] leading-relaxed">{RECORDING_DISCLOSURE}</p>
        </div>

        <div className="rounded-xl border border-[#D4D4D4] bg-white p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-4 w-4 text-[#404040]" />
            <p className="text-sm font-medium text-[#0F0F0F]">Microphone check</p>
          </div>
          {micError ? (
            <div className="text-sm text-[#404040]">
              <p className="mb-2">
                We could not access your microphone. Check your browser's permission prompt or
                site settings, allow microphone access, then try again.
              </p>
              <button
                onClick={retryMic}
                className="h-8 px-3 border border-[#D4D4D4] text-sm font-medium text-[#404040] rounded-lg hover:bg-[#F5F3EE] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#737373] mb-2">
                {micReady ? "Say something so we can hear you." : "Requesting microphone access…"}
              </p>
              <div className="h-2 w-full rounded-full bg-[#F0EEE6] overflow-hidden">
                <div
                  className="h-full bg-[#C85A17] transition-[width] duration-75"
                  style={{ width: `${levelPercent}%` }}
                />
              </div>
            </>
          )}
        </div>

        {joinError && (
          <p className="text-sm text-red-600 mb-3">{joinError}</p>
        )}

        <button
          onClick={onJoin}
          disabled={!micReady || joining}
          className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          {joining && <Loader2 className="h-4 w-4 animate-spin" />}
          Join interview
        </button>
      </div>
    </Centered>
  );
}

// Level threshold above which we consider the mic "confirmed working" —
// picked to catch ordinary speech and typing-adjacent room noise while
// ignoring near-silence from a muted or broken input device.
const MIC_LEVEL_THRESHOLD = 4;

function useMicCheck() {
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [levelPercent, setLevelPercent] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    confirmedRef.current = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
          const pct = Math.min(100, Math.round((avg / 128) * 100));
          setLevelPercent(pct);
          if (pct > MIC_LEVEL_THRESHOLD && !confirmedRef.current) {
            confirmedRef.current = true;
            setMicReady(true);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (!cancelled) {
          setMicError(
            err instanceof Error ? err.message : "Microphone access was denied.",
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [attempt]);

  function retryMic() {
    setMicError(null);
    setMicReady(false);
    setLevelPercent(0);
    setAttempt((n) => n + 1);
  }

  return { micReady, micError, levelPercent, retryMic };
}
