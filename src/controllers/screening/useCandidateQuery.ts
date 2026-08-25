import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getResults } from "@/lib/api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  DEFAULT_QUERY_STATE,
  decodeQueryState,
  encodeQueryState,
} from "@/modules/screening/components/Screening/filters/queryEncoding";
import { tiersToRange } from "@/modules/screening/components/Screening/filters/matchTiers";
import type {
  CandidateQueryState,
  MatchTierId,
  RangeFilter,
  SortRule,
} from "@/types";

const SEARCH_DEBOUNCE_MS = 350;

interface UseCandidateQueryOptions {
  limit?: number;
  // When true, polls the results endpoint until the parent says batch is done.
  // Mirrors the previous behavior in ScreeningDetail.
  pollWhileProcessing?: boolean;
  batchDone?: boolean;
  cursor?: string;
}

export function useCandidateQuery(screeningId: string, options: UseCandidateQueryOptions = {}) {
  const { limit = 10,cursor = null, pollWhileProcessing = false, batchDone = true } = options;

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;

  // URL is the source of truth for filters/sort/page. Decode lazily — the
  // decoded value is referentially stable across renders that don't change
  // the URL, so downstream memoisation keeps working.
  const urlState = useMemo<CandidateQueryState>(() => {
    const decoded = decodeQueryState(rawSearch);
    return { ...decoded, limit: limit };
  }, [rawSearch, limit]);

  // Local search-input state — typed-into immediately for snappy UX, but
  // only flushed into the URL after the debounce. Initial value comes from
  // the URL so refreshes / shares restore the typed text.
  const [searchInput, setSearchInput] = useState(urlState.search);
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  // Effective query state combines URL-derived state with the debounced
  // search input. We never write the raw `searchInput` into the URL — only
  // the debounced value, via the effect below.
  const state = useMemo<CandidateQueryState>(() => {
    if (debouncedSearch === urlState.search) return urlState;
    return { ...urlState, search: debouncedSearch};
  }, [urlState, debouncedSearch]);

  // Push debounced search to URL whenever it diverges. Other setters write
  // synchronously through pushState() below.
  useEffect(() => {
    if (debouncedSearch === urlState.search) return;
    pushState({ ...urlState, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Backend request includes match-tier-derived overall_score range. The
  // URL keeps `match` as a separate tier id list so chips and dropdowns
  // can render it; the request collapses it into a numeric range.
  const requestState = useMemo<CandidateQueryState>(() => {
    if (state.match.length === 0) return state;
    const tierRange = tiersToRange(state.match);
    if (!tierRange) return state;
    // Combine with any explicit overall_score range. Intersection: take the
    // tighter bound from each side.
    const cur = state.overall_score;
    const combined: RangeFilter = {
      min: Math.max(cur?.min ?? -Infinity, tierRange.min ?? -Infinity),
      max: Math.min(cur?.max ?? Infinity, tierRange.max ?? Infinity),
    };
    return {
      ...state,
      overall_score: {
        min: combined.min === -Infinity ? undefined : combined.min,
        max: combined.max === Infinity ? undefined : combined.max,
      },
    };
  }, [state]);

  const query = useQuery({
    queryKey: ["results", screeningId, requestState],
    queryFn: () => getResults(screeningId, requestState),
    placeholderData: (prev) => prev,
    refetchInterval: () => (pollWhileProcessing && !batchDone ? 4000 : false),
  });

  function pushState(next: CandidateQueryState) {
    navigate({
      to: "/screenings/$id",
      params: { id: screeningId },
      search: encodeQueryState(next) as never,
      replace: true,
    });
  }

  // Setters — each one resets to page 1 when filter criteria change so the
  // user isn't left on page 5 of a result set that only has 2 pages.
  const setSearch = useCallback((s: string) => setSearchInput(s), []);
  const setStage = useCallback((stage: string[]) => pushState({ ...urlState, stage }), [urlState]);
  const setMatch = useCallback((match: MatchTierId[]) => pushState({ ...urlState, match }), [urlState]);
  const setOverallRange = useCallback(
    (range: RangeFilter | undefined) => pushState({ ...urlState, overall_score: range }),
    [urlState],
  );
  const setCategoryRange = useCallback(
    (name: string, range: RangeFilter | undefined) => {
      const next = { ...urlState.category_scores };
      if (range === undefined || (range.min === undefined && range.max === undefined)) {
        delete next[name];
      } else {
        next[name] = range;
      }
      pushState({ ...urlState, category_scores: next});
    },
    [urlState],
  );
  const setSort = useCallback((sort: SortRule[]) => pushState({ ...urlState, sort }), [urlState]);
  const clearAll = useCallback(() => {
    setSearchInput("");
    pushState({ ...DEFAULT_QUERY_STATE, limit: limit });
  }, [limit]);

  

  return {
    state,
    searchInput,
    setSearch,
    setStage,
    setMatch,
    setOverallRange,
    setCategoryRange,
    setSort,
    clearAll,
    // Surface the underlying query for parent components that need
    // loading/data signals alongside the URL-state setters.
    query,
  };
}
