import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackLink } from "@/components/layout/BackLink";
import { listRounds, createRound } from "@/lib/roundApi";
import { ApiError } from "@/lib/api";
import { useAccount } from "@/hooks/useAccount";

// This file used to be the whole Round 1 browser interview screen: mode
// selector, timing inputs, a hand-rolled question-plan editor, and the
// invite panel. All of that is superseded by the round authoring screen
// (RoundAuthoring.tsx: a chat panel plus a live question/budget view) and
// PublishGate.tsx (publish, invite, clone) — see
// .superpowers/sdd/2026-09-28-interview-round-authoring/task-14-brief.md.
//
// What is left here is a resolver, kept at this file's original route
// (/screenings/$id/interview, registered in App.tsx as
// interviewConfigRoute) so the "Interview round" button on the screening
// page (screening.tsx) keeps working without needing a round id it
// doesn't have. A round now lives at /screenings/$id/rounds/$roundId, so
// this page's only job is: find the screening's most recent round and
// redirect to it, or create one first if this screening has none yet.
export default function InterviewConfigPage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite } = useAccount();
  // Guards against firing a second create while the first is still in
  // flight (StrictMode double-invokes effects, and `rounds` itself doesn't
  // change between those two invocations to naturally short-circuit it).
  const creating = useRef(false);

  const {
    data: rounds,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["rounds", id],
    queryFn: () => listRounds(id),
  });

  const createMutation = useMutation({
    mutationFn: () => createRound(id, "Interview round"),
    onSuccess: (round) => {
      queryClient.setQueryData(["round", round.id], round);
      // Without this, the global 5 minute staleTime means a return to this
      // resolver route within that window re-reads the cached, now-empty
      // ["rounds", id] list and creates a second round. See final review
      // item 3.
      queryClient.invalidateQueries({ queryKey: ["rounds", id] });
      navigate({
        to: "/screenings/$id/rounds/$roundId",
        params: { id, roundId: round.id },
        replace: true,
      });
    },
    onError: () => {
      creating.current = false;
    },
  });

  useEffect(() => {
    if (!rounds) return;
    if (rounds.length > 0) {
      // Newest first (see GET .../rounds's own contract): landing on the
      // most recently touched round is the natural thing whether that
      // means resuming an in-progress draft or opening what was just
      // cloned from a published one.
      navigate({
        to: "/screenings/$id/rounds/$roundId",
        params: { id, roundId: rounds[0].id },
        replace: true,
      });
      return;
    }
    if (!canWrite || creating.current) return;
    creating.current = true;
    createMutation.mutate();
    // createMutation is intentionally omitted: it is a new object each
    // render, and re-running this effect for that reason alone is guarded
    // against by `creating` regardless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, canWrite, id, navigate]);

  const message = isError
    ? "Could not load this screening's interview rounds."
    : createMutation.isError
      ? createMutation.error instanceof ApiError
        ? createMutation.error.message
        : "Could not create an interview round."
      : !isLoading && rounds && rounds.length === 0 && !canWrite
        ? "No interview round has been created yet. This requires owner access."
        : "Opening the interview round...";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <BackLink to="/screenings/$id" params={{ id }} label="Screening" />
      <p className="mt-6 text-sm text-[#404040]">{message}</p>
      {createMutation.isError && canWrite && (
        <button
          type="button"
          onClick={() => {
            creating.current = true;
            createMutation.mutate();
          }}
          className="mt-3 h-9 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626]"
        >
          Try again
        </button>
      )}
    </div>
  );
}
