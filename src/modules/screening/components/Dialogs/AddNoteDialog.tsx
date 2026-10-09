import { useState } from "react";
import { toast } from "sonner";
import { useAddNoteMutation } from "@/modules/screening/hooks/shared/notes.hook";
import { Loader2, NotebookPen } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog";

interface AddNoteDialogProps {
    screeningId: string;
    resumeId: string;
    onViwAllNotes: (resumeId:string) => void;
}

const MAX_TEXT = 500;

export default function AddNoteDialog({
    screeningId,
    resumeId,
    onViwAllNotes,
}: AddNoteDialogProps) {

    const [open, setOpen] = useState(false);
    const [note, setNote] = useState("");
    const addNoteMutation = useAddNoteMutation();


    // const share = useMutation({
    //     mutationFn: () =>
    //         shareCandidateReport(screeningId, resumeId, {
    //             emails: parsed,
    //             note: note.trim() || undefined,
    //         }),

    //     onSuccess: (res) => {
    //         if (res.failed.length) {
    //             toast.warning(
    //                 `Sent to ${res.sent.length}. Could not send to: ${res.failed.join(", ")}`,
    //             );
    //         } else {
    //             toast.success(
    //                 `Report sent to ${
    //                     res.sent.length === 1
    //                         ? res.sent[0]
    //                         : `${res.sent.length} people`
    //                 }`,
    //             );
    //         }

    //         setEmails("");
    //         setNote("");
    //         onClose();
    //     },

    //     onError: (e: unknown) =>
    //         toast.error(
    //             e instanceof Error
    //                 ? e.message
    //                 : "Could not share the report",
    //         ),
    // });

    const tooMany = note.length > MAX_TEXT;

    return (
        <Dialog
            open={open}
            onOpenChange={(isOpen) => {
                setOpen(isOpen);
            }}
        >
            <DialogTrigger asChild>
                    <NotebookPen className="text-[#A0A0A0] hover:text-[#C85A17] cursor-pointer"  size={16} /> 
            </DialogTrigger>

            <DialogContent
                showCloseButton={false}
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
                    <DialogTitle className="flex justify-between text-base font-semibold text-[#0F0F0F]">
                        Add note


                        <span className="
                        text-xs font-medium
                        text-[#404040]
                        hover:text-[#0F0F0F]
                        cursor-pointer
                        underline
                        italic
                    "
                            onClick={()=>{onViwAllNotes(resumeId); setOpen(false)}}
                        >View All Notes</span>
                    </DialogTitle>

                    <DialogDescription className="mt-1 text-xs leading-relaxed text-[#737373]">

                    </DialogDescription>
                </DialogHeader>

                <textarea
                    value={note}
                    disabled={addNoteMutation.isPending}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={MAX_TEXT}
                    autoFocus
                    placeholder="Candidate has been contacted and is awaiting response."
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
                    {tooMany ? `Note cannot exceed ${MAX_TEXT} characters` : `${note.length}/${MAX_TEXT} characters`}
                </p>


                <div className="mt-4 flex items-center justify-end gap-3">

                    <button
                        onClick={() => setOpen(false)}
                        disabled={addNoteMutation.isPending}
                        className="
                            h-9 px-4
                            text-sm font-medium
                            text-[#404040]
                            hover:text-[#0F0F0F]
                            cursor-pointer
                        "
                    >
                        Cancel
                    </button>

                    <button
                        onClick={() => {
                            const trimmedNote = note.trim();
                            if (!trimmedNote || tooMany || addNoteMutation.isPending) return;

                            addNoteMutation.mutate(
                                { screeningId, resumeId, note: trimmedNote },
                                {
                                    onSuccess: () => {
                                        setNote("");
                                        setOpen(false);
                                        toast.success("Note added");
                                    },
                                    onError: (error) =>
                                        toast.error(error instanceof Error ? error.message : "Could not add note"),
                                },
                            );
                        }}
                        disabled={!note.trim() || tooMany || addNoteMutation.isPending}
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
                            cursor-pointer
                        "
                    >
                        {addNoteMutation.isPending ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Adding…
                            </span>
                        ) : (
                            "Add"
                        )}
                    </button>

                </div>
            </DialogContent>

        </Dialog>
    );
}