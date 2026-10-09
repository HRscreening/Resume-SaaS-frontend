import { useState } from "react";
import { Loader2, MessageSquare, Plus } from "lucide-react";
import { useAddNoteMutation, useNotesQuery } from "@/modules/screening/hooks/shared/notes.hook";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NotesTabProps {
    screeningId: string;
    resumeId: string;
}

export default function NotesTab({ screeningId, resumeId }: NotesTabProps) {
    const { user } = useAuth();
    const currentUserId = user?.id ?? "unknown_user_id";
    const [note, setNote] = useState("");
    const notesQuery = useNotesQuery({ screeningId, resumeId });
    const addNoteMutation = useAddNoteMutation();
    const notes = notesQuery.data ?? {};

    const formatDate = (dateString: string) => {
        const date = new Date(`${dateString}T00:00:00`);
        const today = new Date();
        const yesterday = new Date();

        yesterday.setDate(today.getDate() - 1);

        const isSameDay = (first: Date, second: Date) =>
            first.getFullYear() === second.getFullYear() &&
            first.getMonth() === second.getMonth() &&
            first.getDate() === second.getDate();

        if (isSameDay(date, today)) return "Today";
        if (isSameDay(date, yesterday)) return "Yesterday";

        return new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
        }).format(date);
    };

    const formatTime = (dateString: string) =>
        new Intl.DateTimeFormat(undefined, {
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(dateString));

    const handleAddNote = () => {
        const trimmedNote = note.trim();
        if (!trimmedNote || addNoteMutation.isPending) return;

        addNoteMutation.mutate(
            { screeningId, resumeId, note: trimmedNote },
            {
                onSuccess: () => setNote(""),
                onError: (error) =>
                    toast.error(error instanceof Error ? error.message : "Could not add note"),
            },
        );
    };

    const groupedEntries = Object.entries(notes).sort(([first], [second]) =>
        second.localeCompare(first),
    );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
            <div className="sticky top-0 z-10 shrink-0 border-b border-[#E8E5DF] bg-white px-1 pb-4">
                <div className="flex items-center gap-2 rounded-xl border border-[#D4D4D4] bg-[#FAF9F7] p-1.5">
                    <textarea
                        value={note}
                        disabled={addNoteMutation.isPending}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Add a note..."
                        aria-label="New note"
                        maxLength={500}
                        rows={1}
                        className="min-h-[34px] max-h-24 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-5 text-[#262626] outline-none placeholder:text-[#A0A0A0]"
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                handleAddNote();
                            }
                        }}
                    />
                    <button
                        type="button"
                        aria-label="Add note"
                        disabled={!note.trim() || addNoteMutation.isPending}
                        onClick={handleAddNote}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0F0F0F] text-white transition-colors hover:bg-[#C85A17] disabled:cursor-not-allowed disabled:bg-[#E8E5DF] disabled:text-[#A0A0A0]"
                    >
                        {addNoteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                    </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between px-2 text-[11px] text-[#A0A0A0]">
                    <span>Press Enter to add a note</span>
                    <span>{note.length}/500</span>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-1 py-4 pr-2">
                {notesQuery.isLoading ? (
                    <div className="flex h-full min-h-48 items-center justify-center text-sm text-[#737373]">
                        <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading notes…
                        </span>
                    </div>
                ) : notesQuery.isError ? (
                    <div className="flex h-full min-h-48 items-center justify-center text-center text-sm text-red-600">
                        Could not load notes.
                    </div>
                ) : groupedEntries.length === 0 ? (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3EE] text-[#A0A0A0]">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium text-[#404040]">
                            No notes yet
                        </p>
                        <p className="mt-1 max-w-xs text-xs text-[#A0A0A0]">
                            Add the first note to start a conversation with your team.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-7">
                        {groupedEntries.map(([date, dayNotes]) => (
                            <section key={date}>
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-[#E8E5DF]" />
                                    <span className="rounded-full bg-[#F5F3EE] px-3 py-1 text-[11px] font-medium text-[#737373]">
                                        {formatDate(date)}
                                    </span>
                                    <div className="h-px flex-1 bg-[#E8E5DF]" />
                                </div>

                                <div className="space-y-3">
                                    {dayNotes.map((item, index) => (
                                        <div
                                            key={`${item.created_at}-${index}`}
                                            className={`flex ${
                                                item.creator_id === currentUserId
                                                    ? "justify-end"
                                                    : "justify-start"
                                            }`}
                                        >
                                            <div className="max-w-[88%] sm:max-w-[75%]">
                                                <div
                                                    className={`rounded-2xl px-4 py-3 shadow-[0_1px_2px_rgba(15,15,15,0.03)] ${
                                                        item.creator_id === currentUserId
                                                            ? "rounded-br-md border border-[#F2D2B5] bg-[#FBF1E7] text-[#6F3518]"
                                                            : "rounded-bl-md border border-[#E3E0DA] bg-[#F5F3EE] text-[#404040]"
                                                    }`}
                                                >
                                                    <p
                                                        className={`whitespace-pre-wrap break-words text-sm leading-6 ${
                                                            item.creator_id === currentUserId
                                                                ? "text-[#6F3518]"
                                                                : "text-[#404040]"
                                                        }`}
                                                    >
                                                        {item.note}
                                                    </p>
                                                    <div
                                                        className={`mt-2 flex items-center gap-2 text-[11px] ${
                                                            item.creator_id === currentUserId
                                                                ? "justify-end text-[#B9784D]"
                                                                : "justify-start text-[#8A8884]"
                                                        }`}
                                                    >
                                                        {item.creator_id !== currentUserId && (
                                                            <>
                                                                <span className="font-medium text-[#686662]">
                                                                    {item.added_by}
                                                                </span>
                                                                <span aria-hidden="true">•</span>
                                                            </>
                                                        )}
                                                        <span>{formatTime(item.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
