import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { shareCandidateReport } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";


interface ShareReportDialogProps {
    open: boolean;
    onClose: () => void;
    onShare: (emails: string[], note?: string) => void;
    isPending: boolean;
}

const MAX_RECIPIENTS = 5;

export default function MultiShareDialog({
    open,
    onClose,
    onShare,
    isPending=false,
}: ShareReportDialogProps) {
    const [emails, setEmails] = useState("");
    const [note, setNote] = useState("");
    
    //TODO: Use Zod to validate email addresses and filter out invalid ones
    const parsed = emails
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);

    const tooMany = parsed.length > MAX_RECIPIENTS;


    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    setEmails("");
                    setNote("");
                    onClose();
                }
            }}
        >
            <DialogContent
                className="
                    w-full max-w-md
                    rounded-2xl
                    border border-[#E8E5DF]
                    bg-white
                    p-5
                    shadow-xl
                    gap-0
                "
                onPointerDownOutside={(event) => {
                    event.preventDefault();
                }}
                onInteractOutside={(event) => {
                    event.preventDefault();
                }}
            >
                <DialogHeader className="space-y-0 text-left">
                    <DialogTitle className="text-base font-semibold text-[#0F0F0F]">
                        Share report
                    </DialogTitle>

                    <DialogDescription className="mt-1 text-xs leading-relaxed text-[#737373]">
                        Emails the resume score and voice screening
                        as a PDF. Replies come back to you.
                    </DialogDescription>
                </DialogHeader>

                <label className="mt-4 block text-xs font-medium text-[#404040]">
                    Send to
                </label>

                <textarea
                    value={emails}
                    onChange={(e) => setEmails(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder="hiring.manager@company.com, panel@company.com"
                    className="
                        mt-1 w-full resize-none
                        rounded-xl
                        border border-[#D4D4D4]
                        px-3 py-2
                        text-sm text-[#0F0F0F]
                        placeholder:text-[#A3A3A3]
                        focus:border-[#0F0F0F]
                        focus:outline-none
                    "
                />

                <p
                    className={`mt-1 text-[11px] ${tooMany
                            ? "text-red-600"
                            : "text-[#737373]"
                        }`}
                >
                    {tooMany
                        ? `At most ${MAX_RECIPIENTS} people at once.`
                        : `Separate multiple addresses with a comma. Up to ${MAX_RECIPIENTS}.`}
                </p>

                <label className="mt-3 block text-xs font-medium text-[#404040]">
                    Note{" "}
                    <span className="font-normal text-[#737373]">
                        (optional)
                    </span>
                </label>

                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="e.g. shortlisting for Tuesday's panel"
                    className="
                        mt-1 w-full
                        rounded-xl
                        border border-[#D4D4D4]
                        px-3 py-2
                        text-sm text-[#0F0F0F]
                        placeholder:text-[#A3A3A3]
                        focus:border-[#0F0F0F]
                        focus:outline-none
                    "
                />

                <p className="mt-4 rounded-lg bg-[#FFFAEB] px-3 py-2 text-[11px] leading-relaxed text-[#B54708]">
                    The report contains the candidate&rsquo;s contact details,
                    pay expectations and quotes from their interview. A sent
                    PDF cannot be recalled.
                </p>

                <div className="mt-4 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="
                            h-9 px-4
                            text-sm font-medium
                            text-[#404040]
                            hover:text-[#0F0F0F]
                        "
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => {
                            if (tooMany) {
                                toast.error(
                                    `You can only share with up to ${MAX_RECIPIENTS} people at once.`
                                );
                                return;
                            }
                            onShare(parsed, note);
                        }

                        }
                        className="
                            h-9
                            rounded-xl
                            border border-[#0F0F0F]
                            bg-[#0F0F0F]
                            px-5
                            text-sm font-medium text-white
                            transition-colors
                            hover:bg-[#262626]
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {isPending
                            ? "Sending…"
                            : "Send report"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}