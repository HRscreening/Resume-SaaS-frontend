import CandidateAnalysisSheet from "@/components/candidates/CandidateAnalysisSheet";
import { Pagination } from "@/components/screening/Pagination";
import { MultiSelectPopover } from "@/modules/screening/components/shared/filters/MultiSelectPopover";
import { getTier } from "@/lib/tier";
import { ArrowDown, ArrowUp, ArrowUpDown, Briefcase, Search, Sparkles } from "lucide-react";
import type { CandidateOverview, CandidateDetails,SortField,SortRule } from "@/types/candidate.type";
import CandidateOptionsMenu from "@/components/candidates/candidateOptionsMenu";

interface CandidateRepositoryTableProps {
    candidates: CandidateOverview[];
    isLoading: boolean;
    handleSort: (field: SortField) => void;
    sortRule?: SortRule;
    handleRowClick: (candidate: CandidateOverview) => void;
}

const Candidates = ({
    candidates,
    isLoading,
    handleSort,
    sortRule,
    handleRowClick,
}: CandidateRepositoryTableProps) => {



    return (


        <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed min-w-[900px]">
                    <colgroup>
                        <col className="w-[240px]" />
                        <col className="w-[200px]" />
                        <col className="w-[180px]" />
                        <col className="w-[240px]" />
                        <col className="w-[110px]" />
                        <col className="w-[110px]" />
                        <col className="w-[100px]" />
                    </colgroup>
                    <thead>
                        <tr className="border-b border-[#E8E5DF] bg-[#F5F3EE]">
                            {/* Candidate Name Sortable Header */}
                            <th className="pl-4 pr-2 py-3 text-left">
                                <button
                                    onClick={() => handleSort("candidate_name")}
                                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                                >
                                    Candidate
                                    {sortRule?.field === "candidate_name" ? (
                                        sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                    ) : (
                                        <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                                    )}
                                </button>
                            </th>
                            <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                                Current Role
                            </th>
                            <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                                Applied Roles
                            </th>
                            <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                                Skills
                            </th>
                            {/* Best Score Sortable Header */}
                            <th className="px-3 py-3 text-center">
                                <button
                                    onClick={() => handleSort("best_score")}
                                    className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                                >
                                    Best Score
                                    {sortRule?.field === "best_score" ? (
                                        sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                    ) : (
                                        <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                                    )}
                                </button>
                            </th>
                            {/* Avg Score Sortable Header */}
                            <th className="px-3 py-3 text-center">
                                <button
                                    onClick={() => handleSort("avg_score")}
                                    className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                                >
                                    Avg Score
                                    {sortRule?.field === "avg_score" ? (
                                        sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                                    ) : (
                                        <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                                    )}
                                </button>
                            </th>
                            {/* Resumes Count Sortable Header */}
                            <th className="pr-4 pl-2 py-3 text-center">
                              Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E5DF]">
                        
                        {isLoading ?  
                        <div className="w-full py-12 text-center text-sm text-[#737373]">
                            Loading candidates...
                        </div>
                        : candidates.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#737373]">
                                    No candidates found matching your search and filter criteria.
                                </td>
                            </tr>
                        ) : (
                            candidates.map((candidate) =>
                                <CanidateRepositoryTableRow key={candidate.id} candidate={candidate} handleRowClick={handleRowClick} />
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>


    );
};

export default Candidates;


interface CandidateRepositoryTableRowProps {
    candidate: CandidateOverview;
    handleRowClick: (candidate: CandidateOverview) => void;
}

function CanidateRepositoryTableRow({ candidate, handleRowClick }: CandidateRepositoryTableRowProps) {
    const initials = candidate.candidate_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
    const bestScore = candidate.best_score || 0;
    const avgScore = candidate.avg_score || 0;
    const tier = getTier(bestScore);

    // Mock Email
    const mockEmail = candidate.candidate_name.toLowerCase().replace(/\s+/g, "") + "@example.com";

    return (
        <tr
            key={candidate.id}
            onClick={() => handleRowClick(candidate)}
            className="group hover:bg-[#FAFAF8] cursor-pointer transition-colors"
        >
            {/* Name / Profile Cell */}
            <td className="pl-4 pr-2 py-3.5 align-middle sticky left-0 z-10 bg-white group-hover:bg-[#FAFAF8] transition-colors border-r border-[#FAF9F6] shadow-[2px_0_5px_0_rgba(0,0,0,0.01)]">
                <div className="flex gap-3 items-center min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#FBF1E7] border border-[#F0D9C0] flex items-center justify-center shrink-0">
                        <span className="text-[12px] font-bold text-[#C85A17] leading-none">
                            {initials}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0F0F0F] truncate group-hover:text-[#C85A17] transition-colors">
                            {candidate.candidate_name}
                        </p>
                        <p className="text-[11px] text-[#737373] truncate mt-0.5">
                            {mockEmail}
                        </p>
                    </div>
                </div>
            </td>

            {/* Current Job Cell */}
            <td className="px-3 py-3.5 align-middle">
                <p className="text-xs text-[#404040] truncate flex items-center gap-1.5">
                    <Briefcase size={12} className="text-[#A0A0A0]" />
                    {candidate.candidate_current_job || <span className="text-[#D4D4D4] italic">None</span>}
                </p>
            </td>

            {/* Applied Roles Cell */}
            <td className="px-3 py-3.5 align-middle">
                <div className="flex flex-wrap gap-1 max-w-full">
                    {candidate.applied_roles.slice(0, 1).map((role) => (
                        <span
                            key={role}
                            className="inline-flex items-center h-5.5 px-2 rounded-full text-[10px] font-semibold bg-[#FBF1E7] text-[#C85A17] border border-[#F0D9C0] truncate max-w-full"
                            title={role}
                        >
                            {role}
                        </span>
                    ))}
                    {candidate.applied_roles.length > 1 && (
                        <span
                            className="inline-flex items-center h-5.5 px-1.5 rounded-full text-[10px] font-semibold bg-[#F5F3EE] text-[#737373] border border-[#E8E5DF]"
                            title={candidate.applied_roles.slice(1).join(", ")}
                        >
                            +{candidate.applied_roles.length - 1} more
                        </span>
                    )}
                </div>
            </td>

            {/* Skills Cell */}
            <td className="px-3 py-3.5 align-middle">
                <div className="flex flex-wrap gap-1 max-w-full">
                    {candidate.skills?.slice(0, 3).map((skill) => (
                        <span
                            key={skill}
                            className="inline-flex items-center h-5.5 px-2 rounded-md text-[10px] font-medium bg-[#F5F3EE] text-[#404040] whitespace-nowrap"
                        >
                            {skill}
                        </span>
                    ))}
                    {candidate.skills && candidate.skills.length > 3 && (
                        <span className="inline-flex items-center h-5.5 px-1.5 rounded-md text-[10px] font-semibold bg-[#0F0F0F] text-white">
                            +{candidate.skills.length - 3}
                        </span>
                    )}
                </div>
            </td>

            {/* Best Score Cell */}
            <td className="px-3 py-3.5 text-center align-middle">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-[#0F0F0F] leading-none">
                        {Math.round(bestScore)}
                    </span>
                    <span
                        className="inline-flex items-center gap-1 text-[9px] font-semibold"
                        style={{ color: tier.dot }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                        {tier.label}
                    </span>
                </div>
            </td>

            {/* Avg Score Cell */}
            <td className="px-3 py-3.5 text-center align-middle">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-[#404040] leading-none">
                        {avgScore?.toFixed(1)}
                    </span>
                    <div className="w-12 h-1 bg-[#E8E5DF] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[#737373]"
                            style={{ width: `${avgScore}%` }}
                        />
                    </div>
                </div>
            </td>

            {/* Resumes Count Cell */}
            <td className="pr-4 pl-2 py-3.5 text-center align-middle">
                <CandidateOptionsMenu />
            </td>
        </tr>
    );
}