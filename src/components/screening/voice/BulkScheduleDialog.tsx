import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listCallCandidates, triggerVoiceCalls } from "@/lib/api";
import type { CallCandidate, CandidateCallReason } from "@/types";
import { defaultScheduleValue, isFuture, localZoneName } from "@/lib/scheduleTime";

interface BulkScheduleDialogProps {
  screeningId: string;
  open: boolean;
  onClose: () => void;
}

/** Why a candidate cannot be booked, in the recruiter's terms. "callable" and
 *  "recall" never reach here — those are the selectable ones. */
const BLOCKED_REASON: Record<Exclude<CandidateCallReason, "callable" | "recall">, string> = {
  no_phone: "No usable phone number",
  in_progress: "Interview already under way",
};

/**
 * Schedule interviews for several candidates at one time.
 *
 * This posts to the same endpoint as a single booking, with several resume_ids
 * — there is no separate bulk path on the server to drift out of sync. Every
 * candidate is scheduled for the SAME time on purpose: the dispatcher already
 * places calls under the plan's concurrency cap, so it dials them in turn as
 * slots free. Staggering them here would duplicate that logic in the UI and
 * get it wrong the moment the cap changes.
 */
export function BulkScheduleDialog({ screeningId, open, onClose }: BulkScheduleDialogProps) {
  const queryClient = useQueryClient();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [when, setWhen] = useState(defaultScheduleValue);

  const { data, isLoading } = useQuery({
    queryKey: ["voice-candidates", screeningId],
    queryFn: () => listCallCandidates(screeningId),
    enabled: open,
  });

  const [eligible, blocked] = useMemo(() => {
    const all = data?.candidates ?? [];
    return [all.filter((c) => c.eligible), all.filter((c) => !c.eligible)];
  }, [data]);

  const schedule = useMutation({
    mutationFn: () =>
      triggerVoiceCalls(screeningId, [...picked], new Date(when).toISOString()),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
      queryClient.invalidateQueries({ queryKey: ["voice-candidates", screeningId] });
      const at = new Date(when).toLocaleString();
      if (res.created.length) {
        toast.success(
          `Scheduled ${res.created.length} interview${res.created.length === 1 ? "" : "s"} for ${at}`,
        );
      }
      // Server-side skips are reported rather than swallowed: a recruiter who
      // selected 10 and got 8 needs to know which 2 did not make it.
      if (res.skipped.length) {
        toast.warning(
          `${res.skipped.length} could not be scheduled: ` +
          res.skipped.map((s) => s.candidate_name ?? s.resume_id.slice(0, 8)).join(", "),
        );
      }
      if (res.created.length) close();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not schedule these interviews"),
  });

  const close = () => { setPicked(new Set()); onClose(); };

  const toggle = (id: string) =>
    // Rebuilt rather than mutated so React sees a new Set and re-renders.
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allPicked = eligible.length > 0 && picked.size === eligible.length;
  const toggleAll = () =>
    setPicked(allPicked ? new Set() : new Set(eligible.map((c) => c.resume_id)));

  if (!open) return null;

  const timeValid = isFuture(when);
  const canSubmit = picked.size > 0 && timeValid && !schedule.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Schedule interviews"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-[#E8E5DF] bg-white shadow-xl"
      >
        <div className="border-b border-[#E8E5DF] px-5 py-4">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Schedule interviews</h2>
          <p className="mt-1 text-xs text-[#737373]">
            Pick the candidates and one time. The assistant calls them in turn from that
            time, within your plan&rsquo;s concurrent-call limit.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {isLoading && <p className="py-6 text-center text-xs text-[#737373]">Loading candidates…</p>}

          {!isLoading && eligible.length === 0 && (
            <p className="py-6 text-center text-xs text-[#737373]">
              No candidates are ready to be called. Shortlist candidates with a phone
              number, and make sure the voice round is switched on.
            </p>
          )}

          {eligible.length > 0 && (
            <>
              <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-[#F2F0EB] pb-2 text-xs font-medium text-[#404040]">
                <input
                  type="checkbox"
                  checked={allPicked}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 accent-[#C85A17]"
                />
                Select all {eligible.length}
              </label>
              {eligible.map((c) => (
                <CandidateRow
                  key={c.resume_id}
                  candidate={c}
                  checked={picked.has(c.resume_id)}
                  onToggle={() => toggle(c.resume_id)}
                />
              ))}
            </>
          )}

          {blocked.length > 0 && (
            <div className="mt-3 border-t border-[#F2F0EB] pt-2">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-[#A3A3A3]">
                Cannot be called yet
              </p>
              {blocked.map((c) => (
                <div key={c.resume_id} className="flex items-center justify-between py-1.5 text-xs">
                  <span className="text-[#A3A3A3]">{c.candidate_name ?? "Unnamed candidate"}</span>
                  <span className="text-[11px] text-[#A3A3A3]">
                    {BLOCKED_REASON[c.reason as keyof typeof BLOCKED_REASON] ?? "Not callable"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[#E8E5DF] px-5 py-4">
          <label className="block text-xs font-medium text-[#404040]">
            Call them from
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="h-9 rounded-xl border border-[#D4D4D4] px-2 text-sm text-[#0F0F0F] focus:border-[#0F0F0F] focus:outline-none"
            />
            <span className="text-[11px] text-[#737373]">{localZoneName()}</span>
          </div>
          {!timeValid && (
            <p className="mt-1 text-[11px] text-red-600">Pick a time in the future.</p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xs text-[#737373]">
              {picked.size} selected
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={close}
                className="h-9 px-4 text-sm font-medium text-[#404040] hover:text-[#0F0F0F]"
              >
                Cancel
              </button>
              <button
                onClick={() => schedule.mutate()}
                disabled={!canSubmit}
                className="h-9 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-5 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {schedule.isPending
                  ? "Scheduling…"
                  : `Schedule ${picked.size || ""}`.trim()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateRow({
  candidate, checked, onToggle,
}: {
  candidate: CallCandidate;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-xs hover:bg-[#FAFAF7]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 shrink-0 accent-[#C85A17]"
      />
      <span className="min-w-0 flex-1 truncate text-[#0F0F0F]">
        {candidate.candidate_name ?? "Unnamed candidate"}
      </span>
      {/* Re-calls are worth flagging: the recruiter may be about to call
          someone the assistant has already spoken to. */}
      {candidate.reason === "recall" && (
        <span className="shrink-0 rounded-full bg-[#F5F3EE] px-2 py-0.5 text-[10px] font-medium text-[#737373]">
          Call again
        </span>
      )}
      <span className="shrink-0 text-[11px] text-[#A3A3A3]">{candidate.phone_e164}</span>
    </label>
  );
}
