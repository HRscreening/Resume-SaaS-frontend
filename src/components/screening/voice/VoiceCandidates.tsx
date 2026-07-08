import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCallCandidates, triggerVoiceCalls } from "@/lib/api";
import type { CandidateCallReason } from "@/types";

const REASON: Record<CandidateCallReason, { label: string; style: string }> = {
  callable: { label: "Callable", style: "bg-green-100 text-green-700" },
  recall: { label: "Called before", style: "bg-sky-100 text-sky-700" },
  in_progress: { label: "Call in progress", style: "bg-indigo-100 text-indigo-700" },
  no_phone: { label: "No phone number", style: "bg-amber-100 text-amber-700" },
};

// Keep refreshing while a call is live so a row flips back to callable/recall
// once the interview finishes.
function hasLiveCall(reasons: CandidateCallReason[]): boolean {
  return reasons.includes("in_progress");
}

interface VoiceCandidatesProps {
  screeningId: string;
}

export function VoiceCandidates({ screeningId }: VoiceCandidatesProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["voice-candidates", screeningId],
    queryFn: () => listCallCandidates(screeningId),
    refetchInterval: (q) =>
      hasLiveCall((q.state.data?.candidates ?? []).map((c) => c.reason)) ? 3000 : false,
  });

  const callMut = useMutation({
    mutationFn: (resumeId: string) => triggerVoiceCalls(screeningId, [resumeId]),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
      queryClient.invalidateQueries({ queryKey: ["voice-candidates", screeningId] });
      if (res.created.length) {
        toast.success(`Calling ${res.created[0].candidate_name ?? "candidate"}`);
      } else {
        toast.error(`Could not start call: ${res.skipped[0]?.reason ?? "unknown"}`);
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not start call"),
  });

  if (isLoading) return <p className="text-sm text-[#737373]">Loading candidates…</p>;

  const candidates = data?.candidates ?? [];
  const callableCount = candidates.filter((c) => c.eligible).length;

  if (candidates.length === 0) {
    return (
      <div className="border border-dashed border-[#E8E5DF] rounded-xl p-8 text-center">
        <p className="text-sm text-[#737373]">
          No shortlisted candidates yet. Move candidates to the Shortlisted stage to make them
          callable.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-[#737373]">
          {callableCount} of {candidates.length} shortlisted candidate{candidates.length === 1 ? "" : "s"} callable
        </p>
        {data && !data.voice_ready && (
          <p className="text-xs text-amber-700">Enable the voice round + save a question plan to place calls.</p>
        )}
      </div>
      <div className="border border-[#E8E5DF] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FAFAF8] text-xs text-[#737373]">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Candidate</th>
              <th className="text-left font-medium px-4 py-2.5">Eligibility</th>
              <th className="text-right font-medium px-4 py-2.5">Voice</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => {
              const reason = REASON[c.reason];
              const calling = callMut.isPending && callMut.variables === c.resume_id;
              return (
                <tr key={c.resume_id} className="border-t border-[#F0EEE9]">
                  <td className="px-4 py-3">
                    <div className="text-[#0F0F0F]">{c.candidate_name ?? "—"}</div>
                    <div className="text-xs text-[#A3A3A3]">
                      {c.phone_e164 ?? c.candidate_phone ?? "no number on file"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${reason.style}`}>
                      {reason.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[#404040]">
                    {c.voice_score != null ? c.voice_score.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.eligible ? (
                      <button
                        onClick={() => callMut.mutate(c.resume_id)}
                        disabled={!data?.voice_ready || calling}
                        className="h-8 px-3 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626] disabled:opacity-50"
                      >
                        {calling ? "Starting…" : c.reason === "recall" ? "Call again" : "Call"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#A3A3A3]">
                        {c.reason === "in_progress" ? "In progress" : "Not callable"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
