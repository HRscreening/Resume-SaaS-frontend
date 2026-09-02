import { request, getAuthHeader, API_BASE } from "@/lib/api";
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


import { clearSessionHint } from "@/lib/sessionHint";

type BaseMultiResumeVariables = {
  screeningId: string;
  resumeIds: string[];
};


export async function exportSelectedApplications(
  { screeningId, resumeIds }: BaseMultiResumeVariables
): Promise<{ blob: Blob; filename: string | null }> {



  const res = await fetch(
    `${API_BASE}/api/v1/screenings/${screeningId}/export/applications/selected`,
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
