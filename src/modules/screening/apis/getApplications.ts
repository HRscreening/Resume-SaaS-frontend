import { request } from "@/lib/api";
import { Application } from "@/modules/screening/types/application.type";
import type { PaginatedResults } from "@/modules/screening/types/screening.type";


type GetApplicationsRequestParams = {
    screening_id: string;
    cursor: string | null;
    limit: number;
}

export type GetApplicationsResponseType = PaginatedResults<Application>;

export const getApplications = async ({
    screening_id,
    cursor,
    limit = 10,
}: GetApplicationsRequestParams): Promise<GetApplicationsResponseType> => {
    const params = new URLSearchParams();

    if (cursor) {params.set("cursor", cursor);}

    params.set("limit", limit.toString());

    return request(`/api/v1/screenings/${screening_id}/get-applications?${params.toString()}`
    ) as Promise<GetApplicationsResponseType>;
};