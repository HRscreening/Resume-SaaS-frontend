import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRound, listRounds } from "@/lib/roundApi";
import { InvitePanel } from "@/modules/screening/components/interview/InvitePanel";

// Inviting candidates to an interview round belongs on the screening page,
// beside the candidate list, rather than on the round authoring screen.
// Authoring a round and choosing who sits it are different jobs done at
// different times, and the second one needs the candidates in front of you.
//
// The round is looked up here rather than passed in, so the screening page
// does not have to know anything about rounds to offer the action. Both
// queries are cheap and only run while the dialog is open.
export function InterviewInviteDialog({
  screeningId,
  open,
  onOpenChange,
  canWrite,
}: {
  screeningId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canWrite: boolean;
}) {
  const { data: rounds, isLoading: loadingRounds, isError: roundsError } = useQuery({
    queryKey: ["rounds", screeningId],
    queryFn: () => listRounds(screeningId),
    enabled: open,
  });

  const published = rounds?.find((r) => r.status === "published") ?? null;

  // The summary a list returns carries no entry_stage, and InvitePanel needs
  // it to know which candidates are eligible. One extra fetch, only once a
  // published round is actually found.
  const { data: round, isLoading: loadingRound } = useQuery({
    queryKey: ["round", published?.id],
    queryFn: () => getRound(published!.id),
    enabled: open && published !== null,
  });

  const loading = loadingRounds || (published !== null && loadingRound);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite candidates to the interview round</DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-[#737373]">Loading the published round...</p>
        )}

        {!loading && roundsError && (
          <p className="text-sm text-red-600">
            Could not load this screening's rounds. Try again in a moment.
          </p>
        )}

        {!loading && !roundsError && published === null && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs leading-relaxed text-amber-800">
              No round has been published for this screening yet. Publishing a round is
              what makes it available to candidates, so there is nothing to invite anyone
              to until then. Open the interview round to author and publish one.
            </p>
          </div>
        )}

        {!loading && round && (
          <InvitePanel
            screeningId={screeningId}
            entryStage={round.entry_stage}
            ready
            canWrite={canWrite}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
