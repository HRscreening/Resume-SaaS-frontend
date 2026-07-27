import { request } from "@/lib/api";
import { ResumeScoringBodyType } from "@/modules/screening/types/progress.type";
import { m } from "framer-motion";

type ScreenResumesArgs = {
    resume_ids: string[];
    screening_id: string;
}

export type ScreenResumesResponse = {
    message?: string;
    data: ResumeScoringBodyType[];
    batch_id: string;
}

export const screenResume = async ({ resume_ids, screening_id }: ScreenResumesArgs): Promise<ScreenResumesResponse> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/screen-applications-new`, {
            'method': 'POST',
            'body': JSON.stringify(resume_ids)
        });

        // console.log("Screening response:", res); // Log the response for debugging
        return res as ScreenResumesResponse;
    } catch (error) {
        throw error;
    }
}


// Test data:

// const data: ResumeScoringBodyType = {
//     filename: "resume.pdf",
//     id: "26dedb1e-62c8-4105-b960-851797d79302",
//     status: "scoring_in_progress",
//     url: "https://example.com/resume.pdf"

// }
// const res: ScreenResumesResponse = {
//     message: "Screening initiated successfully",
//     data: [data],
//     batch_id: "28fd32ad-08f7-450f-a260-e8fb9ebf852e"
// }