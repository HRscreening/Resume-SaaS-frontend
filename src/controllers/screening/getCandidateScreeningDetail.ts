import { useQuery } from "@tanstack/react-query";
import { getResumeDetail,getResumeDetailFull } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";


/** Custom hook to fetch detailed candidate screening information using React Query.

 * @param screeningId - The ID of the screening to fetch details for.
 * @param resumeId - The ID of the candidate's resume to fetch details for.
 * @param options - Optional configuration for the query, including an 'enabled' flag to control when the query should run.
 * @returns The result of the useQuery hook, which includes the candidate screening details, loading state, and error state.
 * 
 * The query will only run if the 'enabled' option is true (default) and both a valid screeningId and resumeId are provided. 
*/
export function useCandidateScreeningDetail(
  screeningId: string,
  resumeId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.screening(screeningId, resumeId),
    queryFn: () => getResumeDetailFull(screeningId, resumeId),
    enabled:
      (options?.enabled ?? true) && !!screeningId && !!resumeId,
  });
}
