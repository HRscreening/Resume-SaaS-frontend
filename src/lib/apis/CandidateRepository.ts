import { request } from "@/lib/api";
import type { CandidateRepositoryQueryParams, CandidateOverview,CandidateDetails } from "@/types/candidate.type";
import { toRequestParams } from "@/controllers/candidateRepository/queryHelper";

export async function getCandidatesFromRepository(
    params: CandidateRepositoryQueryParams | { page?: number; page_size?: number } = {},
): Promise<CandidateOverview[]> {
    try {

        const qs =
            "search" in params || "stage" in params || "sort" in params
                ? toRequestParams(params as CandidateRepositoryQueryParams)
                : new URLSearchParams({
                    page: String((params as { page?: number }).page ?? 1),
                    page_size: String((params as { page_size?: number }).page_size ?? 20),
                });
        return request<CandidateOverview[]>(`/api/v1/candidates?${qs.toString()}`,{
            method: "GET",
        });
    }
    catch (error) {
        throw new Error("Error fetching candidates from repository");
    }
}



async function getCandidateDetails(candidateId: string):Promise<CandidateDetails> {
    try {

        return request<CandidateDetails>(`/api/v1/candidates/${candidateId}`);

    }
    catch (error) {
        throw new Error("Error fetching candidate from repository");
    }
}