import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getVoiceConfig, listCallCandidates, listVoiceCalls } from "@/lib/api";
import type { CallListItem, CallDisplayStatus } from "@/types";

interface CandidateVoiceCellProps {
  resumeId: string;
}

const ACTIVE: CallDisplayStatus[] = ["queued", "calling", "in_interview", "processing"];

function isScheduledPending(c: CallListItem): boolean {
  return c.display_status === "queued" && c.scheduled_at != null && new Date(c.scheduled_at).getTime() > Date.now();
}

function scorePill(n: number): string {
  if (n >= 75) return "bg-green-50 border-green-200 text-green-700";
  if (n >= 55) return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-red-50 border-red-200 text-red-700";
}

const Mic = () => (
  <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1.5a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0v-3a2 2 0 0 1 2-2z" />
    <path d="M3 6.5a4 4 0 0 0 8 0M7 10.5v2" />
  </svg>
);

/**
 * Tiny voice-status badge shown under a candidate's name in the results table,
 * so the voice round is visible per row at a glance. Renders nothing unless the
 * round is set up AND this candidate is callable or has a call. It's a passive
 * indicator — clicking the row opens the detail drawer where the actual
 * call / schedule / transcript controls live (avoids accidental one-click
 * real phone calls from a dense table). Reuses the same cached queries as the
 * drawer panel, so it adds no extra network cost.
 */
export function CandidateVoiceCell({ resumeId }: CandidateVoiceCellProps) {
  const { id: screeningId } = useParams({ strict: false }) as { id?: string };
  const { data: config } = useQuery({
    queryKey: ["voice-config", screeningId],
    queryFn: () => getVoiceConfig(screeningId as string),
    staleTime: 60_000,
    enabled: !!screeningId,
  });
  const voiceReady = Boolean(config?.voice_config?.enabled && (config.voice_config.question_plan?.length ?? 0) > 0);

  const { data: candidatesResp } = useQuery({
    queryKey: ["voice-candidates", screeningId],
    queryFn: () => listCallCandidates(screeningId as string),
    staleTime: 15_000,
    enabled: voiceReady && !!screeningId,
  });
  const { data: callsResp } = useQuery({
    queryKey: ["voice-calls", screeningId],
    queryFn: () => listVoiceCalls(screeningId as string),
    staleTime: 15_000,
    enabled: voiceReady && !!screeningId,
  });

  if (!screeningId || !voiceReady) return null;

  const call = callsResp?.calls.find((c) => c.resume_id === resumeId);
  const candidate = candidatesResp?.candidates.find((c) => c.resume_id === resumeId);

  const base = "inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold";

  if (call) {
    if (isScheduledPending(call)) {
      return <span className={`${base} bg-purple-50 border-purple-200 text-purple-700`}><Mic /> Scheduled</span>;
    }
    if (ACTIVE.includes(call.display_status)) {
      return <span className={`${base} bg-blue-50 border-blue-200 text-blue-700`}><Mic /> Calling…</span>;
    }
    if (call.display_status === "ready" && call.voice_score != null) {
      return <span className={`${base} ${scorePill(call.voice_score)}`}><Mic /> {Math.round(call.voice_score)}{call.is_partial ? " (partial)" : ""}</span>;
    }
    if (call.display_status === "unreachable") {
      return <span className={`${base} bg-amber-50 border-amber-200 text-amber-700`}><Mic /> Unreachable</span>;
    }
  }

  // Callable but never called → surface that a voice interview is available.
  if (candidate?.eligible) {
    return <span className={`${base} bg-[#F0EDE8] border-[#E8E5DF] text-[#737373]`}><Mic /> Voice ready</span>;
  }

  return null;
}
