import React, { useEffect, useState, useRef } from 'react';
import { useActiveParsingQuery } from '@/modules/screening/hooks/progress.hook';
import type { ResumeParsingBodyType, EventBodyType } from "@/modules/screening/types/progress.type";
import type { GetParsingResponseType } from "@/modules/screening/apis/getActiveParsings";
import type { Application } from "@/modules/screening/types/application.type";
import { PendingResumeRow } from '@/modules/screening/components/shared/ProcessingResumeRow';
import { queryClient } from '@/lib/queryClient';
import { ApplicationQueryKeys, ResumeParsingQueryKeys, ActiveBatchesQueryKeys } from '@/modules/screening/queryKeys';
import type { GetApplicationsResponseType } from '@/modules/screening/apis/getApplications';
import type { GetActiveBatchesResponse } from '@/modules/screening/apis/activeBatches';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import type { InfiniteData } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Props = {
    screening_id: string;
    batch_id: string;
}

export function countByStage(files: ResumeParsingBodyType[]) {
    const c = { queued: 0, parsing: 0, parsed: 0, scoring: 0, scored: 0, error: 0 } as Record<string, number>;
    for (const f of files) {
        const status = f.status.toLowerCase();
        if (status === 'success' || status === 'parsed') c.parsed++;
        else if (status === 'error' || status === 'failed') c.error++;
        else if (status === 'queued') c.queued++;
        else c.parsing++;
    }
    return c;
}

export function stageLine(counts: Record<string, number>): string {
    const parts: string[] = [];
    if (counts.parsing) parts.push(`${counts.parsing} parsing`);
    if (counts.parsed) parts.push(`${counts.parsed} parsed`);
    if (counts.queued) parts.push(`${counts.queued} queued`);
    if (counts.error) parts.push(`${counts.error} failed`);
    return parts.join(" · ");
}

const ResumeParsingProgress = React.memo(({ screening_id, batch_id }: Props) => {


    const eventSourceRef = useRef<EventSource | null>(null);
    const { data, isError } = useActiveParsingQuery({ screening_id, batch_id });

    const pendingApplications = useRef<Application[]>([]);
    const batchCompleteTimeout = useRef<number | null>(null);
    const BATCH_SIZE = 4;

    const resumes = data?.resumes || [];
    const total = data?.total || 0;

    useEffect(() => {
        if (!screening_id || !batch_id) return;
        if (eventSourceRef.current) return;

        const flushApplications = () => {
            if (pendingApplications.current.length === 0) return;

            const batch = pendingApplications.current;
            pendingApplications.current = [];

            queryClient.setQueryData(
                ApplicationQueryKeys.getApplications(screening_id, 10),
                (oldData: InfiniteData<GetApplicationsResponseType> | undefined) => {
                    if (!oldData) return oldData;

                    const firstPage = oldData.pages[0];
                    if (!firstPage) return oldData;

                    const existingIds = new Set(firstPage.items.map(a => a.id));
                    const newApps = batch.filter(a => !existingIds.has(a.id));

                    return {
                        ...oldData,
                        pages: [
                            {
                                ...firstPage,
                                items: [...newApps, ...firstPage.items],
                            },
                            ...oldData.pages.slice(1),
                        ],
                    };
                }
            );
        };

        const source = new EventSource(`${API_BASE}/api/v1/screenings/${screening_id}/subscribe-events/${batch_id}`);
        eventSourceRef.current = source;

        source.onmessage = (event) => {
            const payload: EventBodyType = JSON.parse(event.data);
            const type = payload.type;

            if (type === "Parsing") {

                queryClient.setQueryData(
                    ResumeParsingQueryKeys.getActiveParsings(screening_id, batch_id),
                    (old: GetParsingResponseType | undefined) => {
                        if (!old) return old;

                        if (payload.status === "success" && payload.data) {
                            pendingApplications.current.push(payload.data);

                            if (pendingApplications.current.length >= BATCH_SIZE) {
                                flushApplications();
                            }
                        }

                        return {
                            ...old,
                            resumes: old.resumes.map(r =>
                                r.id === payload.resume_id
                                    ? { ...r, status: payload.status }
                                    : r
                            ),
                        };
                    }
                );

            } else if (type === "Parsing_Batch_Complete") {
                 if (batchCompleteTimeout.current) {
                    clearTimeout(batchCompleteTimeout.current);
                }
                batchCompleteTimeout.current = window.setTimeout(() => {

                flushApplications();
                console.log("Parsing batch complete event received:", payload);
                queryClient.invalidateQueries({ queryKey: ApplicationQueryKeys.screening(screening_id) });
                queryClient.invalidateQueries({ queryKey: ResumeParsingQueryKeys.getActiveParsings(screening_id, batch_id) });
                queryClient.setQueryData(
                    ActiveBatchesQueryKeys.screening(screening_id),
                    (old: GetActiveBatchesResponse | undefined) => {
                        if (!old) return old;
                        return {
                            ...old,
                            parsing_batch_ids: old.parsing_batch_ids.filter(id => id !== batch_id),
                        };
                    }
                );}, 700);
            }
        };

        source.onerror = (err) => {
            console.error("Subscribed Event Error", err);
        };

        return () => {
            flushApplications();
              if (batchCompleteTimeout.current) {
                clearTimeout(batchCompleteTimeout.current);
            }
            source.close();
            eventSourceRef.current = null;
        };
    }, [screening_id, batch_id]);

    if (!screening_id) {
        return <div className="text-sm text-rose-500">No screening ID provided</div>;
    }

    if (!data || isError) {
        return <div className="text-sm text-rose-500">Error fetching progress data</div>;
    }

    if (resumes.length === 0) {
        return null;
    }

    const counts = countByStage(resumes);
    const completedCount = resumes.filter(r =>
        r.status.toLowerCase() === "success" ||
        r.status.toLowerCase() === "parsed" ||
        r.status.toLowerCase() === "error" ||
        r.status.toLowerCase() === "failed"
    ).length;

    const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const sLine = stageLine(counts);

    return (
        <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
            <AccordionItem value={batch_id} className="border-0">
                <AccordionTrigger className="w-full text-left p-4 hover:no-underline hover:bg-[#FAFAF8] transition-colors [&>svg]:mr-4 [&>svg]:size-5">
                    <div className="flex items-center gap-4 w-full pr-2">
                        <div className="h-8 w-8 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-sm font-semibold text-neutral-800">
                                    Parsing: {completedCount} of {total} processed
                                </p>
                                <span className="text-sm font-bold text-[#0F0F0F] shrink-0 ml-4">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
                                <div className="h-full bg-[#0F0F0F] rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1.5 gap-3">
                                <p className="text-xs text-[#A0A0A0] truncate">
                                    {sLine || "Parsing Resumes..."}
                                </p>
                            </div>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-[#E8E5DF] divide-y divide-[#E8E5DF] max-h-80 overflow-y-auto pt-0 pb-0">
                    {resumes.map((f: ResumeParsingBodyType) => (
                        <PendingResumeRow key={f.id} file={f} type="Parsing" />
                    ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
});

ResumeParsingProgress.displayName = "ResumeParsingProgress";

export default ResumeParsingProgress;
