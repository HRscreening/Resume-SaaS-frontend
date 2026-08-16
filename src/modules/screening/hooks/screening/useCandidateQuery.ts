import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
    DEFAULT_QUERY_STATE,
    decodeQueryState,
    encodeQueryState,
} from "@/modules/screening/utils/queryEncoding";
import { tiersToRange } from "@/components/screening/filters/matchTiers";
import type {
    CandidateQueryState,
    MatchTierId,
    RangeFilter,
    SortRule,
} from "@/modules/screening/types/screening.type";
import { useScreeningResultsQuery } from "@/modules/screening/hooks/screening/screening.query"

const SEARCH_DEBOUNCE_MS = 550;





interface UseCandidateQueryOptions {
    limit?: number;
}

export function useCandidateQuery(screeningId: string, options: UseCandidateQueryOptions = {}) {
    const { limit = 30 } = options;

    const navigate = useNavigate();
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

    useEffect(() => {
    if (debouncedSearch === urlState.search) return;

    if (debouncedSearch === "") {
        navigate({
            to: "/screenings/$id",
            params: { id: screeningId },
            search: (prev) => ({
                ...prev,
                search: undefined,
            }) as never,
            replace: true,
        });
        return;
    }

    

    pushState({
        ...urlState,
        search: debouncedSearch,
    });
}, [debouncedSearch, urlState, navigate, screeningId]);

    // Effective query state combines URL-derived state with the debounced
    // search input. We never write the raw `searchInput` into the URL — only
    // the debounced value, via the effect below.
    const state = useMemo<CandidateQueryState>(() => {
        if (debouncedSearch === urlState.search) return urlState;
        return { ...urlState, search: debouncedSearch };
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
    const requestState = useMemo<Omit<CandidateQueryState, "cursor">>(() => {
        const { cursor, ...baseState } = state;

        if (baseState.match.length === 0) {
            return baseState;
        }

        const tierRange = tiersToRange(baseState.match);
        if (!tierRange) {
            return baseState;
        }

        const cur = baseState.overall_score;
        const combined: RangeFilter = {
            min: Math.max(cur?.min ?? -Infinity, tierRange.min ?? -Infinity),
            max: Math.min(cur?.max ?? Infinity, tierRange.max ?? Infinity),
        };

        return {
            ...baseState,
            overall_score: {
                min: combined.min === -Infinity ? undefined : combined.min,
                max: combined.max === Infinity ? undefined : combined.max,
            },
        };
    }, [state]);

    const query = useScreeningResultsQuery(screeningId, requestState);

    // function pushState(next: CandidateQueryState) {
    //     navigate({
    //         to: "/screenings/$id",
    //         params: { id: screeningId },
    //         search: encodeQueryState(next) as never,
    //         replace: true,
    //     });
    // }
    function pushState(next: CandidateQueryState) {
        navigate({
            to: "/screenings/$id",
            params: { id: screeningId },
            search: (prev) => ({
                ...prev,
                ...encodeQueryState(next),
            }) as never,
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
            pushState({ ...urlState, category_scores: next });
        },
        [urlState],
    );
    const setSort = useCallback((sort: SortRule[]) => pushState({ ...urlState, sort }), [urlState]);
    // const clearAll = useCallback(() => {
    //     setSearchInput("");
    //     pushState({ ...DEFAULT_QUERY_STATE, limit: limit });
    // }, [limit]);
    const clearAll = useCallback(() => {
        setSearchInput("");
        navigate({
            to: "/screenings/$id",
            params: { id: screeningId },
            search: (prev) => ({
                tab: prev.tab,
            }) as never,
            replace: true,
        });
    }, [navigate, screeningId]);



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
