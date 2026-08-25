// Custom Hook for managing candidate query state in a screening context. It handles URL synchronization, debounced search input, and backend request preparation.


import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { tiersToRange } from "@/modules/screening/components/Screening/filters/matchTiers";
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation"
import type { ScreeningSearchParams, ScreeningDetailsSearchParams, RangeFilter, ScreeningSortRule, MatchTierId } from "@/modules/screening/types/searchSchema";
import { screeningSearchSchema, uiSearchSchema, applicationSearchSchema } from "@/modules/screening/types/searchSchema";
import { useScreeningResultsQuery } from "@/modules/screening/hooks/screening/queries/screening.query"
import type { ScreeningFilterKey } from "@/modules/screening/types/searchSchema"


const SEARCH_DEBOUNCE_MS = 550;



interface UseCandidateQueryOptions {
    limit?: number;
}

function cleanScreeningSearch(params: ScreeningSearchParams) {
    return {
        ...params,


        screenStage:
            params.screenStage?.length === 0
                ? undefined
                : params.screenStage,

        screenMatch:
            params.screenMatch?.length === 0
                ? undefined
                : params.screenMatch,

        screenCategoryScores:
            params.screenCategoryScores &&
                Object.keys(params.screenCategoryScores).length === 0
                ? undefined
                : params.screenCategoryScores,

        screenSort:
            params.screenSort.length === 1 &&
                params.screenSort[0].field === "overall_score" &&
                params.screenSort[0].direction === "desc"
                ? undefined
                : params.screenSort,


        // Resume Filters
        sName:
            params.sName === ""
                ? undefined
                : params.sName,

        sCurrentRole:
            params.sCurrentRole === ""
                ? undefined
                : params.sCurrentRole,

        sCurrentCompany:
            params.sCurrentCompany === ""
                ? undefined
                : params.sCurrentCompany,

        education:
            params.sEducation === ""
                ? undefined
                : params.sEducation,

        workEx:
            params.sWorkEx === ""
                ? undefined
                : params.sWorkEx,

        project:
            params.sProject === ""
                ? undefined
                : params.sProject,

        certification:
            params.sCertification === ""
                ? undefined
                : params.sCertification,

        achivement:
            params.sAchivement === ""
                ? undefined
                : params.sAchivement,

        pors:
            params.sPors === ""
                ? undefined
                : params.sPors,

        skills:
            params.sSkills === ""
                ? undefined
                : params.sSkills,

        languages:
            params.sLang === ""
                ? undefined
                : params.sLang,
    };
}

function clearScreeningSearch(prev: any) {
    return {
        ...uiSearchSchema.parse(prev),
        ...applicationSearchSchema.parse(prev),
        ...screeningSearchSchema.parse({}),
    };
}


export function useCandidateQuery(screeningId: string, options: UseCandidateQueryOptions = {}) {
    const { limit = 30 } = options;

    const { search: searchParams, navigate } = useScreeningDetailsNavigation();

    const screenSearchParams = screeningSearchSchema.parse(searchParams);




    // Backend request includes match-tier-derived overall_score range. The
    // URL keeps `match` as a separate tier id list so chips and dropdowns
    // can render it; the request collapses it into a numeric range.
    const requestState = useMemo(() => {
        if (screenSearchParams.screenMatch?.length === 0) {
            return screenSearchParams;
        }

        const tierRange =
            screenSearchParams.screenMatch &&
            tiersToRange(screenSearchParams.screenMatch);

        if (!tierRange) {
            return screenSearchParams;
        }

        const current = screenSearchParams.screenOverallScore;

        const combined: RangeFilter = {
            min: Math.max(
                current?.min ?? -Infinity,
                tierRange.min ?? -Infinity
            ),
            max: Math.min(
                current?.max ?? Infinity,
                tierRange.max ?? Infinity
            ),
        };

        return {
            ...screenSearchParams,
            screenOverallScore: {
                min: combined.min === -Infinity ? undefined : combined.min,
                max: combined.max === Infinity ? undefined : combined.max,
            },
        };
    }, [screenSearchParams]);

    const query = useScreeningResultsQuery(screeningId, requestState, limit, true);



    function pushState(next: ScreeningSearchParams) {
        const cleaned = cleanScreeningSearch(next);

        navigate({
            to: "/screenings/$id",
            params: { id: screeningId },
            search: (prev) => ({
                ...prev,
                ...cleaned,
            }) as never,
            replace: true,
        });
    }

    const setScreenType = useCallback(
        (type: ScreeningSearchParams["screenType"]) => {
            pushState({
                ...screenSearchParams,
                screenType: type,
            });
        },
        [screenSearchParams]
    );

    const setExperience = useCallback(
        (experience: RangeFilter) => {
            pushState({
                ...screenSearchParams,
                sExp: experience,
            });
        },
        [screenSearchParams]
    );

    // Setters — each one resets to page 1 when filter criteria change so the

    const setStage = useCallback((stage: string[]) => pushState({ ...screenSearchParams, screenStage: stage }), [screenSearchParams]);
    const setMatch = useCallback((match: MatchTierId[]) => pushState({ ...screenSearchParams, screenMatch: match }), [screenSearchParams]);
    
    
    const setOverallRange = useCallback(
        (range: RangeFilter | undefined) => pushState({ ...screenSearchParams, screenOverallScore: range }),
        [screenSearchParams],
    );
    
    const setCategoryRange = useCallback(
        (name: string, range: RangeFilter | undefined) => {
            const next = { ...screenSearchParams.screenCategoryScores };
            if (range === undefined || (range.min === undefined && range.max === undefined)) {
                delete next[name];
            } else {
                next[name] = range;
            }
            pushState({ ...screenSearchParams, screenCategoryScores: next });
        },
        [screenSearchParams],
    );
    const setSort = useCallback((sort: ScreeningSortRule[]) => pushState({ ...screenSearchParams, screenSort: sort }), [screenSearchParams]);



    const setFilter = useCallback(
        <K extends ScreeningFilterKey>(
            key: K,
            value: ScreeningSearchParams[K]
        ) => {
            console.log("Setting filter:", key, value);
            pushState({
                ...screenSearchParams,
                [key]: value,
            });
        },
        [screenSearchParams]
    );

    const clearAll = useCallback(() => {

        navigate({
            to: "/screenings/$id",
            params: { id: screeningId },
            search: (prev) => clearScreeningSearch(prev) as never,
            replace: true,
        });
    }, [navigate, screeningId]);


    return {
        state: screenSearchParams,
        setStage,
        setScreenType,
        setMatch,
        setExperience,
        setOverallRange,
        setCategoryRange,
        setSort,
        setFilter,
        clearAll,
        // Surface the underlying query for parent components that need
        // loading/data signals alongside the URL-state setters.
        query,
    };
}


export type CandidateQuery = ReturnType<typeof useCandidateQuery>;