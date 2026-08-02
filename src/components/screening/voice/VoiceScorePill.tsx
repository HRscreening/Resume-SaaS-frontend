import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { listVoiceCalls } from "@/lib/api";
import type { CallListItem } from "@/types";

interface VoiceScorePillProps {
  screeningId: string;
  resumeId: string;
}

function pillStyle(score: number): string {
  if (score >= 75) return "bg-green-50 border-green-200 text-green-700";
  if (score >= 55) return "bg-yellow-50 border-yellow-200 text-yellow-700";
  return "bg-red-50 border-red-200 text-red-700";
}

/**
 * Compact voice-interview result beside the resume score in the candidate
 * view (PRD: "Call Scorecard beside the resume Score"). Shows the latest
 * scored call for this candidate; renders nothing when no call exists.
 * Links to the screening's calls page for the full scorecard.
 */
export function VoiceScorePill({ screeningId, resumeId }: VoiceScorePillProps) {
  const { data } = useQuery({
    queryKey: ["voice-calls", screeningId],
    queryFn: () => listVoiceCalls(screeningId),
    staleTime: 30_000,
  });

  const call: CallListItem | undefined = data?.calls.find(
    (c) => c.resume_id === resumeId && c.voice_score != null,
  );
  if (!call || call.voice_score == null) return null;

  return (
    <Link
      to="/screenings/$id/voice/calls"
      params={{ id: screeningId }}
      title={`Voice interview: ${call.voice_score.toFixed(1)} · ${call.recommendation ?? ""}. Click to review.`}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold shrink-0 hover:opacity-80 transition-opacity ${pillStyle(call.voice_score)}`}
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1.5a2 2 0 0 1 2 2v3a2 2 0 1 1-4 0v-3a2 2 0 0 1 2-2z" />
        <path d="M3 6.5a4 4 0 0 0 8 0M7 10.5v2" />
      </svg>
      {Math.round(call.voice_score)} · Voice{call.is_partial ? " (partial)" : ""}
    </Link>
  );
}
