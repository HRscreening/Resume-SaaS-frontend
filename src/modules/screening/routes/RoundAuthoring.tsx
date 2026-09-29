import { useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BackLink } from "@/components/layout/BackLink";
import { getRound } from "@/lib/roundApi";
import { ApiError } from "@/lib/api";
import AuthoringChat from "@/modules/screening/components/AuthoringChat";

// The interview round authoring screen: a hiring manager chats with an AI
// to build a round, then publishes it. This file is the page shell the
// route registers in App.tsx (/screenings/$id/rounds/$roundId) — it fetches
// the round and renders its current state. The chat panel (Task 12) and the
// live question/budget view (Task 13) mount here once built; publish/clone
// (Task 14) attach to the same round data this page already loads.
export default function RoundAuthoring() {
  const { id, roundId } = useParams({ strict: false }) as {
    id: string;
    roundId: string;
  };

  // ["round", roundId] is the shared cache key for this round: AuthoringChat
  // (Task 12) writes the post-turn round straight into this entry after
  // every chat turn, so this query re-renders with the new state without an
  // explicit refetch. Task 13's live round view should read the round with
  // this same queryKey rather than take it as a prop, so it too picks up
  // every update AuthoringChat writes.
  const {
    data: round,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["round", roundId],
    queryFn: () => getRound(roundId),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackLink to="/screenings/$id" params={{ id }} label="Screening" />

      {isLoading && (
        <p className="mt-6 text-sm text-[#404040]">Loading round...</p>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-600">
          {error instanceof ApiError && error.status === 404
            ? "This round could not be found."
            : error instanceof Error
              ? error.message
              : "Could not load this round."}
        </p>
      )}

      {round && (
        <div className="mt-6">
          <h1 className="text-xl font-semibold text-[#0F0F0F]">{round.title}</h1>
          <p className="mt-1 text-sm text-[#404040]">
            {round.status === "draft"
              ? "Draft. Questions and budget appear as you chat with the authoring assistant."
              : round.status === "published"
                ? "Published and frozen. Invite candidates or clone to revise."
                : "Archived."}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {round.questions.length} question{round.questions.length === 1 ? "" : "s"} ·{" "}
            {round.questions.reduce((sum, q) => sum + q.allocated_minutes, 0)}/{round.total_minutes} min allocated
          </p>

          {/* Task 13 mounts the live question/budget view here, beside the
              chat panel — it should read this same ["round", roundId] query
              rather than take the round as a prop from this component. */}
          <div className="mt-4">
            <AuthoringChat roundId={roundId} round={round} />
          </div>
        </div>
      )}
    </div>
  );
}
