import { useQuery, useMutation, useQueryClient, useInfiniteQuery, type QueryClient, type InfiniteData } from "@tanstack/react-query";
import { getScoredResumes } from "@/modules/screening/apis/screenings.api"
import type { CandidateQueryState, Screening, RankedCandidate } from "@/modules/screening/types/screening.type";
import { ScreeningResultsQueryKeys, ScreeningQueryKeys } from "@/modules/screening/queryKeys"
import { getScreeningById } from "@/modules/screening/apis/screenings.api"
import type { ScreeningsSearchParams, ScreeningSearchParams as ScoredResumeSearchFilterSchema } from "@/modules/screening/types/searchSchema";
import type { PaginatedResults } from "@/modules/screening/types/screening.type";



export function useScreeningQuery(screeningId: string,
  options?: {
    enabled?: boolean;
  }

) {
  return useQuery({
    queryKey: ScreeningQueryKeys.getScreening(screeningId),
    queryFn: () => getScreeningById(screeningId),
    enabled: options?.enabled,
    // refetchInterval: (query) => {
    //     const s = query.state.data;
    //     if (!s || ["completed", "failed", "draft"].includes(s.status)) return false;
    //     return 5000;
    // },
  })
}



export function useScreeningResultsQuery(
  screeningId: string,
  params: ScoredResumeSearchFilterSchema,
  limit?: number,
  enabled = true
) {
  return useInfiniteQuery({
    queryKey: ScreeningResultsQueryKeys.getScreenings(
      screeningId,
      params
    ),

    queryFn: ({ pageParam }) =>

      getScoredResumes(screeningId, params, pageParam, limit),

    initialPageParam: "",

    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,

    enabled,
  });
}


// ---------------------------- Scored Resune Archive/Unarchive/ Delete Mutations ----------------------------
function removeScreeningFromListCache(
  queryClient: QueryClient,
  params: ScoredResumeSearchFilterSchema,
  screeningId: string,
  resumeId: string
) {
  queryClient.setQueryData<InfiniteData<PaginatedResults<RankedCandidate>, string>>(
    ScreeningResultsQueryKeys.getScreenings(screeningId, params),
    (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          items: page.items.filter(
            (resume) => resume.resume_id !== resumeId
          ),
        })),
      };
    }
  );
}

export function useScoredResumeUtility(
  mutationFn: ({ screeningId, resumeId }: { screeningId: string, resumeId: string }) => Promise<unknown>,
  params: ScoredResumeSearchFilterSchema
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onSuccess: (_, { screeningId, resumeId }) => {
      removeScreeningFromListCache(
        queryClient,
        params,
        screeningId,
        resumeId
      );

      queryClient.invalidateQueries({
        queryKey: ScreeningResultsQueryKeys.screening(screeningId),
      });
    },
  });
}



// ---------------------------- Update Cache rather than refetching ----------------------------

/**
 * Helpers to update the cache after a mutation, rather than refetching the entire list of screenings.
 * 
 */
function removeScreeningFromCache(
  queryClient: QueryClient,
  params: ScreeningsSearchParams,
  screeningId: string
) {
  queryClient.setQueryData<Screening[]>(
    ScreeningQueryKeys.screenings(params),
    (oldData) => {
      if (!oldData) return oldData;

      return oldData.filter(
        (screening) => screening.id !== screeningId
      );
    }
  );
}

export function useScreeningMutation(
  mutationFn: (screeningId: string) => Promise<unknown>,
  params: ScreeningsSearchParams
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,

    onSuccess: (_, screeningId) => {
      removeScreeningFromCache(
        queryClient,
        params,
        screeningId
      );

      queryClient.invalidateQueries({
        queryKey: ScreeningQueryKeys.all,
      });
    },
  });
}