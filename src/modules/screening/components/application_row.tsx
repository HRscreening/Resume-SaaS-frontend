import { Application } from "@/modules/screening/types/application.type";
import InfoSheet, {
    useAnalysisSheetOpenId,
    setOpenAnalysisSheet,
} from "@/modules/screening/components/info_sheet";
import { useSelectedApplications } from "@/modules/screening/hooks/useSelectedApplication";
import { ScanSearch } from "lucide-react";
import { Tooltip, TooltipTrigger,TooltipContent } from "@/components/ui/tooltip";
import { useScreeningApplicationsMutation } from "@/modules/screening/hooks/application.hook";




interface CandidateRowProps {
    candidate: Application;
    selectable: boolean;
}


function ScreenSingleResumeTrigger(
    {candidate_name,handleScreenResume,disabled=false}:{candidate_name:string,handleScreenResume:()=>void,
    disabled:boolean

    }) {
    

    // return 
    return <Tooltip>
                <TooltipTrigger asChild>
                  <button
                  disabled={disabled}
                    onClick={handleScreenResume}
                    className={``}
                  >
                   <ScanSearch className="text-[#A0A0A0] hover:text-[#C85A17]" size={16}/>

                  </button>

                </TooltipTrigger>
            <TooltipContent>
                {`Screen ${candidate_name}'s Resume`}
            </TooltipContent>
            </Tooltip>

}



export default function CandidateRow({
    candidate,
    selectable,
}: CandidateRowProps) {
    const openId = useAnalysisSheetOpenId();
    const isOpen = openId === candidate.id;


    const { screening_id,selectedApplications, toggleSelection} = useSelectedApplications();
    const { isPending} = useScreeningApplicationsMutation();

    const selected = selectedApplications.has(candidate.id);

    const stickyBg = selected
        ? "bg-[#FBF1E7] group-hover:bg-[#F8E9D9]"
        : isOpen
            ? "bg-[#FBF1E7]"
            : "bg-white group-hover:bg-[#FAFAF8]";

    const rowBg = selected
        ? "bg-[#FBF1E7] hover:bg-[#F8E9D9]"
        : isOpen
            ? "bg-[#FBF1E7]"
            : "hover:bg-[#FAFAF8]";

    function handleRowClick(e: React.MouseEvent) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleSelection(candidate.id);
        } else {
            setOpenAnalysisSheet(candidate.id);
        }
    }

    const currentJob = candidate.candidate_current_job;
    const currentCompany = candidate.current_company ?? candidate.work_ex?.[0]?.company;
    const primaryEducation = candidate.education?.[0];
    const skillsCount = candidate.skills?.length ?? 0;
    const visibleSkills = candidate.skills?.slice(0, 2) ?? [];

    const initials =
        candidate.candidate_name
            ?.split(" ")
            .filter(Boolean)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "NA";




    return (
        <tr

            onClick={(e) => {
                if (selectable) {
                    toggleSelection(candidate.id);
                } else {
                    handleRowClick(e);
                }
            }}
            className={` group cursor-pointer transition-colors ${rowBg} ${selected ? "shadow-[inset_2px_0_0_0_#C85A17]" : ""
                }`}
        >

            {/* Checkbox */}
            {selectable && (
                <td
                    className={`px-3 py-3 align-middle ${stickyBg}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => {
                            toggleSelection(candidate.id);
                        }}
                        className="h-4 w-4 cursor-pointer accent-[#C85A17]"
                    />
                </td>
            )}

            {/* Candidate */}
            <td
                className={`pl-3 pr-2 py-3 align-middle sticky left-0 z-1 transition-colors ${stickyBg}`}
            >
                <div className="flex gap-3 items-center min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[#FBF1E7] border border-[#E8E5DF] flex items-center justify-center shrink-0 overflow-hidden">
                        <span className="text-xs font-semibold text-[#C85A17]">
                            {initials}
                        </span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#0F0F0F] truncate">
                            {candidate.candidate_name}
                        </p>

                        {candidate.candidate_email && (
                            <p
                                className="text-[11px] text-[#737373] truncate"
                                title={candidate.candidate_email}
                            >
                                {candidate.candidate_email}
                            </p>
                        )}
                    </div>
                </div>
            </td>

            {/* Current Role */}
            <td className="px-2 py-3 align-middle">
                <div className="min-w-0">
                    <p
                        className="text-sm font-medium text-[#0F0F0F] truncate"
                        title={currentJob ?? "—"}
                    >
                        {currentJob ?? "—"}
                    </p>
                    <p
                        className="text-[11px] text-[#737373] truncate"
                        title={currentCompany ?? "—"}
                    >
                        {currentCompany ?? "—"}
                    </p>
                </div>
            </td>

            {/* Experience */}
            <td className="px-2 py-3 align-middle text-center">
                <span className="text-sm font-medium text-[#0F0F0F]">
                    {candidate.total_experience ?? "—"}
                </span>
            </td>

            {/* Education */}
            <td className="px-2 py-3 align-middle">
                <div className="min-w-0">
                    <p
                        className="text-sm font-medium text-[#0F0F0F] truncate"
                        title={primaryEducation?.institution ?? "—"}
                    >
                        {primaryEducation?.institution ?? "—"}
                    </p>
                    <p className="text-[11px] text-[#737373] truncate">
                        {primaryEducation?.degree ?? "—"}
                    </p>
                </div>
            </td>

            {/* Skills */}
            <td className="px-2 py-3 align-middle">
                <div className="flex flex-wrap justify-center gap-1">
                    {visibleSkills.map((skill, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center h-5 px-2 rounded-full bg-[#F5F3EE] text-[10px] font-medium text-[#404040] truncate max-w-20"
                            title={skill}
                        >
                            {skill}
                        </span>
                    ))}
                    {skillsCount > 2 && (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full bg-[#E8E5DF] text-[10px] font-semibold text-[#737373]">
                            +{skillsCount - 2}
                        </span>
                    )}
                    {skillsCount === 0 && (
                        <span className="text-[11px] text-[#A0A0A0]">—</span>
                    )}
                </div>
            </td>

            {/* View Details */}
            <td
                className="w-20 px-2 py-3 text-center align-middle"
                onClick={(e) => e.stopPropagation()}
            >
                <InfoSheet candidate={candidate} disabled={isPending}/>
            </td>
        </tr>
    );
}