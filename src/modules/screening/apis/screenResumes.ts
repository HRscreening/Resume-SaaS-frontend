
import { request } from "@/lib/api";

type ScreenResumesArgs = {
    resume_ids: string[];
    screening_id: string;
}


export const screenResume = async ({resume_ids,screening_id}:ScreenResumesArgs) => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/screen-applications`,{
            'method':'POST',
            'body':JSON.stringify(resume_ids)
        });
        return res;
    } catch (error) {
        throw error;
    }
}

