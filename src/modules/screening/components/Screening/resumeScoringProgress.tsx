import React, { useEffect, useState, useRef } from 'react';
import { useActiveScoringQuery } from '@/modules/screening/hooks/shared/progress.hook';
import type { ResumeScoringBodyType, EventBodyType } from "@/modules/screening/types/progress.type";
import type { GetScoringResponseType} from "@/modules/screening/apis/getActiveScorings";
import type { Application } from "@/modules/screening/types/application.type";
import { PendingResumeRow } from '@/modules/screening/components/shared/ProcessingResumeRow';
import { queryClient } from '@/lib/queryClient';
import { ApplicationQueryKeys, ResumeScoringQueryKeys, ActiveBatchesQueryKeys,ScreeningResultsQueryKeys } from '@/modules/screening/queryKeys';
import type { GetActiveBatchesResponse } from '@/modules/screening/apis/activeBatches';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Props = {
    screening_id: string;
    batch_id: string;
}

export function countByStage(files: ResumeScoringBodyType[]) {
    const c = { queued: 0, scoring: 0, scored: 0, error: 0 } as Record<string, number>;
    for (const f of files) {
        const status = f.status.toLowerCase();
        if (status === 'success' || status === 'scored') c.scored++;
        else if (status === 'error' || status === 'failed') c.error++;
        else if (status === 'queued') c.queued++;
        else c.scoring++;
    }
    return c;
}

export function stageLine(counts: Record<string, number>): string {
    const parts: string[] = [];
    if (counts.scoring) parts.push(`${counts.scoring} scoring`);
    if (counts.scored) parts.push(`${counts.scored} scored`);
    if (counts.queued) parts.push(`${counts.queued} queued`);
    if (counts.error) parts.push(`${counts.error} failed`);
    return parts.join(" · ");
}

const ResumeScoringProgress = React.memo(({ screening_id, batch_id }: Props) => {
 

    const eventSourceRef = useRef<EventSource | null>(null);
    const { data, isError } = useActiveScoringQuery({ screening_id, batch_id });

    const resumes = data?.resumes || [];
    const totalResumes = data?.total || 0;

   

    useEffect(() => {
        if (!screening_id || !batch_id) return;
        if (eventSourceRef.current) return;

        const source = new EventSource(`${API_BASE}/api/v1/screenings/${screening_id}/subscribe-events/${batch_id}`);
        eventSourceRef.current = source;

        source.onmessage = (event) => {
            const payload: EventBodyType = JSON.parse(event.data);
            const type = payload.type;


            if (type === "Scoring") {
                queryClient.setQueryData(
                    ResumeScoringQueryKeys.getActiveScorings(screening_id, batch_id),
                    (old:GetScoringResponseType | undefined) => {
                        if (!old) return old;

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
            } else if (type === "Scoring_Batch_Complete") {
                queryClient.invalidateQueries({ queryKey: ScreeningResultsQueryKeys.screening(screening_id) });
                queryClient.invalidateQueries({ queryKey: ApplicationQueryKeys.screening(screening_id) });
                queryClient.invalidateQueries({ queryKey: ResumeScoringQueryKeys.getActiveScorings(screening_id, batch_id) });
                queryClient.setQueryData(
                    ActiveBatchesQueryKeys.screening(screening_id),
                    (old: GetActiveBatchesResponse | undefined) => {
                        if (!old) return old;
                        return {
                            ...old,
                            scoring_batch_ids: old.scoring_batch_ids.filter(id => id !== batch_id),
                        };
                    }
                );
            }
        };

        source.onerror = (err) => {
            console.error("Subscribed Event Error", err);
        };

        return () => {
            source.close();
            eventSourceRef.current = null;
        };
    }, [screening_id, batch_id]);

    if (!screening_id) {
        return <div className="text-sm text-rose-500">No screening ID provided</div>;
    }

    if (!resumes || isError) {
        return <div className="text-sm text-rose-500">Error fetching progress data</div>;
    }

    if (totalResumes === 0) {
        return null;
    }

    const counts = countByStage(resumes);
    const completedCount = resumes.filter(r =>
        r.status.toLowerCase() === "success" ||
        r.status.toLowerCase() === "scored" ||
        r.status.toLowerCase() === "error" ||
        r.status.toLowerCase() === "failed"
    ).length;

    const pct = totalResumes > 0 ? Math.round((completedCount / totalResumes) * 100) : 0;
    const sLine = stageLine(counts);

    return (
        <Accordion type="single" collapsible className="w-full bg-white rounded-2xl border border-[#E8E5DF] overflow-hidden">
            <AccordionItem value={batch_id} className="border-0">
                <AccordionTrigger className="w-full text-left p-4 hover:no-underline hover:bg-[#FAFAF8] transition-colors [&>svg]:mr-4 [&>svg]:size-5">
                    <div className="flex items-center gap-4 w-full pr-2">
                        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className="text-sm font-semibold text-neutral-800">
                                    Scoring: {completedCount} of {totalResumes} processed
                                </p>
                                <span className="text-sm font-bold text-indigo-600 shrink-0 ml-4">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-[#E8E5DF] rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex items-center justify-between mt-1.5 gap-3">
                                <p className="text-xs text-[#A0A0A0] truncate">
                                    {sLine || "Scoring Resumes..."}
                                </p>
                            </div>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="border-t border-[#E8E5DF] divide-y divide-[#E8E5DF] max-h-80 overflow-y-auto pt-0 pb-0">
                    {resumes.map((f: ResumeScoringBodyType) => (
                        <PendingResumeRow key={f.id} file={f} type="Scoring" />
                    ))}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
});

ResumeScoringProgress.displayName = "ResumeScoringProgress";

export default ResumeScoringProgress;
