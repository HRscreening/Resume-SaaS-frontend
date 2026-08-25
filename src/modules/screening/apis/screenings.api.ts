import { request } from "@/lib/api"
import type { CandidateQueryState, PaginatedResults, RankedCandidate, Screening } from "@/modules/screening/types/screening.type";
import { buildScreeningQuery,buildScreeningFiltersBody } from "@/modules/screening/utils/queryEncoding";
import type { ScreeningsSearchParams,ScreeningSearchParams as ScoredResumeSearchFilterSchema } from "@/modules/screening/types/searchSchema";



export async function listScreenings(
  params: ScreeningsSearchParams
): Promise<Screening[]> {


  const qs = new URLSearchParams({
    type: params.type,
  });

  return request<Screening[]>(
    `/api/v1/screenings?${qs.toString()}`
  );
}
/**
 * This function fetches a screening by its ID from the API and returns a promise that resolves to a Screening object.
 * 
 */
export async function getScreeningById(id: string): Promise<Screening> {
  return request<Screening>(`/api/v1/screenings/${id}`);
}



// ! Switch to QUERY METHOD for fetching scored resumes instead of using the current GET method with query parameters. 
// ! This will allow for more complex filtering and searching capabilities, as well as better handling of large datasets. 
// ! The new method should accept a request body containing the search parameters, and return a paginated list of scored resumes based on those parameters.

export async function getScoredResumes(
  screeningId: string,
  params: ScoredResumeSearchFilterSchema,
  cursor?: string | null,
  limit?: number
): Promise<PaginatedResults<RankedCandidate>> {
  const qs = buildScreeningQuery(cursor, limit);

  const body = buildScreeningFiltersBody(params);

  return request<PaginatedResults<RankedCandidate>>(`/api/v1/screenings/${screeningId}/results?${qs.toString()}`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
);
}



export async function archiveScreening(screeningId: string): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/archive`, {
    method: "POST",
  });
}

export async function unarchiveScreening(screeningId: string): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/unarchive`, {
    method: "POST",
  });
}

export async function deleteScreening(screeningId: string): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}`, {
    method: "DELETE",
  });
}


// ----------------- Common to both Parsed And Scored Resume APIs(Can me moved to other file if required) -----------------

export async function archiveResume({screeningId,resumeId}:{screeningId: string, resumeId: string}): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/archive/${resumeId}`, {
    method: "POST",
  });
}

export async function unarchiveResume({screeningId,resumeId}:{screeningId: string, resumeId: string}): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/unarchive/${resumeId}`, {
    method: "POST",
  });
}

export async function deleteResume({screeningId,resumeId}:{screeningId: string, resumeId: string}): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/delete/${resumeId}`, {
    method: "DELETE",
  });
}


