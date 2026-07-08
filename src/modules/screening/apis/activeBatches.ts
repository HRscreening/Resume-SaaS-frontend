import { request } from "@/lib/api";
import { ResumeParsingBodyType } from "@/modules/screening/types/progress.type";


export type GetActiveBatchesResponse = {
    parsing_batch_ids: string[];
    scoring_batch_ids: string[];
}

export const getActiveBatches = async (screening_id:string):Promise<GetActiveBatchesResponse> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/get-active-batches`);
        // console.log("getApplications response:", res);
        return res as GetActiveBatchesResponse;
    } catch (error) {
        throw error;
    }
}