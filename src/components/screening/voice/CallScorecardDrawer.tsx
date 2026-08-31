import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getCallArtifacts, getCallScorecard, getScreening, overrideCallScorecard,
} from "@/lib/api";
import { updateCandidateStage } from "@/modules/screening/apis/stages";

import type { CallScorecardDetail } from "@/types";
import { VoiceScorecardDetails } from "./VoiceScorecardDetails";

interface Props {
  screeningId: string;
  callId: string;
  onClose: () => void;
}

const recColor: Record<string, string> = {
  advance: "text-green-700 bg-green-50 border-green-200",
  hold: "text-amber-700 bg-amber-50 border-amber-200",
  reject: "text-red-700 bg-red-50 border-red-200",
};

function scoreColor(n: number | null): string {
  if (n == null) return "text-[#737373]";
  if (n >= 75) return "text-green-700";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

export function CallScorecardDrawer({ screeningId, callId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["call-scorecard", screeningId, callId],
    queryFn: () => getCallScorecard(screeningId, callId),
  });

  const [rec, setRec] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const overrideMut = useMutation({
    mutationFn: () =>
      overrideCallScorecard(screeningId, callId, {
        recommendation: (rec || undefined) as "advance" | "hold" | "reject" | undefined,
        notes: notes || undefined,
      }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(["call-scorecard", screeningId, callId], fresh);
      queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
      toast.success("Override saved");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save override"),
  });

  // Signed download URLs (recording/transcript). Refetch while the recording
  // is still being processed by egress so the download appears when ready.
  const { data: artifacts } = useQuery({
    queryKey: ["call-artifacts", screeningId, callId],
    queryFn: () => getCallArtifacts(screeningId, callId),
    refetchInterval: (q) =>
      q.state.data?.recording_status === "processing" ? 5000 : false,
  });

  const stageMut = useMutation({
    mutationFn: ({ scoreId, stage }: { scoreId: string; stage: string }) =>
      updateCandidateStage(scoreId, stage),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["call-scorecard", screeningId, callId] });
      queryClient.invalidateQueries({ queryKey: ["results", screeningId] });
      toast.success(`Moved to ${vars.stage}`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not update stage"),
  });

  const sc: CallScorecardDetail | undefined = data;

  // Next kanban stage after the candidate's current one (per-screening order).
  const { data: screening } = useQuery({
    queryKey: ["screening", screeningId],
    queryFn: () => getScreening(screeningId),
  });
  const orderedStages = Object.entries(screening?.stages ?? {})
    .sort(([, a], [, b]) => a.index - b.index)
    .map(([name]) => name);
  const currentIdx = sc?.stage ? orderedStages.indexOf(sc.stage) : -1;
  const nextStage = currentIdx >= 0 && currentIdx < orderedStages.length - 1
    ? orderedStages[currentIdx + 1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[#E8E5DF] px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Call Scorecard</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#737373] hover:text-[#0F0F0F] text-lg">✕</button>
        </div>

        {isLoading || !sc ? (
          <div className="p-6 text-sm text-[#737373]">Loading…</div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm text-[#737373]">{sc.candidate_name ?? "Candidate"}</p>
              <p className="text-xs text-[#A3A3A3]">Status: {sc.status}{sc.is_partial ? " · partial" : ""}</p>
            </div>

            {/* Side-by-side scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-[#E8E5DF] rounded-xl p-4">
                <p className="text-xs text-[#737373] mb-1">Voice score</p>
                <p className={`text-2xl font-bold ${scoreColor(sc.overall_score)}`}>
                  {sc.overall_score != null ? sc.overall_score?.toFixed(1) : "—"}
                </p>
                {sc.recommendation && (
                  <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full border ${recColor[sc.recommendation] ?? ""}`}>
                    {sc.recommendation}
                  </span>
                )}
              </div>
              <div className="border border-[#E8E5DF] rounded-xl p-4">
                <p className="text-xs text-[#737373] mb-1">Resume score</p>
                <p className={`text-2xl font-bold ${scoreColor(sc.resume_score)}`}>
                  {sc.resume_score != null ? sc.resume_score?.toFixed(1) : "—"}
                </p>
                <p className="mt-2 text-xs text-[#A3A3A3]">Same 0–100 scale</p>
              </div>
            </div>

            {/* Decision: advance / reject via the existing kanban stage */}
            {sc.score_id && (
              <div className="flex items-center gap-2">
                {nextStage && (
                  <button
                    onClick={() => stageMut.mutate({ scoreId: sc.score_id!, stage: nextStage })}
                    disabled={stageMut.isPending}
                    className="h-9 px-4 bg-green-700 text-white text-xs font-medium rounded-xl hover:bg-green-800 disabled:opacity-60"
                  >
                    Advance to {nextStage}
                  </button>
                )}
                
                {sc.stage && <span className="text-xs text-[#737373]">Current stage: {sc.stage}</span>}
              </div>
            )}

            {/* Artifact downloads */}
            <div className="border border-[#E8E5DF] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#0F0F0F] mb-2">Downloads</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {artifacts?.recording_download_url ? (
                  <a href={artifacts.recording_download_url} download
                     className="text-[#0F0F0F] underline font-medium">
                    Download recording
                  </a>
                ) : (
                  <span className="text-[#A3A3A3]">
                    {artifacts?.recording_status === "processing"
                      ? "Recording processing…"
                      : "No recording available"}
                  </span>
                )}
                {artifacts?.transcript_download_url ? (
                  <a href={artifacts.transcript_download_url} download
                     className="text-[#0F0F0F] underline font-medium">
                    Download transcript
                  </a>
                ) : (
                  <span className="text-[#A3A3A3]">Transcript file unavailable</span>
                )}
              </div>
            </div>

            {/* AI findings + explainability: interview summary, "Why this score"
                (per-category contribution + drivers), strengths / concerns, flags,
                the per-criterion breakdown with evidence quotes, and the transcript.
                Shared with the candidate panel so both surfaces explain the score
                identically. Degrades gracefully on older scorecards (no drivers). */}
            <VoiceScorecardDetails screeningId={screeningId} callId={callId} />

            {/* Override */}
            <div className="border-t border-[#E8E5DF] pt-4">
              <h3 className="text-sm font-semibold text-[#0F0F0F] mb-2">Reviewer override</h3>
              {sc.reviewer_override && (
                <p className="text-xs text-[#737373] mb-2">
                  Current: {JSON.stringify(sc.reviewer_override)}
                </p>
              )}
              <label className="block text-xs font-medium text-[#404040] mb-1">Recommendation</label>
              <select
                value={rec}
                onChange={(e) => setRec(e.target.value)}
                className="w-full h-9 px-3 border border-[#D4D4D4] rounded-lg text-sm mb-2"
              >
                <option value="">(no change)</option>
                <option value="advance">advance</option>
                <option value="hold">hold</option>
                <option value="reject">reject</option>
              </select>
              <label className="block text-xs font-medium text-[#404040] mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#D4D4D4] rounded-lg text-sm mb-2 resize-y"
                placeholder="Why are you overriding?"
              />
              <button
                onClick={() => overrideMut.mutate()}
                disabled={overrideMut.isPending || (!rec && !notes)}
                className="h-9 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] disabled:opacity-60"
              >
                {overrideMut.isPending ? "Saving…" : "Save override"}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
