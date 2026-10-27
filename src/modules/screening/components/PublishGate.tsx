import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { publishRound, cloneRound } from "@/lib/roundApi";
import { ApiError } from "@/lib/api";
import { useAccount } from "@/hooks/useAccount";
import {
  useRoundWriteLock,
  ROUND_WRITE_BUSY_MESSAGE,
} from "@/modules/screening/hooks/round/useRoundWriteLock";
import type { RoundResponse } from "@/types";

interface PublishGateProps {
  screeningId: string;
  roundId: string;
  round: RoundResponse;
}

// The publish gate: a draft round shows the publish button (disabled with
// a reason until it is actually publishable), a published round shows the
// invite panel and a clone action, and an archived round (superseded by a
// later published round on the same screening) is read-only with nothing
// left to do here.
//
// Registers "publish" with the same RoundWriteLockProvider AuthoringChat
// and RoundView's inline edit already use (see
// hooks/round/useRoundWriteLock.tsx) — a chat turn or inline edit in
// flight when Publish is clicked would race the same unguarded
// read-mutate-UPDATE the other two surfaces already coordinate around.
export default function PublishGate({ screeningId, roundId, round }: PublishGateProps) {
  const { canWrite } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isBlocked, setBusy } = useRoundWriteLock();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allocated = round.questions.reduce((sum, q) => sum + q.allocated_minutes, 0);
  const target = round.total_minutes - round.overhead_minutes;
  const hasQuestions = round.questions.length > 0;
  const budgetSatisfied = allocated === target;
  const otherWriteInFlight = isBlocked("publish");

  const publishMutation = useMutation({
    mutationFn: () => publishRound(roundId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["round", roundId], updated);
      setConfirmOpen(false);
      toast.success("Round published. You can now invite candidates.");
    },
    onError: (err: unknown) => {
      // 409 means someone else (or this user, in another tab) published it
      // first, possibly while this confirmation dialog was open. There is
      // no retry that makes sense here: refetch so the screen shows the new
      // reality (published, invite panel, no more publish button) instead
      // of leaving a stale confirmation dialog open on a decision that has
      // already been made.
      if (err instanceof ApiError && err.status === 409) {
        setConfirmOpen(false);
        queryClient.invalidateQueries({ queryKey: ["round", roundId] });
        toast.error("This round was already published.");
        return;
      }
      // 422 (budget/no-questions) or anything else: leave the dialog open
      // so the message renders next to the button the hiring manager just
      // pressed, the same disable-rather-than-hide pattern as everywhere
      // else on this screen.
    },
  });

  const cloneMutation = useMutation({
    mutationFn: () => cloneRound(roundId),
    onSuccess: (newRound) => {
      queryClient.setQueryData(["round", newRound.id], newRound);
      // The clone adds a row to this screening's round list. Without this,
      // InterviewConfig's resolver can still be sitting on a cached, now
      // stale ["rounds", screeningId] list for up to the 5 minute staleTime.
      // See final review item 3.
      queryClient.invalidateQueries({ queryKey: ["rounds", newRound.screening_id] });
      toast.success("Cloned into a new draft.");
      navigate({
        to: "/screenings/$id/rounds/$roundId",
        params: { id: newRound.screening_id, roundId: newRound.id },
      });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not clone this round.");
    },
  });

  // Mirrors sendTurn/saveMutation's own registration in AuthoringChat and
  // RoundView: the flag clears automatically on success OR error, because a
  // settled mutation is no longer "in flight" either way.
  useEffect(() => {
    setBusy("publish", publishMutation.isPending);
  }, [publishMutation.isPending, setBusy]);

  if (round.status === "published") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4">
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Published</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#737373]">
            This round is frozen and can no longer be edited. Clone it to make changes; the
            clone starts as a new editable draft with the same questions.
          </p>
          {canWrite && (
            <button
              type="button"
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isPending}
              className="mt-3 h-8 rounded-lg border border-[#D4D4D4] bg-white px-3 text-xs font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cloneMutation.isPending ? "Cloning..." : "Clone to revise"}
            </button>
          )}
          {/* Inviting lives on the screening page, not here. This screen is
              for authoring a round; choosing who sits it is done where the
              candidate list actually is. */}
          <p className="mt-3 text-xs leading-relaxed text-[#737373]">
            Candidates can now be invited to this round from the screening page.
          </p>
        </div>
      </div>
    );
  }

  if (round.status === "archived") {
    return (
      <div className="rounded-2xl border border-[#E8E5DF] bg-[#FAFAF8] p-4">
        <p className="text-xs leading-relaxed text-[#737373]">
          This round is archived: a newer round has since been published for this screening.
          It is read-only and can no longer be published or cloned from here.
        </p>
      </div>
    );
  }

  // draft
  const blockingReason = !hasQuestions
    ? "Add at least one question before publishing."
    : !budgetSatisfied
      ? "The allocation does not add up to the round's time budget yet. Ask the assistant to rebalance."
      : null;
  const disabled =
    !canWrite || blockingReason !== null || otherWriteInFlight || publishMutation.isPending;

  return (
    <div className="rounded-2xl border border-[#E8E5DF] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Publish</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
            Freezes this round and unlocks candidate invites. Cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={disabled}
          className="h-9 shrink-0 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Publish round
        </button>
      </div>

      {!canWrite && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          Read-only: you can view this round but not publish it.
        </p>
      )}

      {canWrite && blockingReason && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          {blockingReason}
        </p>
      )}

      {canWrite && !blockingReason && otherWriteInFlight && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          {ROUND_WRITE_BUSY_MESSAGE}
        </p>
      )}

      <PublishConfirmDialog
        open={confirmOpen}
        round={round}
        allocated={allocated}
        target={target}
        isPending={publishMutation.isPending}
        blockedReason={blockingReason ?? (otherWriteInFlight ? ROUND_WRITE_BUSY_MESSAGE : null)}
        errorMessage={
          publishMutation.isError && !(publishMutation.error instanceof ApiError && publishMutation.error.status === 409)
            ? publishMutation.error instanceof Error
              ? publishMutation.error.message
              : "Could not publish this round."
            : null
        }
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (blockingReason || otherWriteInFlight || publishMutation.isPending) return;
          publishMutation.mutate();
        }}
      />
    </div>
  );
}

