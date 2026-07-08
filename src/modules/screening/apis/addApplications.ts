import { request } from "@/lib/api";
import {ResumeParsingBodyType} from "@/modules/screening/types/progress.type"

type Resume = {
    fileName: string;
    path: string;
}

type AddResumesArgs = {
    resumes: Resume[];
    screening_id: string;
}


type AddApplicationsResponse = {
    message:string,
    unmatched_urls: string[],
    data: ResumeParsingBodyType[] | [],
    batch_id: string
}

export const addApplications = async ({ resumes, screening_id }: AddResumesArgs):Promise<AddApplicationsResponse> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/add-applications`, {
            'method': 'POST',
            'body': JSON.stringify(resumes)
        });
        return res as AddApplicationsResponse;
    } catch (error) {
        throw error;
    }
}

