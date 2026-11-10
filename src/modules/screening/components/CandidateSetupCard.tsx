import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { setRequirements } from "@/lib/roundApi";
import { ApiError } from "@/lib/api";
import { useAccount } from "@/hooks/useAccount";
import {
  useRoundWriteLock,
  ROUND_WRITE_BUSY_MESSAGE,
} from "@/modules/screening/hooks/round/useRoundWriteLock";
import type { RoundRequirements, RoundResponse } from "@/types";

type Toggle = "camera" | "screen_share";

interface CandidateSetupCardProps {
  roundId: string;
  round: RoundResponse;
}

// Step one of authoring a round: what the candidate's browser must provide.
// Decided here, with switches, never in the chat: the assistant has no tool
// for it. The chat and publish stay locked until Confirm is pressed, and the
// server enforces that (409 on chat, 422 on publish), so this card is the
// only way forward.
//
// Every interaction is a save. A toggle writes camera and screen share as
// they now stand; Confirm writes `confirmed`. Saves go through the same
// /tool-calls endpoint an inline question edit uses and register with the
// same write lock, since every surface on this screen writes the one round
// row.
export default function CandidateSetupCard({ roundId, round }: CandidateSetupCardProps) {
  const { canWrite } = useAccount();
  const queryClient = useQueryClient();
  const { isBlocked, setBusy } = useRoundWriteLock();

  const isFrozen = round.status !== "draft";
  const otherWriteInFlight = isBlocked("setup");

  const save = useMutation({
    mutationFn: (next: RoundRequirements) => setRequirements(roundId, next),
    onSuccess: (updated) => {
      queryClient.setQueryData(["round", roundId], updated);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ["round", roundId] });
      }
      toast.error(err instanceof Error ? err.message : "Could not save the candidate setup.");
    },
  });

  useEffect(() => {
    setBusy("setup", save.isPending);
  }, [save.isPending, setBusy]);

  return (
    <CandidateSetupForm
      requirements={round.requirements}
      frozen={isFrozen}
      disabled={isFrozen || !canWrite || otherWriteInFlight || save.isPending}
      saving={save.isPending}
      notice={otherWriteInFlight && !isFrozen && canWrite ? ROUND_WRITE_BUSY_MESSAGE : null}
      onToggle={(field, value) => save.mutate({ ...round.requirements, [field]: value })}
      onConfirm={() => save.mutate({ ...round.requirements, confirmed: true })}
    />
  );
}

interface CandidateSetupFormProps {
  requirements: RoundRequirements;
  disabled: boolean;
  saving: boolean;
  // Published or archived: the settings are a record now, with nothing to
  // confirm. A round published before this card existed was never
  // confirmed, and must not show a confirm button it cannot use.
  frozen?: boolean;
  notice?: string | null;
  onToggle: (field: Toggle, value: boolean) => void;
  onConfirm: () => void;
}

// The card itself, free of hooks so it renders in a static-markup test.
export function CandidateSetupForm({
  requirements,
  disabled,
  saving,
  frozen = false,
  notice = null,
  onToggle,
  onConfirm,
}: CandidateSetupFormProps) {
  const { confirmed } = requirements;
  const description = frozen
    ? "What the candidate's browser must provide. This round is published and cannot change."
    : confirmed
      ? "What the candidate's browser must provide. Changes save as you make them."
      : "Decide what the candidate's browser must provide. The chat opens once you confirm.";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onConfirm();
      }}
      className="rounded-2xl border border-[#E8E5DF] bg-white p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#0F0F0F]">Candidate setup</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">{description}</p>
        </div>
        {confirmed && !frozen && (
          <span className="shrink-0 rounded-full border border-[#0F0F0F20] bg-[#F5F3EE] px-2.5 py-1 text-xs text-[#0F0F0F]">
            Confirmed
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <SetupToggle
          id="setup-camera"
          label="Camera required"
          hint="The candidate turns on their camera before the interview starts."
          checked={requirements.camera}
          disabled={disabled}
          onChange={(value) => onToggle("camera", value)}
        />
        <SetupToggle
          id="setup-screen-share"
          label="Screen share required"
          hint="The candidate shares their screen for the coding questions."
          checked={requirements.screen_share}
          disabled={disabled}
          onChange={(value) => onToggle("screen_share", value)}
        />
      </div>

      {notice && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          {notice}
        </p>
      )}

      {!confirmed && !frozen && (
        <button
          type="submit"
          disabled={disabled}
          className="mt-3 h-9 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-4 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving..." : "Confirm setup"}
        </button>
      )}
    </form>
  );
}

interface SetupToggleProps {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}

function SetupToggle({ id, label, hint, checked, disabled, onChange }: SetupToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex flex-1 cursor-pointer items-start gap-3 rounded-xl border border-[#E8E5DF] bg-[#FAFAF8] px-3 py-2.5 has-disabled:cursor-not-allowed"
    >
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-[#0F0F0F]">{label}</span>
        <span className="text-xs leading-relaxed text-[#737373]">{hint}</span>
      </span>
    </label>
  );
}
