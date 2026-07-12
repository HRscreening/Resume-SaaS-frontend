import { request } from "@/lib/api";
import { ResumeScoringBodyType } from "@/modules/screening/types/progress.type";

type ScreenResumesArgs = {
    resume_ids: string[];
    screening_id: string;
}

export type ScreenResumesResponse = {
    message?: string;
    data: ResumeScoringBodyType[];
    batch_id: string;
}

export const screenResume = async ({resume_ids,screening_id}:ScreenResumesArgs): Promise<ScreenResumesResponse> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/screen-applications-new`,{
            'method':'POST',
            'body':JSON.stringify(resume_ids)
        });
        return res as ScreenResumesResponse;
    } catch (error) {
        throw error;
    }
}
