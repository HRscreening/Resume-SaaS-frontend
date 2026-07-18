import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getVoiceConfig,
  listCallCandidates,
  listVoiceCalls,
  triggerVoiceCalls,
  cancelScheduledCall,
} from "@/lib/api";
import type { CallListItem, CallCandidate, CallDisplayStatus } from "@/types";
import { VoiceScorecardDetails } from "./VoiceScorecardDetails";

interface CandidateVoicePanelProps {
  screeningId: string;
  resumeId: string;
  candidateName?: string | null;
}

// Call display buckets still moving through the pipeline → keep polling.
const ACTIVE: CallDisplayStatus[] = ["queued", "calling", "in_interview", "processing"];

function isScheduledPending(c: CallListItem): boolean {
  return (
    c.display_status === "queued" &&
    c.scheduled_at != null &&
    new Date(c.scheduled_at).getTime() > Date.now()
  );
}

function statusChip(s: CallDisplayStatus): { label: string; cls: string } {
  switch (s) {
    case "queued": return { label: "Queued", cls: "bg-slate-100 text-slate-700" };
    case "calling": return { label: "Calling…", cls: "bg-blue-100 text-blue-700" };
    case "in_interview": return { label: "In interview", cls: "bg-indigo-100 text-indigo-700" };
    case "processing": return { label: "Processing", cls: "bg-violet-100 text-violet-700" };
    case "ready": return { label: "Completed", cls: "bg-green-100 text-green-700" };
    case "unreachable": return { label: "Unreachable", cls: "bg-amber-100 text-amber-700" };
    default: return { label: s, cls: "bg-slate-100 text-slate-700" };
  }
}

function scoreColor(n: number | null | undefined): string {
  if (n == null) return "text-[#A3A3A3]";
  if (n >= 75) return "text-green-700";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

/** Default the schedule picker to ~1 hour out, in the user's local time. */
function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
}

const PhoneIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.5C2 2.7 2.7 2 3.5 2h1.2c.4 0 .7.3.8.6l.6 2c.1.3 0 .6-.2.8l-1 .8a8 8 0 0 0 3.4 3.4l.8-1c.2-.2.5-.3.8-.2l2 .6c.3.1.6.4.6.8v1.2c0 .8-.7 1.5-1.5 1.4A10.5 10.5 0 0 1 2 3.5z" />
  </svg>
);

/**
 * Per-candidate voice-screening controls, shown inside the candidate detail
 * drawer. Surfaces the whole voice loop where the recruiter is already looking:
 * call now, schedule a call, cancel a scheduled call, and read the transcript +
 * score once the interview is done. All state comes from the same three queries
 * the /voice/calls page uses (shared cache keys → no duplicate fetches).
 */
