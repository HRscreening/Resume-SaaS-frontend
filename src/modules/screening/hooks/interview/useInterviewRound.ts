import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, createInterviewInvites, getInterviewCandidates } from "@/lib/api";
import { listInterviewScorecards } from "@/lib/interviewScorecardApi";

/**
 * One candidate's interview-round status, for the candidate row and the First
 * Round tab alike. Both queries share their cache keys across the whole board,
 * so a page of rows costs two requests, not two per row.
 */
export function useInterviewRound(screeningId: string, resumeId: string) {
  const status = useQuery({
    queryKey: ["interview-candidates", screeningId],
    queryFn: () => getInterviewCandidates(screeningId),
    staleTime: 30_000,
  });
  const scorecards = useQuery({
    queryKey: ["interview-scorecards", screeningId],
    queryFn: () => listInterviewScorecards(screeningId),
    staleTime: 30_000,
  });
  return {
    loading: status.isLoading || scorecards.isLoading,
    failed: status.isError,
    roundState: status.data?.round_state,
    roundId: status.data?.round_id ?? null,
    candidate: status.data?.candidates.find((c) => c.resume_id === resumeId),
    scorecard: scorecards.data?.scorecards.find((s) => s.resume_id === resumeId),
  };
}

/** Invite one candidate. Refreshes the board so the row shows the new link. */
export function useInterviewInvite(screeningId: string, resumeId: string, candidateName?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createInterviewInvites(screeningId, [resumeId]),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["interview-candidates", screeningId] });
      const first = res.invites[0];
      if (!first) {
        // The server took the request but invited nobody: already invited,
        // or no longer eligible. A real answer, not a failure.
        toast.message("No invite created. This candidate has already been invited or is not eligible.");
        return;
      }
      toast.success(
        first.emailed
          ? `Invite emailed to ${candidateName ?? "the candidate"}.`
          : "Invite created, but no email was sent. Share the link yourself.",
      );
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Publish the interview round for this job first.");
        return;
      }
      toast.error(err instanceof Error ? err.message : "Could not create the invite.");
    },
  });
}
