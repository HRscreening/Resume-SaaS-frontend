import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelScheduledCall, listVoiceCalls, rescheduleVoiceCall } from "@/lib/api";
import type { CallListItem } from "@/types";
import {
  formatClock, formatDayHeading, groupByDay, isFuture, localZoneName, toInputValue,
} from "@/lib/scheduleTime";

interface UpcomingCallsPanelProps {
  screeningId: string;
}

/**
 * Every interview still to come, grouped by day.
 *
 * Per-candidate scheduling lives in the candidate drawer, which answers "when
 * is THIS person booked". It cannot answer "what does Thursday look like" —
 * that needs one screen holding all of them, which is what this is. It reads
 * the same calls list every other voice surface reads, filtered to bookings
 * that have not happened yet, so nothing new has to be kept in sync.
 */
export function UpcomingCallsPanel({ screeningId }: UpcomingCallsPanelProps) {
  const queryClient = useQueryClient();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [when, setWhen] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["voice-calls", screeningId],
    queryFn: () => listVoiceCalls(screeningId),
    // Matches the drawer: a scheduled call becomes a live one without any
    // action here, and a stale list would invite double-booking.
    refetchInterval: 15_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
    queryClient.invalidateQueries({ queryKey: ["voice-candidates", screeningId] });
  };

  const days = useMemo(() => {
    const upcoming = (data?.calls ?? []).filter(
      (c) => c.scheduled_at != null && new Date(c.scheduled_at).getTime() > Date.now(),
    );
    return groupByDay(upcoming, (c) => c.scheduled_at as string);
  }, [data]);

  const reschedule = useMutation({
    mutationFn: (vars: { callId: string; iso: string }) =>
      rescheduleVoiceCall(screeningId, vars.callId, vars.iso),
    onSuccess: (_r, vars) => {
      invalidate();
      setMovingId(null);
      toast.success(`Moved to ${new Date(vars.iso).toLocaleString()}`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not move this interview"),
  });

  const cancel = useMutation({
    mutationFn: (callId: string) => cancelScheduledCall(screeningId, callId),
    onSuccess: () => { invalidate(); toast.success("Scheduled call cancelled"); },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not cancel"),
  });

  const startMove = (call: CallListItem) => {
    setMovingId(call.id);
    setWhen(toInputValue(new Date(call.scheduled_at as string)));
  };

  const confirmMove = () => {
    if (!movingId || !isFuture(when)) { toast.error("Pick a time in the future"); return; }
    reschedule.mutate({ callId: movingId, iso: new Date(when).toISOString() });
  };

  if (isLoading) {
    return <p className="text-xs text-[#737373]">Loading scheduled interviews…</p>;
  }

  if (days.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#E8E5DF] px-4 py-6 text-center">
        <p className="text-xs text-[#737373]">
          No interviews scheduled. Book one from a candidate, or schedule several at once.
        </p>
      </div>
    );
  }

  const busy = reschedule.isPending || cancel.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#737373]">
          Upcoming interviews
        </h3>
        <span className="text-[11px] text-[#A3A3A3]">Times in {localZoneName()}</span>
      </div>

      {days.map(({ day, items }) => (
        <div key={day.toDateString()}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#A3A3A3]">
            {formatDayHeading(day)}
          </p>
          <div className="space-y-1.5">
            {items.map((call) => (
              <div key={call.id} className="rounded-xl bg-[#F5F3EE] px-3 py-2.5">
                {movingId === call.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="datetime-local"
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      className="h-8 rounded-lg border border-[#D4D4D4] px-2 text-xs text-[#0F0F0F] focus:border-[#0F0F0F] focus:outline-none"
                    />
                    <button
                      onClick={confirmMove}
                      disabled={busy}
                      className="h-8 rounded-lg border border-[#0F0F0F] bg-[#0F0F0F] px-3 text-xs font-medium text-white hover:bg-[#262626] disabled:opacity-50"
                    >
                      {reschedule.isPending ? "Moving…" : "Save"}
                    </button>
                    <button
                      onClick={() => setMovingId(null)}
                      className="h-8 rounded-lg border border-[#D4D4D4] px-3 text-xs font-medium text-[#404040] hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-xs font-semibold text-[#0F0F0F]">
                      {formatClock(call.scheduled_at as string)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-[#0F0F0F]">
                        {call.candidate_name ?? "Unnamed candidate"}
                      </p>
                      {call.rescheduled_by_candidate && (
                        // Distinguishes a booking the candidate asked for from
                        // one the recruiter set — they mean different things
                        // when deciding whether to move it again.
                        <p className="text-[11px] text-[#737373]">
                          Candidate asked to be called back
                          {call.reschedule_requested_time
                            ? ` (“${call.reschedule_requested_time}”)`
                            : ""}
                        </p>
                      )}
                    </div>
                    <span className="hidden shrink-0 text-[11px] text-[#A3A3A3] sm:block">
                      {call.phone_e164}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => startMove(call)}
                        disabled={busy}
                        className="text-[11px] font-medium text-[#404040] hover:text-[#0F0F0F] hover:underline disabled:opacity-50"
                      >
                        Change
                      </button>
                      <button
                        onClick={() => cancel.mutate(call.id)}
                        disabled={busy}
                        className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