export function CandidateVoicePanel({ screeningId, resumeId, candidateName }: CandidateVoicePanelProps) {
  const queryClient = useQueryClient();
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  // TEMPORARY (2026-07-13): editable dial number. null ⇒ use the candidate's
  // number from their resume; any edit overrides just this call. Remove the
  // PhoneEditor + this state to revert to read-only phone display.
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);

  const { data: config } = useQuery({
    queryKey: ["voice-config", screeningId],
    queryFn: () => getVoiceConfig(screeningId),
    staleTime: 60_000,
  });

  const { data: candidatesResp } = useQuery({
    queryKey: ["voice-candidates", screeningId],
    queryFn: () => listCallCandidates(screeningId),
    staleTime: 15_000,
  });

  const { data: callsResp } = useQuery({
    queryKey: ["voice-calls", screeningId],
    queryFn: () => listVoiceCalls(screeningId),
    // Poll while this candidate has a live call so the panel advances on its own.
    refetchInterval: (q) => {
      const calls = (q.state.data?.calls ?? []).filter((c) => c.resume_id === resumeId);
      return calls.some((c) => ACTIVE.includes(c.display_status)) ? 3000 : false;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
    queryClient.invalidateQueries({ queryKey: ["voice-candidates", screeningId] });
  };

  const callMut = useMutation({
    mutationFn: (vars: { iso?: string; phone?: string | null }) =>
      triggerVoiceCalls(screeningId, [resumeId], vars.iso ?? null, vars.phone ?? null),
    onSuccess: (res, vars) => {
      invalidate();
      setScheduling(false);
      if (res.created.length) {
        toast.success(
          vars.iso
            ? `Scheduled ${candidateName ?? "candidate"} for ${new Date(vars.iso).toLocaleString()}`
            : `Calling ${candidateName ?? "candidate"}…`,
        );
      } else {
        toast.error(`Could not start call: ${res.skipped[0]?.reason ?? "unknown"}`);
      }
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not start call"),
  });

  const cancelMut = useMutation({
    mutationFn: (callId: string) => cancelScheduledCall(screeningId, callId),
    onSuccess: () => { invalidate(); toast.success("Scheduled call cancelled"); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not cancel"),
  });

  const voiceReady = Boolean(
    config?.voice_config?.enabled &&
    (config.voice_config.question_plan?.length ?? 0) > 0,
  );

  const candidate: CallCandidate | undefined = candidatesResp?.candidates.find((c) => c.resume_id === resumeId);
  // Calls list is newest-first → first match is the latest attempt.
  const latestCall: CallListItem | undefined = callsResp?.calls.find((c) => c.resume_id === resumeId);
  const busy = callMut.isPending || cancelMut.isPending;

  // TEMPORARY (2026-07-13): the number we'll actually dial. Defaults to the
  // candidate's resume phone; the recruiter can override it for a test call.
  const knownPhone = candidate?.candidate_phone ?? candidate?.phone_e164 ?? latestCall?.phone_e164 ?? "";
  const phoneValue = phoneDraft ?? knownPhone;
  // A JSX element (not an inner component) so the <input> keeps focus across
  // re-renders while typing. Delete this + the state to restore read-only phone.
  const phoneEditor = (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-[#737373]">Number to dial (temporary override)</label>
      <input
        type="tel"
        value={phoneValue}
        onChange={(e) => setPhoneDraft(e.target.value)}
        placeholder="+91XXXXXXXXXX"
        className="h-8 px-2 w-full max-w-[240px] border border-[#D4D4D4] rounded-lg text-xs text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F]"
      />
    </div>
  );

  const header = (
    <div className="flex items-center gap-2">
      <span className="text-[#404040]"><PhoneIcon size={14} /></span>
      <h3 className="text-sm font-semibold text-[#0F0F0F]">Voice screening</h3>
    </div>
  );

  const wrap = (children: React.ReactNode) => (
    <section className="rounded-2xl border border-[#E8E5DF] bg-[#FAFAF8] p-4 space-y-3">
      {header}
      {children}
    </section>
  );

  // ── Voice round not configured ───────────────────────────────────────────
  if (!voiceReady) {
    return wrap(
      <div className="space-y-2">
        <p className="text-xs text-[#737373]">
          Set up the voice round for this screening to run an AI phone interview with this candidate.
        </p>
        <Link
          to="/screenings/$id/voice"
          params={{ id: screeningId }}
          className="inline-flex h-8 px-3 items-center border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626]"
        >
          Set up voice round
        </Link>
      </div>,
    );
  }

  const openScheduler = () => { setScheduleAt(defaultScheduleValue()); setScheduling(true); };
  const confirmSchedule = () => {
    if (!scheduleAt) return;
    if (new Date(scheduleAt).getTime() <= Date.now()) { toast.error("Pick a time in the future"); return; }
    callMut.mutate({ iso: new Date(scheduleAt).toISOString(), phone: phoneValue });
  };

  const CallButtons = ({ recall }: { recall?: boolean }) => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => callMut.mutate({ phone: phoneValue })}
        disabled={busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626] disabled:opacity-50"
      >
        <PhoneIcon />
        {callMut.isPending && !callMut.variables?.iso ? "Starting…" : recall ? "Call again" : "Call now"}
      </button>
      <button
        onClick={openScheduler}
        disabled={busy}
        className="h-8 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-white disabled:opacity-50"
      >
        Schedule
      </button>
    </div>
  );

  const Scheduler = () => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[#404040]">Schedule the interview for</label>
      <input
        type="datetime-local"
        value={scheduleAt}
        onChange={(e) => setScheduleAt(e.target.value)}
        className="h-8 px-2 border border-[#D4D4D4] rounded-lg text-xs text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F]"
      />
      <div className="flex gap-2">
        <button onClick={() => setScheduling(false)} className="h-8 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-white">Cancel</button>
        <button onClick={confirmSchedule} disabled={busy} className="h-8 px-3 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626] disabled:opacity-50">
          {callMut.isPending ? "Scheduling…" : "Confirm"}
        </button>
      </div>
    </div>
  );

  // ── A call exists for this candidate ─────────────────────────────────────
  if (latestCall) {
    const chip = statusChip(latestCall.display_status);
    const scheduled = isScheduledPending(latestCall);
    const done = latestCall.display_status === "ready";
    const active = ACTIVE.includes(latestCall.display_status) && !scheduled;

    return wrap(
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {scheduled ? (
              <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Scheduled</span>
            ) : (
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${chip.cls}`}>{chip.label}</span>
            )}
            {latestCall.is_partial && <span className="text-[11px] text-amber-700">partial</span>}
          </div>
          {done && latestCall.voice_score != null && (
            <span className={`text-sm font-bold ${scoreColor(latestCall.voice_score)}`}>
              {latestCall.voice_score.toFixed(1)} <span className="text-[11px] font-normal text-[#737373]">voice</span>
            </span>
          )}
        </div>

        <div className="text-xs text-[#737373]">{latestCall.phone_e164}</div>

        {scheduled && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#404040]">for {new Date(latestCall.scheduled_at as string).toLocaleString()}</span>
            <button
              onClick={() => cancelMut.mutate(latestCall.id)}
              disabled={cancelMut.isPending}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              {cancelMut.isPending ? "Cancelling…" : "Cancel"}
            </button>
          </div>
        )}

        {active && (
          <p className="text-xs text-[#737373]">The interview is running. This updates automatically when it finishes.</p>
        )}

        {done && (
          <VoiceScorecardDetails screeningId={screeningId} callId={latestCall.id} />
        )}

        {/* Re-call is available once the last attempt is finished (done/unreachable). */}
        {!scheduled && !active && (
          scheduling ? <Scheduler /> : <div className="space-y-2">{phoneEditor}<CallButtons recall /></div>
        )}
      </div>,
    );
  }

  // ── No call yet ──────────────────────────────────────────────────────────
  if (candidate?.reason === "no_phone" || (candidate == null && !latestCall)) {
    // Not callable: either no phone, or the candidate isn't Shortlisted (the
    // /candidates endpoint only lists Shortlisted candidates).
    const msg = candidate?.reason === "no_phone"
      ? "No phone number on file for this candidate, so they can't be called."
      : "Move this candidate to the Shortlisted stage to run a voice interview.";
    return wrap(<p className="text-xs text-[#737373]">{msg}</p>);
  }

  // Callable / recall, no active call.
  return wrap(
    <div className="space-y-2">
      <p className="text-xs text-[#737373]">Run an AI phone interview with this candidate.</p>
      {scheduling ? <Scheduler /> : <div className="space-y-2">{phoneEditor}<CallButtons recall={candidate?.reason === "recall"} /></div>}
    </div>,
  );
}
