import { request } from "@/lib/api";
import { Application } from "@/modules/screening/types/application.type";
import type { PaginatedResults } from "@/modules/screening/types/screening.type";
import type { ApplicationsSearchParams } from "@/modules/screening/types/searchSchema";
import { buildApplicationQuery, buildApplicationFiltersBody } from "@/modules/screening/utils/queryEncoding";

type GetApplicationsRequestParams = {
    screening_id: string;
    params: ApplicationsSearchParams;
    cursor: string | null;
    limit: number;
}

export type GetApplicationsResponseType = PaginatedResults<Application>;


// ! Switch to QUERY METHOD for fetching scored resumes instead of using the current GET method with query parameters. 
// ! This will allow for more complex filtering and searching capabilities, as well as better handling of large datasets. 
// ! The new method should accept a request body containing the search parameters, and return a paginated list of scored resumes based on those parameters.

export const getApplications = async ({
    screening_id,
    params,
    cursor,
    limit = 10,
}: GetApplicationsRequestParams): Promise<GetApplicationsResponseType> => {
    const qs = buildApplicationQuery(cursor, limit);
    const body = buildApplicationFiltersBody(params);

    return request(`/api/v1/screenings/${screening_id}/get-applications?${qs.toString()}`,
        {
            method: "POST",
            body: JSON.stringify(body),
        }
    ) as Promise<GetApplicationsResponseType>;
};