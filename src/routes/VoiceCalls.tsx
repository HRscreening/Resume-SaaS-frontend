import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getScreening, listVoiceCalls, triggerVoiceCalls } from "@/lib/api";
import type { CallListItem, CallStatus } from "@/types";
import { truncate } from "@/lib/utils";
import { CallScorecardDrawer } from "@/components/screening/voice/CallScorecardDrawer";

const ACTIVE_STATUSES: CallStatus[] = [
  "QUEUED", "DIALING", "IN_PROGRESS", "QUEUED_FOR_SCORING", "SCORING",
];

const statusStyle: Record<string, string> = {
  QUEUED: "bg-slate-100 text-slate-700",
  DIALING: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-teal-100 text-teal-700",
  QUEUED_FOR_SCORING: "bg-violet-100 text-violet-700",
  SCORING: "bg-violet-100 text-violet-700",
  SCORED: "bg-green-100 text-green-700",
  NO_ANSWER: "bg-amber-100 text-amber-700",
  BUSY: "bg-amber-100 text-amber-700",
  VOICEMAIL: "bg-amber-100 text-amber-700",
  DROPPED: "bg-amber-100 text-amber-700",
  FAILED: "bg-red-100 text-red-700",
  ERROR: "bg-red-100 text-red-700",
};

function scoreColor(n: number | null): string {
  if (n == null) return "text-[#A3A3A3]";
  if (n >= 75) return "text-green-700";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function VoiceCalls() {
  const { id } = useParams({ strict: false }) as { id: string };
  const queryClient = useQueryClient();
  const [openCallId, setOpenCallId] = useState<string | null>(null);

  const { data: screening } = useQuery({
    queryKey: ["screening", id],
    queryFn: () => getScreening(id),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["voice-calls", id],
    queryFn: () => listVoiceCalls(id),
    // Poll while any call is still moving through the pipeline.
    refetchInterval: (q) => {
      const calls = q.state.data?.calls ?? [];
      return calls.some((c) => ACTIVE_STATUSES.includes(c.status)) ? 3000 : false;
    },
  });
  const calls: CallListItem[] = data?.calls ?? [];

  const triggerMut = useMutation({
    mutationFn: () => triggerVoiceCalls(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["voice-calls", id] });
      const parts = [`${res.created.length} call(s) queued`];
      if (res.skipped.length) parts.push(`${res.skipped.length} skipped`);
      toast.success(parts.join(" · "));
      if (res.skipped.length) {
        const reasons = res.skipped.map((s) => `${s.candidate_name ?? s.resume_id.slice(0, 8)}: ${s.reason}`);
        toast.message("Skipped candidates", { description: reasons.slice(0, 6).join("\n") });
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not start calls"),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-2 text-xs">
        <Link to="/screenings" className="text-[#737373] hover:text-[#0F0F0F]">Screenings</Link>
        <span className="text-[#D4D4D4]">/</span>
        <Link to="/screenings/$id" params={{ id }} className="text-[#737373] hover:text-[#0F0F0F]">
          {truncate(screening?.title ?? "", 32)}
        </Link>
        <span className="text-[#D4D4D4]">/</span>
        <span className="text-[#404040]">Calls</span>
      </div>

      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F0F0F] mb-1">Screening calls</h1>
          <p className="text-sm text-[#737373]">
            AI voice interviews for shortlisted candidates. Scored on the same rubric as resumes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/screenings/$id/voice"
            params={{ id }}
            className="h-9 px-4 flex items-center border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-xl hover:bg-white"
          >
            Configure
          </Link>
          <button
            onClick={() => triggerMut.mutate()}
            disabled={triggerMut.isPending}
            className="h-9 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] disabled:opacity-60"
          >
            {triggerMut.isPending ? "Starting…" : "Start screening calls"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-[#737373]">Loading…</p>
      ) : calls.length === 0 ? (
        <div className="border border-dashed border-[#E8E5DF] rounded-xl p-10 text-center">
          <p className="text-sm text-[#737373]">
            No calls yet. Click “Start screening calls” to trigger interviews for shortlisted candidates.
          </p>
        </div>
      ) : (
        <div className="border border-[#E8E5DF] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#FAFAF8] text-xs text-[#737373]">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Candidate</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5">Voice</th>
                <th className="text-right font-medium px-4 py-2.5">Resume</th>
                <th className="text-left font-medium px-4 py-2.5">Recommendation</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-t border-[#F0EEE9]">
                  <td className="px-4 py-3">
                    <div className="text-[#0F0F0F]">{c.candidate_name ?? "—"}</div>
                    <div className="text-xs text-[#A3A3A3]">{c.phone_e164}{c.attempt_no > 1 ? ` · attempt ${c.attempt_no}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${statusStyle[c.status] ?? "bg-slate-100 text-slate-700"}`}>
                      {c.status}{c.is_partial ? " · partial" : ""}
                    </span>
                    {c.error_message && <div className="text-xs text-red-600 mt-1">{truncate(c.error_message, 60)}</div>}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${scoreColor(c.voice_score)}`}>
                    {c.voice_score != null ? c.voice_score.toFixed(1) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right ${scoreColor(c.resume_score)}`}>
                    {c.resume_score != null ? c.resume_score.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#404040]">{c.recommendation ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {c.status === "SCORED" && (
                      <button
                        onClick={() => setOpenCallId(c.id)}
                        className="text-xs font-medium text-[#0F0F0F] underline"
                      >
                        Review
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openCallId && (
        <CallScorecardDrawer screeningId={id} callId={openCallId} onClose={() => setOpenCallId(null)} />
      )}
    </div>
  );
}
