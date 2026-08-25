import { useQueryClient } from "@tanstack/react-query";
import { useState,useMemo } from "react"
import type { Screening } from "@/modules/screening/types/screening.type"
import { ScreeningQueryKeys } from "@/modules/screening/queryKeys"
import { useScreeningQuery } from "@/modules/screening/hooks/screening/queries/screening.query"
import { toast } from 'sonner'
import { jdStorageService } from "@/lib/services"
import { exportResults } from "@/lib/api";


export function useScreening(id: string) {

    const [exporting, setExporting] = useState(false);

    const queryClient = useQueryClient();


    // Reading From the Cache of Screening Metadata
    const cachedScreening = useMemo(() => {
        const queries = queryClient.getQueriesData<Screening[]>({
            queryKey: ScreeningQueryKeys.list,
        });

        for (const [, data] of queries) {
            const screening = data?.find(
                screening => screening.id === id
            );

            if (screening) {
                return screening;
            }
        }

        return undefined;
    }, [queryClient, id]);


    const query = useScreeningQuery(id, {
        enabled: !cachedScreening,
    });

    const screening = cachedScreening ?? query.data


    const postJob = () => {
        const postedJobUrl = `https://hiresort.ai/careers/${id}`;

        // Copy the URL to the clipboard
        navigator.clipboard.writeText(postedJobUrl).then(() => {
            toast.success("JobPost URL copied to clipboard.Redirecting...");
            setTimeout(() => {
                window.open(postedJobUrl, "_blank");
            }, 1000);
        }).catch((err) => {
            console.error("Failed to copy URL to clipboard:", err);
            toast.error("Something went wrong, Contact support");
        }
        );

    }

    async function viewJD() {
        try {
            const url = screening?.jd_url;

            if (!url) {
                toast.error("Job description not available");
                return;
            }
            // const signedUrl = await jdStorageService.createSignedUrl(url, 60 * 5);
            const signedUrl = jdStorageService.getPublicUrl(url);
            window.open(signedUrl, "_blank");
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to view job description"
            );
        }
    }

    async function handleExport() {
        setExporting(true);
        try {
            // const { blob, filename } = await exportResults(id, queryState);
            const { blob, filename } = await exportResults(id, {});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename ?? `${screening?.title ?? "results"}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch { /* ignored */ } finally { setExporting(false); }
    }



    return {
        screening: screening,
        isPending: !cachedScreening && query.isPending,
        error: query.error,

        exporting,
        handleExport,

        postJob,
        viewJD
    };
}