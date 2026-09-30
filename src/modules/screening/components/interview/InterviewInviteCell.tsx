import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { createInterviewInvites } from "@/lib/api";
import { listRounds } from "@/lib/roundApi";
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

  const voiceDone = candidate.voice_status === "ready";

  // Only asked once a candidate is actually eligible, so a screening whose
  // candidates are all mid-screen costs nothing. Shared cache key with the
  // authoring screen, so opening one warms the other.
  const { data: rounds } = useQuery({
    queryKey: ["rounds", screeningId],
    queryFn: () => listRounds(screeningId),
    enabled: voiceDone,
  });
  const published = rounds?.find((r) => r.status === "published") ?? null;

  const invite = useMutation({
    mutationFn: () => createInterviewInvites(screeningId, [candidate.resume_id]),
    onSuccess: (res) => {
      const first = res.invites[0];
      if (first) {
        setLink(first.invite_url);
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

  if (!voiceDone) {
    return (
      <span
        className="text-xs text-[#D4D4D4]"
        title="Available once the voice screen has finished and been scored"
      >
        &mdash;
      </span>
    );
  }

  if (link) {
    return (
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(link).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => toast.error("Could not copy the link.")
          );
        }}
        title={link}
        className="inline-flex items-center gap-1 rounded-lg border border-[#D4D4D4] bg-white px-2 py-1 text-[11px] font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE]"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "Copied" : "Copy link"}
      </button>
    );
  }

  if (!canWrite) {
    return <span className="text-xs text-[#D4D4D4]" title="Read-only access">&mdash;</span>;
  }

  // Rounds are still loading, or none is published. Say which, rather than
  // showing a button whose only outcome would be an error.
  if (rounds !== undefined && published === null) {
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
      disabled={invite.isPending || rounds === undefined}
      className="rounded-lg border border-[#0F0F0F] bg-[#0F0F0F] px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {invite.isPending ? "Inviting..." : "Invite"}
    </button>
  );
}
