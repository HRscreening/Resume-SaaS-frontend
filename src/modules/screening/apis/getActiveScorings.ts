import { request } from "@/lib/api";
import { ResumeScoringBodyType } from "@/modules/screening/types/progress.type";

type GetActiveScoringRequestParams = {
    screening_id: string;
    batch_id: string;
    page?: number;
    limit?: number;
}

export type GetScoringResponseType = {
    resumes: ResumeScoringBodyType[];
    total: number;
}

export const getActiveScorings = async ({ screening_id, batch_id, page = 1, limit = 100 }: GetActiveScoringRequestParams): Promise<GetScoringResponseType> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/get-applications-waiting-for-scoring/${batch_id}?limit=${limit}`);
        return res as GetScoringResponseType;
    } catch (error) {
        throw error;
    }
}
