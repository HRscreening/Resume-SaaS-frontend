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
  rescheduleVoiceCall,
} from "@/lib/api";
import type { CallListItem, CallCandidate, CallDisplayStatus } from "@/types";
import { VoiceScorecardDetails } from "./VoiceScorecardDetails";
import { InterruptionNotice } from "./InterruptionNotice";
import { toInputValue, defaultScheduleValue } from "@/lib/scheduleTime";
import { ExternalLink, Loader2 } from "lucide-react";

interface CandidateVoicePanelProps {
  screeningId: string;
  resumeId: string;
  candidateName?: string | null;
  currentStage?: string | null;
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

function statusBadge(s: CallDisplayStatus): { label: string; cls: string } {
  switch (s) {
    case "queued": return { label: "Queued", cls: "bg-slate-50 border-slate-200 text-slate-700" };
    case "calling": return { label: "Calling…", cls: "bg-blue-50 border-blue-200 text-blue-700" };
    case "in_interview": return { label: "In interview", cls: "bg-indigo-50 border-indigo-200 text-indigo-700" };
    case "processing": return { label: "Processing", cls: "bg-violet-50 border-violet-200 text-violet-700" };
    case "ready": return { label: "Completed", cls: "bg-green-50 border-green-200 text-green-700" };
    case "unreachable": return { label: "Unreachable", cls: "bg-amber-50 border-amber-200 text-amber-700" };
    default: return { label: s, cls: "bg-slate-50 border-slate-200 text-slate-700" };
  }
}

function scoreColor(n: number | null | undefined): string {
  if (n == null) return "text-[#A3A3A3]";
  if (n >= 75) return "text-green-700";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

function formatDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

/** Default the schedule picker to ~1 hour out, in the user's local time. */

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
export function CandidateVoicePanel({ screeningId, resumeId, candidateName,currentStage }: CandidateVoicePanelProps) {
  const queryClient = useQueryClient();
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  // Non-null ⇒ the picker is moving THIS existing call rather than booking a
  // new one. Drives which mutation Confirm fires.
  const [movingCallId, setMovingCallId] = useState<string | null>(null);
  // TEMPORARY (2026-07-13): editable dial number. null ⇒ use the candidate's
  // number from their resume; any edit overrides just this call. Remove the
  // PhoneEditor + this state to revert to read-only phone display.
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState(false);

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ["voice-config", screeningId],
    queryFn: () => getVoiceConfig(screeningId),
    staleTime: 60_000,
  });

  const { data: candidatesResp, isLoading: candidatesLoading } = useQuery({
    queryKey: ["voice-candidates", screeningId],
    queryFn: () => listCallCandidates(screeningId),
    staleTime: 15_000,
  });


