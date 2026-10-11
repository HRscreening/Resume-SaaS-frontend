import { request, requestFormData } from "@/lib/api";
import { Note } from "@/modules/screening/types/screening.type";

export type GroupedNotes = Record<string, Note[]>;

export const getNotes = async (screening_id: string, resume_id: string): Promise<GroupedNotes | null> => {
    return request<GroupedNotes | null>(
        `/api/v1/screenings/${screening_id}/get-notes/${resume_id}`,
    );
}

export const addNote = async (screening_id: string, resume_id: string, note: string): Promise<Note | null> => {
    const formData = new FormData();
    formData.append("note", note);

    return requestFormData<Note | null>(
        `/api/v1/screenings/${screening_id}/add-note/${resume_id}`,
        formData,
    );
}
