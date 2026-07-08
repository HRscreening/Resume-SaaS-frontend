import { request } from "@/lib/api";
import { ResumeParsingBodyType } from "@/modules/screening/types/progress.type";

type GetActiveParsingRequestParams = {
    screening_id: string;
    batch_id: string;
    page?: number;
    limit?: number;
}


export type GetParsingResponseType = {
    resumes: ResumeParsingBodyType[];
    total: number;
}

export const getActiveParsings = async ({screening_id,batch_id,page=1,limit=50}:GetActiveParsingRequestParams):Promise<GetParsingResponseType> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/get-applications-waiting-for-parsing/${batch_id}?limit=${limit}`);
        // console.log("getApplications response:", res);
        return res as GetParsingResponseType;
    } catch (error) {
        throw error;
    }
}