import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendChatTurn } from "@/lib/roundApi";
import { ApiError } from "@/lib/api";
import { ReadOnlyError } from "@/lib/accountSession";
import { useAccount } from "@/hooks/useAccount";
import {
  useRoundWriteLock,
  ROUND_WRITE_BUSY_MESSAGE,
} from "@/modules/screening/hooks/round/useRoundWriteLock";
import type { RoundResponse } from "@/types";

interface AuthoringChatProps {
  roundId: string;
  round: RoundResponse;
}

// The chat panel a hiring manager uses to build a round with the authoring
// AI. Round state (questions, budget, requirements — everything
// ChatTurnResponse.round carries) is deliberately NOT held in local
// component state here. It lives in the TanStack Query cache under
// ["round", roundId], the same key RoundAuthoring.tsx already queries with
// (see getRound there). A successful turn writes the fresh round straight
// into that cache entry via queryClient.setQueryData, so RoundAuthoring
// re-renders with the new state through its own subscription — no prop
// callback needed.
//
// Task 13's live round view should read the round the same way: useQuery
// with queryKey ["round", roundId]. TanStack Query dedupes the fetch (it's
// already populated by RoundAuthoring's query) and Task 13's component picks
// up every future update this panel writes, automatically. Do not thread the
// round through a prop chain into Task 13 — that would fork the state this
// component is careful to keep in one place.
//
// This component's own state is UI-local only: the composer draft (kept on
// a failed turn so the user never loses what they typed) and the in-flight
// mutation.
export default function AuthoringChat({ roundId, round }: AuthoringChatProps) {
  const { canWrite } = useAccount();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const { isBlocked, setBusy } = useRoundWriteLock();

  const isFrozen = round.status !== "draft";
  // A round-level write lock (see useRoundWriteLock): a chat turn, an
  // inline question edit (RoundView), and publish (PublishGate) all write
  // to the same round row with no per-write version check on the backend,
  // so one in flight while another lands would silently clobber whichever
  // wrote second. Named editInFlight for history, but isBlocked("chat") is
  // true whenever EITHER other surface is busy, not just an inline edit.
  const editInFlight = isBlocked("chat");
  const disabled = isFrozen || !canWrite || editInFlight;

  const sendTurn = useMutation({
    mutationFn: (message: string) => sendChatTurn(roundId, message),
    onSuccess: (data) => {
      // The whole round comes back, not just the reply: one turn can add
      // questions, rebalance every question's minutes, and change
      // requirements at once. Writing it into the shared cache entry is
      // what makes that visible everywhere the round is read.
      queryClient.setQueryData(["round", roundId], data.round);
      // Only clear the composer once the turn actually landed.
      setDraft("");
    },
    onError: (err) => {
      // A 409 means the round was published (or otherwise frozen) by
      // someone else since this page last loaded it. Refetch so the
      // composer disables itself and the frozen banner appears, instead of
      // leaving a live-looking composer that will 409 again on retry.
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["round", roundId] });
      }
    },
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [round.authoring_chat.length, sendTurn.isPending]);

  // Register this turn as a round write while it's in flight, under this
  // component's own key. Mirroring `isPending` (rather than setting it
  // inside onSuccess/onError) means the flag clears on either outcome
  // automatically, since a settled mutation is no longer "in flight" either
  // way.
  useEffect(() => {
    setBusy("chat", sendTurn.isPending);
  }, [sendTurn.isPending, setBusy]);

  function trySend() {
    const message = draft.trim();
    if (!message || disabled || sendTurn.isPending) return;
    sendTurn.mutate(message);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    trySend();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      trySend();
    }
  }

  const errorMessage = sendTurn.isError
    ? sendTurn.error instanceof ApiError
      ? sendTurn.error.status === 409
        ? "This round was published while you were away, so it can no longer be edited here. Clone it to keep going."
        : sendTurn.error.message
      : sendTurn.error instanceof ReadOnlyError
        ? sendTurn.error.message
        : "Could not reach the server. Your message is still here, try again."
    : null;

  return (
    <div className="flex flex-col rounded-2xl border border-[#E8E5DF] bg-white">
      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        style={{ minHeight: 320, maxHeight: 480 }}
      >
        {round.authoring_chat.length === 0 && !sendTurn.isPending && (
          <p className="text-sm text-[#737373]">
            Describe the role and what this round should assess. The assistant proposes
            questions and fits them to your time budget as you go.
          </p>
        )}
        {round.authoring_chat.map((msg, i) => (
          <ChatBubble key={i} role={msg.role} text={msg.text} />
        ))}
        {sendTurn.isPending && <ThinkingBubble />}
      </div>

      {isFrozen && (
        <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-amber-800">
            {round.status === "published"
              ? // Cloning lives in one place (PublishGate, below this panel):
                // a second button here duplicated the action under a
                // different label. See final review item 6.
                "This round is published and frozen. Clone it below to make changes."
              : "This round is archived and can no longer be edited."}
          </p>
        </div>
      )}

      {!canWrite && !isFrozen && (
        <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-amber-800">
            Read-only: you can view this conversation but not send messages.
          </p>
        </div>
      )}

      {editInFlight && !isFrozen && canWrite && (
        <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-amber-800">{ROUND_WRITE_BUSY_MESSAGE}</p>
        </div>
      )}

      {errorMessage && (
        <div className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-xs leading-relaxed text-red-700">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-[#E8E5DF] p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sendTurn.isPending}
          placeholder={
            isFrozen
              ? "This round is frozen."
              : "Describe the role, ask for changes, or request a rebalance..."
          }
          rows={2}
          aria-label="Message to the authoring assistant"
          className="min-h-0 flex-1 resize-none rounded-lg border border-[#D4D4D4] bg-white px-3 py-2 text-sm text-[#0F0F0F] transition-colors placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:outline-none disabled:bg-[#FAFAF8] disabled:text-[#A3A3A3]"
        />
        <button
          type="submit"
          disabled={disabled || sendTurn.isPending || !draft.trim()}
          className="h-9 shrink-0 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sendTurn.isPending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ role, text }: { role: string; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isUser ? "bg-[#0F0F0F] text-white" : "bg-[#F5F3EE] text-[#0F0F0F]"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

// Responses arrive whole (no streaming), and a turn can take several
// seconds while the AI makes up to a dozen tool calls server-side. This is
// the only signal the hiring manager gets that something is happening.
function ThinkingBubble() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="Assistant is thinking">
      <div className="flex items-center gap-1 rounded-2xl bg-[#F5F3EE] px-3.5 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A3A3A3] [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A3A3A3] [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A3A3A3]" />
      </div>
    </div>
  );
}
