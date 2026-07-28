import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCandidatesFromRepository} from "@/lib/apis/CandidateRepository";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  DEFAULT_QUERY_STATE,
  decodeQueryState,
  encodeQueryState,
} from "@/controllers/candidateRepository/queryHelper";
import { tiersToRange } from "@/components/screening/filters/matchTiers";
import type {CandidateRepositoryQueryParams,SortRule} from "@/types/candidate.type";
import type {MatchTierId,RangeFilter} from "@/types";

const SEARCH_DEBOUNCE_MS = 350;

interface UseCandidateRepositoryQueryOptions {
  pageSize?: number;
  // When true, polls the results endpoint until the parent says batch is done.
  // Mirrors the previous behavior in ScreeningDetail.
  pollWhileProcessing?: boolean;
}

export function useCandidateRepositoryQuery( options: UseCandidateRepositoryQueryOptions = {}) {
  const { pageSize = 10} = options;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;

  // URL is the source of truth for filters/sort/page. Decode lazily — the
  // decoded value is referentially stable across renders that don't change
  // the URL, so downstream memoisation keeps working.
  const urlState = useMemo<CandidateRepositoryQueryParams>(() => {
    const decoded = decodeQueryState(rawSearch);
    return { ...decoded, page_size: pageSize };
  }, [rawSearch, pageSize]);

  // Local search-input state — typed-into immediately for snappy UX, but
  // only flushed into the URL after the debounce. Initial value comes from
  // the URL so refreshes / shares restore the typed text.
  const [searchInput, setSearchInput] = useState(urlState.search);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // Effective query state combines URL-derived state with the debounced
  // search input. We never write the raw `searchInput` into the URL — only
  // the debounced value, via the effect below.
  const state = useMemo<CandidateRepositoryQueryParams>(() => {
    if (debouncedSearch === urlState.search) return urlState;
    return { ...urlState, search: debouncedSearch, page: 1 };
  }, [urlState, debouncedSearch]);

  // Push debounced search to URL whenever it diverges. Other setters write
  // synchronously through pushState() below.
  useEffect(() => {
    if (debouncedSearch === urlState.search) return;
    pushState({ ...urlState, search: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Backend request includes match-tier-derived overall_score range. The
  // URL keeps `match` as a separate tier id list so chips and dropdowns
  // can render it; the request collapses it into a numeric range.
  const requestState = useMemo<CandidateRepositoryQueryParams>(() => {
    if (state.match.length === 0) return state;
    const tierRange = tiersToRange(state.match);
    if (!tierRange) return state;
    // Combine with any explicit overall_score range. Intersection: take the
    // tighter bound from each side.
    const cur1 = state.best_score;
    const combined1: RangeFilter = {
      min: Math.max(cur1?.min ?? -Infinity, tierRange.min ?? -Infinity),
      max: Math.min(cur1?.max ?? Infinity, tierRange.max ?? Infinity),
    };
    const cur2 = state.best_score;
    const combined2: RangeFilter = {
      min: Math.max(cur2?.min ?? -Infinity, tierRange.min ?? -Infinity),
      max: Math.min(cur2?.max ?? Infinity, tierRange.max ?? Infinity),
    };
    return {
      ...state,
      best_score: {
        min: combined1.min === -Infinity ? undefined : combined1.min,
        max: combined1.max === Infinity ? undefined : combined1.max,
      },
      avg_score: {
        min: combined2.min === -Infinity ? undefined : combined2.min,
        max: combined2.max === Infinity ? undefined : combined2.max,
      },
    };
  }, [state]);

  const query = useQuery({
    queryKey: ["CandidateRepository", requestState],
    queryFn: () => getCandidatesFromRepository(requestState),
    placeholderData: (prev) => prev,
  });

  function pushState(next: CandidateRepositoryQueryParams) {
    console.log("Feature Disabled")
    // navigate({
    //   to: "/candidates",
    //   search: encodeQueryState(next) as never,
    //   replace: true,
    // });
  }

  // Setters — each one resets to page 1 when filter criteria change so the
  // user isn't left on page 5 of a result set that only has 2 pages.
  const setSearch = useCallback((s: string) => setSearchInput(s), []);
  const setStage = useCallback((stage: string[]) => pushState({ ...urlState, stage, page: 1 }), [urlState]);
  const setMatch = useCallback((match: MatchTierId[]) => pushState({ ...urlState, match, page: 1 }), [urlState]);
  const setBestScoreRange = useCallback(
    (range: RangeFilter | undefined) => pushState({ ...urlState, best_score: range, page: 1 }),
    [urlState],
  );
  const setAvgScoreRange = useCallback(
    (range: RangeFilter | undefined) => pushState({ ...urlState, avg_score: range, page: 1 }),
    [urlState],
  );

  const setSort = useCallback((sort: SortRule[]) => pushState({ ...urlState, sort, page: 1 }), [urlState]);
  const setPage = useCallback((page: number) => pushState({ ...urlState, page }), [urlState]);
  const clearAll = useCallback(() => {
    setSearchInput("");
    pushState({ ...DEFAULT_QUERY_STATE, page_size: pageSize });
  }, [pageSize]);

  // Hover-prefetch hook for pagination buttons — mirrors the existing
  // prefetch pattern in ScreeningDetail.
  const prefetchPage = useCallback(
    (page: number) => {
      const target = { ...requestState, page };
      queryClient.prefetchQuery({
        queryKey: ["CandidateRepository",target],
        queryFn: () => getCandidatesFromRepository(target),
      });
    },
    [queryClient, requestState],
  );

  return {
    state,
    searchInput,
    setSearch,
    setStage,
    setMatch,
    setBestScoreRange,
    setAvgScoreRange,
    setSort,
    setPage,
    clearAll,
    prefetchPage,
    // Surface the underlying query for parent components that need
    // loading/data signals alongside the URL-state setters.
    query,
  };
}