  const { data: callsResp, isLoading: callsLoading } = useQuery({
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

  // Moving an existing booking, as opposed to creating one. Kept separate from
  // callMut because it must not create a second call for this candidate — the
  // old behaviour (cancel, then schedule again) briefly left them with none.
  const rescheduleMut = useMutation({
    mutationFn: (vars: { callId: string; iso: string }) =>
      rescheduleVoiceCall(screeningId, vars.callId, vars.iso),
    onSuccess: (_res, vars) => {
      invalidate();
      setScheduling(false);
      setMovingCallId(null);
      toast.success(`Interview moved to ${new Date(vars.iso).toLocaleString()}`);
    },
    onError: (e: unknown) =>
      // The backend 409s once the dispatcher has claimed the call. Say so
      // plainly: the recruiter's next move is to let it run, not to retry.
      toast.error(e instanceof Error ? e.message : "Could not move this interview"),
  });

  const isLoading = configLoading || candidatesLoading || callsLoading;

  const voiceReady = Boolean(
    config?.voice_config?.enabled &&
    (config.voice_config.question_plan?.length ?? 0) > 0,
  );

  const candidate: CallCandidate | undefined = candidatesResp?.candidates.find((c) => c.resume_id === resumeId);
  // Calls list is newest-first → first match is the latest attempt.
  const latestCall: CallListItem | undefined = callsResp?.calls.find((c) => c.resume_id === resumeId);
  const busy = callMut.isPending || cancelMut.isPending || rescheduleMut.isPending;

  // TEMPORARY (2026-07-13): the number we'll actually dial. Defaults to the
  // candidate's resume phone; the recruiter can override it for a test call.
  const knownPhone = candidate?.candidate_phone ?? candidate?.phone_e164 ?? latestCall?.phone_e164 ?? "";
  const phoneValue = phoneDraft ?? knownPhone;
  // Phone override stays available (test calls need it) but no longer occupies
  // the panel by default: plain text + "edit" until the recruiter asks for it.
  const phoneEditor = editingPhone ? (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-[#737373]">Number to dial</label>
      <input
        type="tel"
        value={phoneValue}
        onChange={(e) => setPhoneDraft(e.target.value)}
        placeholder="+91XXXXXXXXXX"
        autoFocus
        className="h-8 px-2 w-full max-w-[240px] border border-[#D4D4D4] rounded-lg text-xs text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F]"
      />
    </div>
  ) : (
    <div className="flex items-center gap-2 text-xs text-[#737373]">
      <span>{phoneValue || "No number on file"}</span>
      <button
        onClick={() => setEditingPhone(true)}
        className="text-[11px] font-medium text-[#0F0F0F] underline underline-offset-2 hover:text-[#C85A17]"
      >
        edit
      </button>
    </div>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
      </div>
    );
  }

  // ── Voice round not configured ───────────────────────────────────────────
  if (!voiceReady) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[#404040]"><PhoneIcon size={14} /></span>
          <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Voice Screening</p>
        </div>
        <div className="bg-[#F5F3EE] rounded-xl p-4">
          <p className="text-xs text-[#404040] leading-relaxed">
            Set up the voice round for this screening to run an AI phone interview with this candidate.
          </p>
        </div>
        <Link
          to="/screenings/$id/voice"
          params={{ id: screeningId }}
          className="inline-flex h-8 px-3 items-center border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626]"
        >
          Set up voice round
        </Link>
      </div>
    );
  }

  const openScheduler = () => {
    setMovingCallId(null);
    setScheduleAt(defaultScheduleValue());
    setScheduling(true);
  };

  /** Open the same picker prefilled with the booking's current time, so a small
   *  correction ("half an hour later") is an edit rather than a re-entry. */
  const openReschedule = (call: CallListItem) => {
    setMovingCallId(call.id);
    setScheduleAt(call.scheduled_at ? toInputValue(new Date(call.scheduled_at))
                                    : defaultScheduleValue());
    setScheduling(true);
  };

  const closeScheduler = () => { setScheduling(false); setMovingCallId(null); };

  const confirmSchedule = () => {
    if (!scheduleAt) return;
    if (new Date(scheduleAt).getTime() <= Date.now()) { toast.error("Pick a time in the future"); return; }
    const iso = new Date(scheduleAt).toISOString();
    if (movingCallId) rescheduleMut.mutate({ callId: movingCallId, iso });
    else callMut.mutate({ iso, phone: phoneValue });
  };

  // These are render helpers CALLED as functions, not components rendered as
  // <Element />. Declaring a component inside the render body gives it a new
  // function identity every render, so React treats it as a different type,
  // unmounts the old subtree and mounts a fresh one. That reset the scheduler's
  // datetime input on the first keystroke and stole its focus, which made the
  // field impossible to fill in. Calling them inlines the JSX into this
  // component's tree instead, so the input keeps its DOM node and its focus.
  const callButtons = (recall?: boolean) => (
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

  const scheduler = () => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-[#404040]">
        {movingCallId ? "Move the interview to" : "Schedule the interview for"}
      </label>
      <input
        type="datetime-local"
        value={scheduleAt}
        onChange={(e) => setScheduleAt(e.target.value)}
        className="h-8 px-2 border border-[#D4D4D4] rounded-lg text-xs text-[#0F0F0F] focus:outline-none focus:border-[#0F0F0F]"
      />
      <div className="flex gap-2">
        <button onClick={closeScheduler} className="h-8 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-white">Cancel</button>
        <button onClick={confirmSchedule} disabled={busy} className="h-8 px-3 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-lg hover:bg-[#262626] disabled:opacity-50">
          {rescheduleMut.isPending ? "Moving…" : callMut.isPending ? "Scheduling…" : "Confirm"}
        </button>
      </div>
    </div>
  );

  // ── A call exists for this candidate ─────────────────────────────────────
  if (latestCall) {
    const chip = statusBadge(latestCall.display_status);
    const scheduled = isScheduledPending(latestCall);
    const done = latestCall.display_status === "ready";
    const active = ACTIVE.includes(latestCall.display_status) && !scheduled;
    const duration = formatDuration(latestCall.duration_seconds);

    return (
      <div className="space-y-4">
        {/* Section header */}

        <div className="flex flex-row w-full justify-between">

          <div className="flex items-center gap-2">
            <span className="text-[#404040]"><PhoneIcon size={14} /></span>
            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Voice Screening</p>
          </div>

          {/* Sharing is deliberately NOT here. The report covers resume plus
              voice, so it belongs to the candidate, not to the voice round —
              it lives once in the drawer header (AnalysisSheet). Mounting it
              here too put two Share buttons in the same open drawer. */}

          {/* Status + Score row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {scheduled ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold bg-purple-50 border-purple-200 text-purple-700">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  {latestCall.rescheduled_by_candidate ? "Rescheduled" : "Scheduled"}
                </span>
              ) : (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${chip.cls}`}>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: done ? "#22C55E" : "#A3A3A3" }} />
                  {chip.label}
                </span>
              )}
              {latestCall.is_partial && (
                <span className="text-[11px] text-amber-700 font-medium">partial</span>
              )}
            </div>

            {/* {done && latestCall.voice_score != null && (
            <span className={`text-sm font-bold ${scoreColor(latestCall.voice_score)}`}>
              {latestCall.voice_score?.toFixed(1)} <span className="text-[11px] font-normal text-[#737373]">voice</span>
            </span>
          )} */}

            {done && latestCall.has_transcript && (
              <div className="flex items-center gap-2">
                <a
                  href={`/screenings/${screeningId}/voice/calls/${latestCall.id}/transcript`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#E8E5DF] text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors"
                >
                  <ExternalLink size={12} />
                  View Transcript
                </a>
              </div>
            )}

          </div>

        </div>

        {done && (

          <VoiceScorecardDetails
            screeningId={screeningId}
            callId={latestCall.id}
            durationSeconds={latestCall.duration_seconds}
          />
        )}




        {/* Phone & duration */}
        {/* <div className="flex items-center gap-3 text-xs text-[#737373]">
          <span>{latestCall.phone_e164}</span>
          {duration && (
            <>
              <span className="h-3 w-px bg-[#E8E5DF]" />
              <span>{duration} call</span>
            </>
          )}
        </div> */}

        <InterruptionNotice call={latestCall} />

        {/* Moving an existing booking: the picker replaces the summary row, so
            the recruiter is never looking at the old time while editing it. */}
        {scheduled && scheduling && movingCallId && (
          <div className="bg-[#F5F3EE] rounded-xl px-4 py-3">{scheduler()}</div>
        )}

        {scheduled && !(scheduling && movingCallId) && (
          <div className="flex items-center justify-between gap-2 bg-[#F5F3EE] rounded-xl px-4 py-3">
            <span className="text-xs text-[#404040]">
              {latestCall.rescheduled_by_candidate ? "Candidate asked to be called back" : "Scheduled for"}
              {latestCall.rescheduled_by_candidate ? ": " : " "}
              {new Date(latestCall.scheduled_at as string).toLocaleString()}
              {latestCall.rescheduled_by_candidate && latestCall.reschedule_requested_time && (
                <span className="text-[#737373]"> (&ldquo;{latestCall.reschedule_requested_time}&rdquo;)</span>
              )}
              {latestCall.rescheduled_by_candidate && (latestCall.reschedule_no ?? 0) >= 2 && (
                // The cap is 2: after this the agent stops offering a booking,
                // so HR needs to know the automatic retries are exhausted.
                <span className="block mt-0.5 text-[11px] font-medium text-amber-700">
                  Final reschedule. If they miss this one the assistant will not book another.
                </span>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={() => openReschedule(latestCall)}
                disabled={busy}
                className="text-xs font-medium text-[#404040] hover:text-[#0F0F0F] hover:underline disabled:opacity-50"
              >
                Change time
              </button>
              <span className="h-3 w-px bg-[#E8E5DF]" />
              <button
                onClick={() => cancelMut.mutate(latestCall.id)}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
              >
                {cancelMut.isPending ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        {active && (
          <div className="bg-[#F5F3EE] rounded-xl px-4 py-3">
            <p className="text-xs text-[#404040] leading-relaxed">
              The interview is running. This updates automatically when it finishes.
            </p>
          </div>
        )}



        {/* Re-call is available once the last attempt is finished (done/unreachable). */}
        {!scheduled && !active && (
          scheduling ? scheduler() : <div className="space-y-2">{phoneEditor}{callButtons(true)}</div>
        )}
      </div>
    );
  }


  // ! change the api resoponse ask for isElliblity and reason for this candidate
  // // ── No call yet ──────────────────────────────────────────────────────────
  // if (!isShortlisted && (candidate?.reason === "no_phone"  || (candidate == null && !latestCall) ) ) {
  //   // Not callable: either no phone, or the candidate isn't Shortlisted (the
  //   // /candidates endpoint only lists Shortlisted candidates).
  //   const msg = candidate?.reason === "no_phone"
  //     ? "No phone number on file for this candidate, so they can't be called."
  //     : "Move this candidate to the Shortlisted stage to run a voice interview.";
  //   return (
  //     <div className="space-y-4">
  //       <div className="flex items-center gap-2">
  //         <span className="text-[#404040]"><PhoneIcon size={14} /></span>
  //         <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Voice Screening</p>
  //       </div>
  //       <div className="bg-[#F5F3EE] rounded-xl p-4">
  //         <p className="text-xs text-[#404040] leading-relaxed">{msg}</p>
  //       </div>
  //     </div>
  //   );
  // }

  // Callable / recall, no active call.
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[#404040]"><PhoneIcon size={14} /></span>
        <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Voice Screening</p>
      </div>
      <div className="bg-[#F5F3EE] rounded-xl p-4">
        <p className="text-xs text-[#404040] leading-relaxed">Run an AI phone interview with this candidate.</p>
      </div>
      {scheduling ? scheduler() : <div className="space-y-2">{phoneEditor}{callButtons(candidate?.reason === "recall")}</div>}
    </div>
  );
}
