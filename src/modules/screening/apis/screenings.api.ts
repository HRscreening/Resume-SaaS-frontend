import { request } from "@/lib/api"
import type { CandidateQueryState, PaginatedResults,RankedCandidate } from "@/modules/screening/types/screening.type";
import { toRequestParams } from "@/modules/screening/utils/queryEncoding";





export async function getScreenings(
  screeningId: string,
  params: CandidateQueryState,
): Promise<PaginatedResults<RankedCandidate>> {
  const qs =
    "search" in params || "stage" in params || "sort" in params
      ? toRequestParams(params as CandidateQueryState)
      : new URLSearchParams({
          limit: String((params as { limit?: number }).limit ?? 10),
        });
  return request<PaginatedResults<RankedCandidate>>(`/api/v1/screenings/${screeningId}/results?${qs.toString()}`);
}