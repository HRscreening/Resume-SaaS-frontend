import { request } from "@/lib/api";
import { PlatformName } from "@/types/sourcingData.types";   

export async function sourceResumes(screeningId: string,platform:PlatformName,body:any): Promise<any> {
    try {
        return request(`/api/v1/screenings/${screeningId}/get-new-sourced-resumes/${platform}`,{
            method: "POST",
            body: JSON.stringify(body),
        });
    }
    catch (error) {
        throw new Error("Error fetching sourced resumes");
    }
}