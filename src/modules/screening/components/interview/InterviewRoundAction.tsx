import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Copy } from "lucide-react";
import { interviewScoreClass, type InterviewCellState } from "./interviewCellState";

interface InterviewRoundActionProps {
  view: InterviewCellState;
  screeningId: string;
  // "compact" fits a table cell; "full" is the First Round tab, with sentences.
  variant: "compact" | "full";
  onInvite: () => void;
  inviting: boolean;
}

const BUTTON =
  "rounded-lg border border-[#0F0F0F] bg-[#0F0F0F] px-2 py-1 text-[11px] font-medium text-white " +
  "transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40";
const SECONDARY =
  "inline-flex items-center gap-1 rounded-lg border border-[#D4D4D4] bg-white px-2 py-1 text-[11px] " +
  "font-medium text-[#404040] transition-colors hover:bg-[#F5F3EE]";

const FULL_COPY: Record<string, string> = {
  "setup-round": "There is no interview round for this job yet. Set one up to invite candidates.",
  "publish-round": "The interview round is still a draft. Publish it to invite candidates.",
  invite: "This candidate has finished the screening round and can be invited.",
  invited: "Invite sent. The candidate has not finished the interview round yet.",
  "read-only": "This candidate can be invited by someone with edit access.",
};

function CopyLink({ link, label }: { link: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={link}
      className={SECONDARY}
      onClick={() =>
        navigator.clipboard.writeText(link).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => toast.error("Could not copy the link."),
        )
      }
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : label}
    </button>
  );
}

function Control({ view, screeningId, onInvite, inviting }: Omit<InterviewRoundActionProps, "variant">) {
  switch (view.kind) {
    case "invited":
      return <CopyLink link={view.link} label="Copy invite link" />;
    case "setup-round":
      return (
        <Link to="/screenings/$id/interview" params={{ id: screeningId }} className={SECONDARY}>
          Set up round
        </Link>
      );
    case "publish-round":
      return (
        <Link to="/screenings/$id/rounds/$roundId" params={{ id: screeningId, roundId: view.roundId }}
          className={SECONDARY}>
          Publish round
        </Link>
      );
    case "invite":
      return (
        <button type="button" onClick={onInvite} disabled={inviting} className={BUTTON}>
          {inviting ? "Inviting..." : "Invite"}
        </button>
      );
    default:
      return null;
  }
}

/** What the interview round offers for one candidate, in a row or in the First Round tab. */
export function InterviewRoundAction(props: InterviewRoundActionProps) {
  const { view, variant } = props;

  if (view.kind === "loading") {
    return <span className="text-xs text-[#D4D4D4]">{variant === "full" ? "Loading…" : "…"}</span>;
  }
  if (view.kind === "scored") {
    return (
      <span
        title={`Interview round: ${view.score.toFixed(1)}${view.isPartial ? " (partial)" : ""}`}
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${interviewScoreClass(view.score)}`}
      >
        {Math.round(view.score)}{view.isPartial ? " (partial)" : ""}
      </span>
    );
  }
  if (view.kind === "not-eligible") {
    return variant === "full" ? (
      <p className="text-sm text-[#737373]">{view.reason}</p>
    ) : (
      <span className="text-[11px] text-[#A3A3A3]" title={view.reason}>{view.label}</span>
    );
  }
  if (variant === "compact") {
    return view.kind === "read-only"
      ? <span className="text-xs text-[#D4D4D4]" title="Read-only access">&mdash;</span>
      : <Control {...props} />;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#737373]">{FULL_COPY[view.kind]}</p>
      <Control {...props} />
    </div>
  );
}
