import { useNavigate, useSearch, getRouteApi } from "@tanstack/react-router";
import { screeningSearchSchema, applicationSearchSchema, type ApplicationsSearchParams, type ScreeningSearchParams, type ScreeningDetailsSearchParams } from "@/modules/screening/types/searchSchema";



/**
 * This hook provides a convenient interface for navigating and updating the search parameters
 * related to the screening details page. It abstracts away the underlying navigation logic
 * and provides setter functions for each relevant search parameter.
 * 
 * @returns An object containing the current search parameters, a navigate function, and setter functions for each search parameter.
 */

export const useScreeningDetailsNavigation = () => {

    // Switch to Route.useNavigate() and Route.useSearch() after you 

    // const search:ScreeningDetailsSearchParams = useSearch({from: "/screenings/$id",});
    // const route = getRouteApi("");
    const search = useSearch({ strict: false }) as ScreeningDetailsSearchParams;
    const navigate = useNavigate({
        from: "/screenings/$id"
    });

    

    const setAppType = (type: ScreeningDetailsSearchParams["appType"]) => {
        navigate({
            search: (prev) => ({
                ...prev,
                appType: type,
            }),
        });
    };

    const setScreenType = (type: ScreeningDetailsSearchParams["screenType"]) => {
        navigate({
            search: (prev) => ({
                ...prev,
                screenType: type,
            }),
        });
    };

    const setTab = (tab: ScreeningDetailsSearchParams["tab"]) => {
        navigate({
            search: (prev) => ({
                ...prev,
                tab,
            }),
        });
    };

    const setAnalysisTab = (tab: ScreeningDetailsSearchParams["analysisTab"]) => {
        navigate({
            search: (prev) => ({
                ...prev,
                analysisTab: tab,
            }),
        });
    }


    const setAppId = (id: string | null) => {
        navigate({
            search: (prev) => ({
                ...prev,
                appId: id ?? undefined,
            }),
            replace: true,
        });
    }

    const setScreenId = (id: string | null) => {
        navigate({
            search: (prev) => ({
                ...prev,
                screenId: id ?? undefined,
            }),
            replace: true,
        });
    }


    const getScreeningSearchParams = (): ScreeningSearchParams => {
        return screeningSearchSchema.parse(search);
    }

    const getApplicationSearchParams = (): ApplicationsSearchParams => {
        return applicationSearchSchema.parse(search);
    }










    return {
        search,
        navigate,
        setAppType,
        setScreenType,
        setTab,
        setAnalysisTab,
        setAppId,
        setScreenId,

        // 
        getScreeningSearchParams,
        getApplicationSearchParams,
    };
};