interface PublishConfirmDialogProps {
  open: boolean;
  round: RoundResponse;
  allocated: number;
  target: number;
  isPending: boolean;
  // Non-null when the round stopped being publishable while this dialog
  // was open: a chat turn can land at any moment and leave the budget
  // unsatisfied. The dialog reads the same live round the gate does, so
  // the numbers above stay honest either way, but the Confirm button has
  // to follow them or it sends a call the backend will only refuse.
  blockedReason: string | null;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

// The last screen before an irreversible action. Every number a hiring
// manager needs to decide (question count, allocation against the time
// budget, camera/screen-share requirements) is on this one screen, so
// there is nothing to scroll back to RoundView for.
function PublishConfirmDialog({
  open,
  round,
  allocated,
  target,
  isPending,
  blockedReason,
  errorMessage,
  onCancel,
  onConfirm,
}: PublishConfirmDialogProps) {
  const count = round.questions.length;
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !isPending) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish this round?</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-[#E8E5DF] bg-[#FAFAF8] p-4 text-sm text-[#0F0F0F]">
          <p>
            {count} question{count === 1 ? "" : "s"} &middot; {allocated} of {target} minutes
            allocated &middot; {round.total_minutes} minutes total
          </p>
          <p className="mt-1.5">
            Camera: {round.requirements.camera ? "required" : "not required"} &middot; Screen
            share: {round.requirements.screen_share ? "required" : "not required"}
          </p>
        </div>

        <p className="text-sm leading-relaxed text-[#404040]">
          Publishing freezes this round: no further chat and no more edits. Candidates can be
          invited immediately after. This cannot be undone; clone the round later if you need
          to make changes.
        </p>

        {blockedReason && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs leading-relaxed text-amber-800">{blockedReason}</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs leading-relaxed text-red-700">{errorMessage}</p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="h-9 rounded-lg border border-[#D4D4D4] bg-white px-4 text-sm font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending || blockedReason !== null}
            className="h-9 rounded-lg border border-[#0F0F0F] bg-[#0F0F0F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Publishing..." : "Publish round"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
