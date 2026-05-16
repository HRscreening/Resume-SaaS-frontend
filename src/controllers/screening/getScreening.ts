import { useQuery } from "@tanstack/react-query";
import { getScreening } from "@/lib/api";



/**
 * Custom hook to fetch screening details using React Query.
 *
 * @param screeningId - The ID of the screening to fetch.
 * @param options - Optional configuration for the query, including an 'enabled' flag to control when the query should run.
 * @returns The result of the useQuery hook, which includes the screening data, loading state, and error state.
 * 
 * The query will only run if the 'enabled' option is true (default) and a valid screeningId is provided. The data will be considered fresh for 5 minutes to optimize performance.
 */
export function useScreening(
  screeningId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["screening", screeningId],
    queryFn: () => getScreening(screeningId),
    enabled: (options?.enabled ?? true) && !!screeningId,
    staleTime: 5 * 60 * 1000,
  });
}
