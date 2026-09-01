import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCallCandidates, triggerVoiceCalls } from "@/lib/api";
import type { CandidateCallReason } from "@/types";
import { defaultScheduleValue } from "@/lib/scheduleTime";
import { useIsViewer } from "@/lib/useIsViewer";

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

/** `datetime-local` value (local wall-clock, no tz) → ISO 8601 with offset. */
function localToIso(local: string): string {
  return new Date(local).toISOString();
}

interface VoiceCandidatesProps {
  screeningId: string;
}

export function VoiceCandidates({ screeningId }: VoiceCandidatesProps) {
  const isViewer = useIsViewer();
  const queryClient = useQueryClient();
  // resume_id whose inline schedule picker is open, and its chosen local time.
  const [schedulingFor, setSchedulingFor] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["voice-candidates", screeningId],
    queryFn: () => listCallCandidates(screeningId),
    refetchInterval: (q) =>
      hasLiveCall((q.state.data?.candidates ?? []).map((c) => c.reason)) ? 3000 : false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
    queryClient.invalidateQueries({ queryKey: ["voice-candidates", screeningId] });
  };

  const callMut = useMutation({
    mutationFn: (resumeId: string) => triggerVoiceCalls(screeningId, [resumeId]),
    onSuccess: (res) => {
      invalidate();
      if (res.created.length) {
        toast.success(`Calling ${res.created[0].candidate_name ?? "candidate"}`);
      } else {
        toast.error(`Could not start call: ${res.skipped[0]?.reason ?? "unknown"}`);
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not start call"),
  });

  const scheduleMut = useMutation({
    mutationFn: (vars: { resumeId: string; iso: string }) =>
      triggerVoiceCalls(screeningId, [vars.resumeId], vars.iso),
    onSuccess: (res, vars) => {
      invalidate();
      setSchedulingFor(null);
      if (res.created.length) {
        const when = new Date(vars.iso).toLocaleString();
        toast.success(`Scheduled ${res.created[0].candidate_name ?? "candidate"} for ${when}`);
      } else {
        toast.error(`Could not schedule: ${res.skipped[0]?.reason ?? "unknown"}`);
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not schedule call"),
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

  const openScheduler = (resumeId: string) => {
    setScheduleAt(defaultScheduleValue());
    setSchedulingFor(resumeId);
  };

  const confirmSchedule = (resumeId: string) => {
    if (!scheduleAt) return;
    if (new Date(scheduleAt).getTime() <= Date.now()) {
      toast.error("Pick a time in the future");
      return;
    }
    scheduleMut.mutate({ resumeId, iso: localToIso(scheduleAt) });
  };

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
              const scheduling =
                scheduleMut.isPending && scheduleMut.variables?.resumeId === c.resume_id;
              const busy = !data?.voice_ready || calling || scheduling;
              const isOpen = schedulingFor === c.resume_id;
              return (
                <tr key={c.resume_id} className="border-t border-[#F0EEE9] align-top">
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
                    {c.voice_score != null ? c.voice_score?.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!c.eligible ? (
                      <span className="text-xs text-[#A3A3A3]">
                        {c.reason === "in_progress" ? "In progress" : "Not callable"}
                      </span>
                    ) : isOpen ? (
                      <div className="flex flex-col items-end gap-2">
                        <input
                          type="datetime-local"
                          value={scheduleAt}
                          min={defaultScheduleValue().slice(0, 10) + "T00:00"}
                          onChange={(e) => setScheduleAt(e.target.value)}
                          className="h-8 px-2 border border-[#D4D4D4] rounded-lg text-xs text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F]"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSchedulingFor(null)}
                            className="h-8 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => confirmSchedule(c.resume_id)}
                            disabled={busy}
                            className="h-8 px-3 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626] disabled:opacity-50"
                          >
                            {scheduling ? "Scheduling…" : "Confirm schedule"}
                          </button>
                        </div>
                      </div>
                    ) : isViewer ? null : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openScheduler(c.resume_id)}
                          disabled={busy}
                          className="h-8 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-white disabled:opacity-50"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={() => callMut.mutate(c.resume_id)}
                          disabled={busy}
                          className="h-8 px-3 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626] disabled:opacity-50"
                        >
                          {calling ? "Starting…" : c.reason === "recall" ? "Call again" : "Call now"}
                        </button>
                      </div>
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
