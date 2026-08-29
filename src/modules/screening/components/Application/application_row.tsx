import type { Application, ApplicationActionStatus } from "@/modules/screening/types/application.type";
import { useSelectedApplications } from "@/modules/screening/hooks/application/custom/useSelectedApplication";
import ProcessingOverlay from "@/modules/screening/components/shared/RowProcessingOverlay"
import { MenuButton, type Option } from "@/modules/screening/components/shared/MenuButton";
import InfoSheet from "@/modules/screening/components/info_sheet";

interface CandidateRowProps {
    candidate: Application;
    selectable: boolean;
    compact: boolean;
    processingStatus: ApplicationActionStatus;
    isOpen: boolean;
    isPending: boolean;
    setAppId: (id: string | null) => void;
    MenuOptions: Option[];
    selected?: boolean;
    toggleSelection: (id: string) => void;
}

export default function CandidateRow({
    candidate,
    selectable,
    processingStatus,
    compact,
    isPending,
    selected = false,
    toggleSelection,
    isOpen,
    setAppId,
    MenuOptions,
}: CandidateRowProps) {

    const { action, isProcessing } = processingStatus;

    
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
        if (isProcessing) return;
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
            e.preventDefault();
        } else {
            setAppId(candidate.id);
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

    const formatName = (name: string) =>
        name
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());

    // Label shown on the overlay while a row action is in-flight
    const actionLabel: Record<NonNullable<typeof action>, string> = {
        download: "Downloading",
        archive: "Archiving",
        unarchive: "Unarchiving",
        delete: "Deleting",
    };

    // total number of visible <td>s in this row, needed for the overlay's colSpan
    const totalColumns =
        1 /* checkbox */ +
        1 /* candidate */ +
        1 /* current role */ +
        1 /* experience */ +
        (!compact ? 3 : 0); /* education + skills + actions */

    const showOverlay = isProcessing && !!action;
    const showCheckbox = selectable && !compact;

    return (
        <tr
            onClick={(e) => {
                if (isProcessing) return;
                if (selectable) {
                    toggleSelection(candidate.id);
                } else {
                    handleRowClick(e);
                }
            }}
            className={`group cursor-pointer transition-colors ${rowBg} ${selected ? "shadow-[inset_2px_0_0_0_#C85A17]" : ""
                }`}
        >

            <ProcessingOverlay colSpan={totalColumns} action={action} isProcessing={isProcessing}  >
                {/* Checkbox */}
                
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
                        className={`h-3.5 w-3.5 cursor-pointer accent-[#060505]
                                    ${compact
                                ? "opacity-0"
                                : (selectable || selected)
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100"}
                                    `}
                    />
                </td>
            

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
                                {formatName(candidate.candidate_name)}
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
                        {candidate.total_experience?.toPrecision(2) ?? "—"}
                    </span>
                </td>

                {/* Education */}
                {!compact && (
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
                )}

                {/* Skills */}
                {!compact && (
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
                )}

                {/* View Details / Actions */}
                {!compact && (
                    <td
                        className="w-24 px-2 py-3 gap-2 text-center align-middle"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <InfoSheet candidate={candidate} disabled={isPending} open={isOpen} />
                        <MenuButton key={candidate.id} options={MenuOptions} data={candidate} />
                    </td>
                )}
                {compact && isOpen && (
                    <td className="hidden" onClick={(e) => e.stopPropagation()}>
                        <InfoSheet candidate={candidate} disabled={isPending} open={isOpen} />
                    </td>
                )}
            </ProcessingOverlay>

        </tr>
    );
}