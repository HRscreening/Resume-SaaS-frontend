import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { shareCandidateReport } from "@/lib/api";

interface ShareReportDialogProps {
  screeningId: string;
  resumeId: string;
  candidateName?: string | null;
  open: boolean;
  onClose: () => void;
}

const MAX_RECIPIENTS = 5;

/**
 * Share a candidate's resume + voice report by email, as a PDF attachment.
 *
 * The dialog states plainly what is being sent and to whom before it goes:
 * this puts a candidate's transcript quotes, pay expectations and contact
 * details outside the product, and a PDF cannot be recalled. That warning is
 * the point of the screen, not decoration on it.
 */
export function ShareReportDialog({
  screeningId, resumeId, candidateName, open, onClose,
}: ShareReportDialogProps) {
  const [emails, setEmails] = useState("");
  const [note, setNote] = useState("");

  // Split on the separators people actually paste from address books.
  const parsed = emails
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  const tooMany = parsed.length > MAX_RECIPIENTS;

  const share = useMutation({
    mutationFn: () => shareCandidateReport(screeningId, resumeId, {
      emails: parsed,
      note: note.trim() || undefined,
    }),
    onSuccess: (res) => {
      if (res.failed.length) {
        // Naming who failed matters: re-sending to everyone would mail the
        // report twice to people who already have it.
        toast.warning(
          `Sent to ${res.sent.length}. Could not send to: ${res.failed.join(", ")}`,
        );
      } else {
        toast.success(
          `Report sent to ${res.sent.length === 1 ? res.sent[0] : `${res.sent.length} people`}`,
        );
      }
      setEmails("");
      setNote("");
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not share the report"),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share candidate report"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[#E8E5DF] bg-white p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-[#0F0F0F]">Share report</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#737373]">
          Emails the resume score and voice screening for{" "}
          <span className="font-medium text-[#404040]">{candidateName || "this candidate"}</span>{" "}
          as a PDF. Replies come back to you.
        </p>

        <label className="mt-4 block text-xs font-medium text-[#404040]">
          Send to
        </label>
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={2}
          autoFocus
          placeholder="hiring.manager@company.com, panel@company.com"
          className="mt-1 w-full resize-none rounded-xl border border-[#D4D4D4] px-3 py-2 text-sm text-[#0F0F0F] placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:outline-none"
        />
        <p className={`mt-1 text-[11px] ${tooMany ? "text-red-600" : "text-[#737373]"}`}>
          {tooMany
            ? `At most ${MAX_RECIPIENTS} people at once.`
            : `Separate multiple addresses with a comma. Up to ${MAX_RECIPIENTS}.`}
        </p>

        <label className="mt-3 block text-xs font-medium text-[#404040]">
          Note <span className="font-normal text-[#737373]">(optional)</span>
        </label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          placeholder="e.g. shortlisting for Tuesday's panel"
          className="mt-1 w-full rounded-xl border border-[#D4D4D4] px-3 py-2 text-sm text-[#0F0F0F] placeholder:text-[#A3A3A3] focus:border-[#0F0F0F] focus:outline-none"
        />

        <p className="mt-4 rounded-lg bg-[#FFFAEB] px-3 py-2 text-[11px] leading-relaxed text-[#B54708]">
          The report contains the candidate&rsquo;s contact details, pay expectations
          and quotes from their interview. A sent PDF cannot be recalled.
        </p>

        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium text-[#404040] hover:text-[#0F0F0F]"
          >
            Cancel
          </button>
          <button
            onClick={() => share.mutate()}
            disabled={share.isPending || parsed.length === 0 || tooMany}
            className="h-9 rounded-xl border border-[#0F0F0F] bg-[#0F0F0F] px-5 text-sm font-medium text-white transition-colors hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {share.isPending ? "Sending…" : "Send report"}
          </button>
        </div>
      </div>
    </div>
  );
}
