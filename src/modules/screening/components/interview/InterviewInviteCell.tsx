import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createInterviewInvites } from "@/lib/api";
import { listInterviewScorecards } from "@/lib/interviewScorecardApi";
import { listRounds } from "@/lib/roundApi";
import { interviewCellState, interviewScoreClass } from "./interviewCellState";
import { ApiError } from "@/lib/api";
import type { RankedCandidate } from "@/modules/screening/types/screening.type";

// The interview round is the step AFTER the voice screen, so the invite
// belongs on the candidate, next to their voice result, and only once that
// result exists. Offering it on every candidate would invite people who have
// not been screened yet; offering it once per screening would mean choosing
// candidates away from the list you are choosing them from.
//
// The gate is `voice_status === "ready"`, which is the one status that means
// the call actually happened and produced a score. "withdrawn" and
// "unreachable" are finished but produced no interview, and everything else
// is still in flight.
export function InterviewInviteCell({
  candidate,
  screeningId,
  canWrite,
}: {
  candidate: RankedCandidate;
  screeningId: string;
  canWrite: boolean;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailed, setEmailed] = useState(false);

  const voiceDone = candidate.voice_status === "ready";

  // Only asked once a candidate is actually eligible, so a screening whose
  // candidates are all mid-screen costs nothing. Shared cache key with the
  // authoring screen, so opening one warms the other.
  const { data: rounds } = useQuery({
    queryKey: ["rounds", screeningId],
    queryFn: () => listRounds(screeningId),
    enabled: voiceDone,
  });
  // Shared cache key with InterviewScorePill and the drawer, so a whole
  // board of rows costs ONE request, not one per candidate.
  const { data: scorecards } = useQuery({
    queryKey: ["interview-scorecards", screeningId],
    queryFn: () => listInterviewScorecards(screeningId),
    staleTime: 30_000,
    enabled: voiceDone,
  });
  const scorecard = scorecards?.scorecards.find((s) => s.resume_id === candidate.resume_id);

  const invite = useMutation({
    mutationFn: () => createInterviewInvites(screeningId, [candidate.resume_id]),
    onSuccess: (res) => {
      const first = res.invites[0];
      if (first) {
        setLink(first.invite_url);
        setEmailed(first.emailed === true);
        toast.success(
          first.emailed
            ? `Invite emailed to ${candidate.candidate_name ?? "the candidate"}.`
            : "Invite created, but no email was sent. Share the link yourself."
        );
        return;
      }
      // The server took the request but invited nobody. That is a real
      // answer, not a failure: it skips a candidate who has already sat
      // the round or is no longer at the entry stage.
      toast.message(
        "No invite created. This candidate has either already been invited to this round or is not at the entry stage."
      );
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Publish an interview round for this screening first.");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not create the invite.");
    },
  });

  const view = interviewCellState({
    voiceDone, scorecard, link, emailed, canWrite, rounds,
  });

  if (view.kind === "not-eligible") {
    return (
      <span
        className="text-xs text-[#D4D4D4]"
        title="Available once the voice screen has finished and been scored"
      >
        &mdash;
      </span>
    );
  }

  // Passive, exactly like CandidateVoiceCell beside it: clicking the row
  // opens the detail view where the full scorecard drawer lives, so a
  // dense board stays readable and nothing here is a stray click away
  // from something irreversible.
  if (view.kind === "scored") {
    return (
      <span
        title={`Interview round: ${view.score.toFixed(1)}${view.isPartial ? " (partial)" : ""}. Open the candidate to read the full scorecard.`}
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${interviewScoreClass(view.score)}`}
      >
        {Math.round(view.score)}{view.isPartial ? " (partial)" : ""}
      </span>
    );
  }

  if (view.kind === "invited") {
    const inviteLink = view.link;
    return (
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(inviteLink).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => toast.error("Could not copy the link.")
          );
        }}
        title={view.emailed ? `Emailed. Click to copy the link too: ${inviteLink}` : `Not emailed. Click to copy: ${inviteLink}`}
        className="inline-flex items-center gap-1 rounded-lg border border-[#D4D4D4] bg-white px-2 py-1 text-[11px] font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE]"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied" : view.emailed ? "Emailed" : "Copy link"}
      </button>
    );
  }

  if (view.kind === "read-only") {
    return <span className="text-xs text-[#D4D4D4]" title="Read-only access">&mdash;</span>;
  }

  if (view.kind === "no-round") {
    return (
      <span
        className="text-[11px] text-[#A3A3A3]"
        title="Publish an interview round for this screening before inviting anyone to it"
      >
        No round
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => invite.mutate()}
      disabled={invite.isPending || view.disabled}
      className="rounded-lg border border-[#0F0F0F] bg-[#0F0F0F] px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {invite.isPending ? "Inviting..." : "Invite"}
    </button>
  );
}
