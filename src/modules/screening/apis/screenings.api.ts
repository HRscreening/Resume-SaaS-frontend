import { request, getAuthHeader, API_BASE, } from "@/lib/api"
import type { CandidateQueryState, PaginatedResults, RankedCandidate, Screening } from "@/modules/screening/types/screening.type";
import { buildScreeningQuery, buildScreeningFiltersBody } from "@/modules/screening/utils/queryEncoding";
import type { ScreeningsSearchParams, ScreeningSearchParams as ScoredResumeSearchFilterSchema } from "@/modules/screening/types/searchSchema";
import { clearSessionHint } from "@/lib/sessionHint";


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



export async function exportScoredResumes(
  screeningId: string,
  params: ScoredResumeSearchFilterSchema,
): Promise<{ blob: Blob; filename: string | null }> {

  const body = buildScreeningFiltersBody(params);


  const authHeaders = await getAuthHeader();
  const res = await fetch(
    `${API_BASE}/api/v1/screenings/${screeningId}/export`,
    {
      method: "POST",
      headers: {
        ...(await getAuthHeader()),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),

    },
  );
  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    throw new Error("Export failed");
  }
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].trim()) : null;
  return { blob: await res.blob(), filename };


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

// These 3 apis also supports multiple res

// Archive
export async function archiveResume({ screeningId, resumeId }: { screeningId: string, resumeId: string }): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/archive/${resumeId}`, {
    method: "POST",
  });
}


// Unarchive
export async function unarchiveResume({ screeningId, resumeId }: { screeningId: string, resumeId: string }): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/unarchive/${resumeId}`, {
    method: "POST",
  });
}


// 
export async function deleteResume({ screeningId, resumeId }: { screeningId: string, resumeId: string }): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/delete/${resumeId}`, {
    method: "DELETE",
  });
}



// -------------------------------- MultiSelect Resume Actions --------------------------------

type BaseMultiResumeVariables = {
  screeningId: string;
  resumeIds: string[];
};


// Rescore
export async function rescoreScreenings(
  { screeningId, resumeIds }: BaseMultiResumeVariables

): Promise<{ screening_id: string; batch_id: string; total_resumes: number }> {
  return request<{ screening_id: string; batch_id: string; total_resumes: number }>(
    `/api/v1/scores/${screeningId}/rescore`,
    {
      method: "POST",
      body: JSON.stringify({ resume_ids: resumeIds ?? {} }),
    },
  );
}


//Share
export async function shareScreenings(
  { screeningId, resumeIds }: BaseMultiResumeVariables
): Promise<void> {
  // To be
  // return request(
  //   `/api/v1/scores/${screeningId}/share`,
  //   {
  //     method: "POST",
  //     body: JSON.stringify(body ?? {}),
  //   },
  // );
  setTimeout(() => { }, 1500)
}

// Export 

export async function exportSelectedScreenings(
  { screeningId, resumeIds }: BaseMultiResumeVariables
): Promise<{ blob: Blob; filename: string | null }> {



  const res = await fetch(
    `${API_BASE}/api/v1/screenings/${screeningId}/export-selected`,
    {
      method: "POST",
      body: JSON.stringify(resumeIds ?? []),
      headers: {
        ...(await getAuthHeader()),
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    throw new Error("Export failed");
  }
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].trim()) : null;
  return { blob: await res.blob(), filename };


}

// Download
export async function downloadSelectedResumes(
  { screeningId, resumeIds }: BaseMultiResumeVariables
): Promise<{ blob: Blob; filename: string | null }> {

  const res = await fetch(
    `${API_BASE}/api/v1/screenings/${screeningId}/resumes/download`,
    {
      method: "POST",
      body: JSON.stringify(resumeIds ?? []),
      headers: {
        ...(await getAuthHeader()),
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    if (res.status === 401) clearSessionHint();
    throw new Error("Resume download failed");
  }

  const disposition = res.headers.get("Content-Disposition");

  const match = disposition?.match(
    /filename\*?=(?:UTF-8''|")?([^";]+)/i
  );

  const filename = match
    ? decodeURIComponent(match[1].trim())
    : null;

  return {
    blob: await res.blob(),
    filename,
  };
}

//Change Stage
export async function changeScreeningsStage(
  { screeningId, resumeIds, newStage }: BaseMultiResumeVariables & { newStage: string }
): Promise<void> {

  const body = {
    screening_id: screeningId,
    resume_ids: resumeIds,
    new_stage: newStage,
  };

  return request(
    `/api/v1/scores/update-stage-multiple`,
    {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    },
  );
}





// Call
export async function callSelectedScreenings(
  { screeningId, resumeIds }: BaseMultiResumeVariables
): Promise<{
  created: any[];
  skipped: any[];
}> {
  // To be
  return request(
    `/api/v1/screenings/${screeningId}/voice/calls-multiple`,
    {
      method: "POST",
      body: JSON.stringify(resumeIds),
    },
  );

}


export async function archiveResumeMulti({ screeningId, resumeIds }: { screeningId: string, resumeIds: string[] }): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/archive-multiple`, {
    method: "POST",
    body: JSON.stringify(resumeIds),
  });
}


// Unarchive
export async function unarchiveResumeMulti({ screeningId, resumeIds }: { screeningId: string, resumeIds: string[] }): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/unarchive-multiple`, {
    method: "POST",
    body: JSON.stringify(resumeIds),
  });
}


// 
export async function deleteResumeMulti({ screeningId, resumeIds }: { screeningId: string, resumeIds: string[] }): Promise<void> {
  return request<void>(`/api/v1/screenings/${screeningId}/delete-multiple`, {
    method: "DELETE",
    body: JSON.stringify(resumeIds),
  });
}


// Screen/Rescore
import { ResumeScoringBodyType } from "@/modules/screening/types/progress.type";
export type ScreenResumesResponse = {
  message?: string;
  data: ResumeScoringBodyType[];
  batch_id: string;
}

export const screenResume = async (
  { resumeIds, screeningId, isRescore = false }: BaseMultiResumeVariables & { isRescore?: boolean }
): Promise<ScreenResumesResponse> => {
  try {
    const url = isRescore
      ? `/api/v1/screenings/${screeningId}/screen-applications-new?is_rescore=true`
      : `/api/v1/screenings/${screeningId}/screen-applications-new`;
    const res = await request(url, {
      'method': 'POST',
      'body': JSON.stringify(resumeIds)
    });

    // console.log("Screening response:", res); // Log the response for debugging
    return res as ScreenResumesResponse;
  } catch (error) {
    throw error;
  }
}