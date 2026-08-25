import { useCallback, useEffect, useState } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation";
import {
    applicationSearchSchema,
    screeningSearchSchema,
    uiSearchSchema,
} from "@/modules/screening/types/searchSchema";
import type {
    ApplicationsSearchParams,
    RangeFilter,
} from "@/modules/screening/types/searchSchema";
import { useApplicationsInfiniteQuery as useApplicationResultsQuery } from "@/modules/screening/hooks/application/queries/application.hook";
import type {ApplicationFilterKey} from "@/modules/screening/types/searchSchema"


interface UseApplicationQueryOptions {
    limit?: number;
}

function cleanApplicationSearch(params: ApplicationsSearchParams) {
    return {
        ...params,

        appName:
            params.appName === ""
                ? undefined
                : params.appName,

        appCurrentRole:
            params.appCurrentRole === ""
                ? undefined
                : params.appCurrentRole,

        appCurrentCompany:
            params.appCurrentCompany === ""
                ? undefined
                : params.appCurrentCompany,

        education:
            params.education === ""
                ? undefined
                : params.education,

        workEx:
            params.workEx === ""
                ? undefined
                : params.workEx,

        project:
            params.project === ""
                ? undefined
                : params.project,

        certification:
            params.certification === ""
                ? undefined
                : params.certification,

        achivement:
            params.achivement === ""
                ? undefined
                : params.achivement,

        pors:
            params.pors === ""
                ? undefined
                : params.pors,

        skills:
            params.skills === ""
                ? undefined
                : params.skills,

        languages:
            params.lang === ""
                ? undefined
                : params.lang,
    };
}

function clearApplicationSearch(prev: unknown) {
    return {
        ...uiSearchSchema.parse(prev),
        ...screeningSearchSchema.parse(prev),
        ...applicationSearchSchema.parse({}),
    };
}

export function useApplicationQuery(
    screeningId: string,
    options: UseApplicationQueryOptions = {}
) {
    const { limit = 30 } = options;

    const {search: searchParams,navigate} = useScreeningDetailsNavigation();

    const applicationSearchParams = applicationSearchSchema.parse(searchParams);

 

    /*
     * ---------------------------------------------------------
     * URL state
     * ---------------------------------------------------------
     */

    function pushState(next: ApplicationsSearchParams) {
        const cleaned = cleanApplicationSearch(next);

        navigate({
            to: "/screenings/$id",
            params: {
                id: screeningId,
            },
            search: (prev) => ({
                ...prev,
                ...cleaned,
            }) as never,
            replace: true,
        });
    }

    /*
     * ---------------------------------------------------------
     * Setters
     * ---------------------------------------------------------
     */

    const setType = useCallback(
        (type: ApplicationsSearchParams["appType"]) => {
            pushState({
                ...applicationSearchParams,
                appType: type,
            });
        },
        [applicationSearchParams]
    );

    const setName = useCallback(
        (name: string) => {
            pushState({
                ...applicationSearchParams,
                appName: name,
            });
        },
        [applicationSearchParams]
    );

    const setExperience = useCallback(
        (experience: RangeFilter) => {
            pushState({
                ...applicationSearchParams,
                appExperience: experience,
            });
        },
        [applicationSearchParams]
    );

    const setCurrentRole = useCallback(
        (role: string) => {
            pushState({
                ...applicationSearchParams,
                appCurrentRole: role,
            });
        },
        [applicationSearchParams]
    );

    const setCurrentCompany = useCallback(
        (company: string) => {
            pushState({
                ...applicationSearchParams,
                appCurrentCompany: company,
            });
        },
        [applicationSearchParams]
    );

    const setEducation = useCallback(
        (education: string) => {
            pushState({
                ...applicationSearchParams,
                education,
            });
        },
        [applicationSearchParams]
    );

    const setWorkEx = useCallback(
        (workEx: string) => {
            pushState({
                ...applicationSearchParams,
                workEx,
            });
        },
        [applicationSearchParams]
    );

    const setProject = useCallback(
        (project: string) => {
            pushState({
                ...applicationSearchParams,
                project,
            });
        },
        [applicationSearchParams]
    );

    const setCertification = useCallback(
        (certification: string) => {
            pushState({
                ...applicationSearchParams,
                certification,
            });
        },
        [applicationSearchParams]
    );

    const setAchievement = useCallback(
        (achievement: string) => {
            pushState({
                ...applicationSearchParams,
                achivement: achievement,
            });
        },
        [applicationSearchParams]
    );

    const setPors = useCallback(
        (pors: string) => {
            pushState({
                ...applicationSearchParams,
                pors,
            });
        },
        [applicationSearchParams]
    );

    const setSkills = useCallback(
        (skills: string) => {
            pushState({
                ...applicationSearchParams,
                skills,
            });
        },
        [applicationSearchParams]
    );

    const setLanguages = useCallback(
        (lang: string) => {
            pushState({
                ...applicationSearchParams,
                lang,
            });
        },
        [applicationSearchParams]
    );

    const setSort = useCallback(
        (
            sort: ApplicationsSearchParams["appSort"]
        ) => {
            pushState({
                ...applicationSearchParams,
                appSort: sort,
            });
        },
        [applicationSearchParams]
    );


    const setFilter = useCallback(
        <K extends ApplicationFilterKey>(
            key: K,
            value: ApplicationsSearchParams[K]
        ) => {
            console.log("Setting filter:", key, value);
            pushState({
                ...applicationSearchParams,
                [key]: value,
            });
        },
        [applicationSearchParams]
    );

    /*
     * ---------------------------------------------------------
     * Clear
     * ---------------------------------------------------------
     */

    const clearAll = useCallback(() => {

        navigate({
            to: "/screenings/$id",
            params: {
                id: screeningId,
            },
            search: (prev) =>
                clearApplicationSearch(prev) as never,
            replace: true,
        });
    }, [navigate, screeningId]);


    /*
     * ---------------------------------------------------------
     * Backend query
     * ---------------------------------------------------------
     */

    const query = useApplicationResultsQuery({ params: applicationSearchParams, screening_id: screeningId, limit });

    return {
        state: applicationSearchParams,

        setType,
        setName,
        setExperience,
        setCurrentRole,
        setCurrentCompany,
        setEducation,
        setWorkEx,
        setProject,
        setCertification,
        setAchievement,
        setPors,
        setSkills,
        setLanguages,
        setSort,

        setFilter,

        clearAll,

        query,
    };
}

export type ApplicationQuery = ReturnType<typeof useApplicationQuery>;