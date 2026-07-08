import { request } from "@/lib/api";
import { Application } from "@/modules/screening/types/application.type";

type GetApplicationsRequestParams = {
    screening_id: string;
    page?: number;
    pageSize?: number;
}


export type GetApplicationResponseType = {
    applications: Application[];
    total: number;
}

export const getApplications = async ({screening_id,page=1,pageSize=10}:GetApplicationsRequestParams):Promise<GetApplicationResponseType> => {
    try {
        const res = await request(`/api/v1/screenings/${screening_id}/get-applications?page=${page}&pageSize=${pageSize}`);
        // console.log("getApplications response:", res);
        return res as GetApplicationResponseType;
    } catch (error) {
        throw error;
    }
}