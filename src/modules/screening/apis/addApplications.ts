import { request } from "@/lib/api";

type AddResumesArgs = {
    resume_urls: string[];
    screening_id: string;
}


export const addApplications = async ({resume_urls,screening_id}:AddResumesArgs) => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/add-applications`,{
            'method':'POST',
            'body':JSON.stringify(resume_urls)
        });
        return res;
    } catch (error) {
        throw error;
    }
}

