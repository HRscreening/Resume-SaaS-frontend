import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addNote, getNotes } from "@/modules/screening/apis/notes";
import { NoteQueryKeys } from "@/modules/screening/queryKeys";

export function useNotesQuery({
    screeningId,
    resumeId,
}: {
    screeningId: string;
    resumeId: string;
}) {
    return useQuery({
        queryKey: NoteQueryKeys.getNotes(screeningId, resumeId),
        queryFn: () => getNotes(screeningId, resumeId),
        enabled: Boolean(screeningId && resumeId),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
}

export function useAddNoteMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            screeningId,
            resumeId,
            note,
        }: {
            screeningId: string;
            resumeId: string;
            note: string;
        }) => addNote(screeningId, resumeId, note),
        onSuccess: (_data, { screeningId, resumeId }) => {
            return queryClient.invalidateQueries({
                queryKey: NoteQueryKeys.getNotes(screeningId, resumeId),
            });
        },
    });
}
