import { Pagination } from "@/components/screening/Pagination";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";

import { Application } from "@/modules/screening/types/application.type";
import CandidateRow from "@/modules/screening/components/application_row";
import { useSelectedApplications } from "@/modules/screening/hooks/useSelectedApplication";


interface ApplicationTableProps {

    candidates: Application[];
    selectable: boolean;
    total: number;
    totalPages: number;
    pageSize: number;
    page: number;
    showSelectedOnly: boolean;
    onPageChange: (page: number) => void;
    onLoadMore?: () => Promise<unknown>;
    hasMore?: boolean;
    loadingMore?: boolean;
}

export function ApplicationTable({
    candidates,
    selectable = false,
    pageSize = 10,
    showSelectedOnly,
    onPageChange,
    hasMore,
    loadingMore,
    onLoadMore
}: ApplicationTableProps) {

    const [loading, setLoading] = useState<boolean>(false);

    const { ref: loadMoreRef, inView } = useInView({ threshold: 0, rootMargin: "300px", });
    const { selectedApplications, togglePageSelection } = useSelectedApplications();


    useEffect(() => {
        if (!inView) return;
        if (!hasMore) return;
        if (loadingMore) return;

        console.log("inView:", inView);
        console.log("hasMore:", hasMore);
        onLoadMore?.();
    }, [inView, hasMore, loadingMore, onLoadMore]);

    const visibleIds = candidates.map(c => c.id);

    const visibleApplications = candidates.map(candidate => (candidate.id));

    const allVisibleSelected =
        visibleIds.length > 0 &&
        visibleIds.every(id => selectedApplications.has(id));

    const someVisibleSelected =
        visibleIds.some(id => selectedApplications.has(id)) &&
        !allVisibleSelected;


    return (
        <div className="space-y-4">
            {/* Table */}
            {/* <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
                <div className="overflow-x-auto"> */}
            <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden">
                <div className="max-h-[65vh] overflow-y-auto overflow-x-auto">
                    <table className="w-full text-sm table-fixed">

                        <thead className="sticky top-0 z-20 bg-[#F5F3EE]">
                            <tr className="border-b border-[#E8E5DF] bg-[#F5F3EE]">

                                {selectable && (
                                    <th className="w-10 px-3 py-2.5 bg-[#F5F3EE]">
                                        <input
                                            type="checkbox"
                                            aria-label={allVisibleSelected ? "Deselect all on this page" : "Select all on this page"}
                                            checked={allVisibleSelected}
                                            ref={(el) => { if (el) el.indeterminate = someVisibleSelected; }}
                                            onChange={() =>
                                                togglePageSelection(visibleApplications, !allVisibleSelected)}
                                            className="h-4 w-4 cursor-pointer accent-[#C85A17]"
                                        />
                                    </th>
                                )}

                                <th className="pl-3 pr-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide sticky left-0 z-10 bg-[#F5F3EE]">
                                    Candidate
                                </th>

                                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                                    Current Role
                                </th>

                                <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                                    <span className="block">Experience</span>
                                    <span className="block font-normal text-[10px] text-[#BDB8AE] normal-case tracking-normal">(yrs)</span>
                                </th>

                                <th className="px-2 py-2.5 text-left text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                                    Education
                                </th>

                                <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                                    Skills
                                </th>

                                <th className="w-20 pl-2 pr-5 py-2.5 text-center text-[11px] font-semibold text-[#737373] uppercase tracking-wide">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[#E8E5DF]">
                            {loading ? (
                                Array.from({ length: pageSize }).map((_, i) => (
                                    <SkeletonRow
                                        key={`sk-${i}`}
                                        selectable={selectable}
                                    />
                                ))
                            ) : candidates.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={selectable ? 7 : 6}
                                        className="px-5 py-10 text-center text-sm text-[#737373]"
                                    >
                                        No candidates found.
                                    </td>
                                </tr>
                            ) : candidates.map((c) => (
                                <CandidateRow
                                    key={c.id}
                                    candidate={c}
                                    selectable={selectable}
                                />
                            ))}
                        </tbody>
                    </table>

                    {hasMore && (
                        <div ref={loadMoreRef} className="w-full">
                            <div className="w-full flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C85A17] border-t-transparent" />
                                <span>Loading more applications...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>



        </div>
    );
}


function SkeletonRow({
    selectable,
}: {
    selectable: boolean;
}) {
    return (
        <tr className="animate-pulse">
            {selectable && (
                <td className="px-3 py-3 align-middle bg-white">
                    <div className="h-4 w-4 rounded bg-[#E8E5DF]" />
                </td>
            )}

            <td className="pl-3 pr-2 py-3 align-middle sticky left-0 z-1 bg-white">
                <div className="flex gap-2 items-center">
                    <div className="h-8 w-8 rounded-full bg-[#E8E5DF] shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-32 rounded bg-[#E8E5DF]" />
                        <div className="h-2.5 w-24 rounded bg-[#F0EDE8]" />
                    </div>
                </div>
            </td>

            <td className="px-2 py-3 align-middle">
                <div className="h-3 w-20 rounded bg-[#E8E5DF]" />
            </td>

            <td className="px-2 py-3 align-middle">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="h-3.5 w-6 rounded bg-[#E8E5DF]" />
                </div>
            </td>

            <td className="px-2 py-3 align-middle">
                <div className="h-3 w-24 rounded bg-[#E8E5DF]" />
            </td>

            <td className="px-2 py-3 align-middle">
                <div className="flex justify-center gap-1">
                    <div className="h-5 w-12 rounded-full bg-[#F0EDE8]" />
                    <div className="h-5 w-12 rounded-full bg-[#F0EDE8]" />
                </div>
            </td>

            <td className="px-2 py-3 align-middle">
                <div className="h-5 w-5 rounded bg-[#F0EDE8] mx-auto" />
            </td>
        </tr>
    );
}
