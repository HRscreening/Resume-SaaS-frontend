import { useCallback } from "react";
import type { HiringStage, MatchTierId, RangeFilter, RubricCategory, StagesMap } from "@/types";
import type { RankedCandidate, ScreeningActionStatus } from "@/modules/screening/types/screening.type";
import { getTier } from "@/lib/tier";
import ProcessingOverlay from "@/modules/screening/components/shared/RowProcessingOverlay"
import AnalysisSheet from "@/modules/screening/components/Screening/AnalysisSheet";
import { StageSelect } from "@/components/screening/StageSelect";
import { MenuButton, type Option } from "@/modules/screening/components/shared/MenuButton";
import ScoreProgressBar from "@/modules/screening/components/shared/ProgressBars/ScoreProgressBar";
import { generateCategoryProgressBarsInput } from "@/modules/screening/utils/Screeening.utils";


interface CandidateRowProps {
    MenuOptions: Option[];
    processingStatus: ScreeningActionStatus;
    screening_id: string;
    candidate: RankedCandidate;
    compact: boolean;
    stage: HiringStage;
    stages: StagesMap;
    onStageChange: (s: HiringStage) => void;
    onManageStages?: () => void;
    disableStageChange?: boolean;
    selectable: boolean;
    selected: boolean;
    onToggle?: (id: string, e: React.MouseEvent | React.ChangeEvent) => void;
    index: number;
    isOpen: boolean;
    setScreenId: (id: string | null) => void;
}

export function CandidateRow({
    screening_id,
    MenuOptions,
    processingStatus,
    candidate, compact, stage, stages, onStageChange, onManageStages, disableStageChange = false,
    selectable, selected, onToggle,
    index, isOpen, setScreenId
}: CandidateRowProps) {


    const { action, isProcessing } = processingStatus;

    //! Once backend sends the data in a more structured way, we can remove this function and use the structured data directly.
    const formatName = (name: string) =>
        name
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());

    // Sticky-left cells need an explicit background so the scrolled-under
    // content doesn't bleed through. That background paints over the <tr>'s
    // hover color, which is why the Candidate cell looked dead on hover.
    // Use `group` on the row + `group-hover` on the sticky cell so they stay
    // in sync with the rest of the row.
    const stickyBg = selected ? "bg-[#FBF1E7] group-hover:bg-[#F8E9D9]" : isOpen ? "bg-[#FBF1E7]" : "bg-white group-hover:bg-[#FAFAF8]";
    const rowBg = selected ? "bg-[#FBF1E7] hover:bg-[#F8E9D9]" : isOpen ? "bg-[#FBF1E7]" : "hover:bg-[#FAFAF8]";

    function handleRowClick(e: React.MouseEvent) {
        if (selectable) {
            onToggle?.(candidate.resume_id, e);
        } else {
            setScreenId(candidate.resume_id);
        }
    }



    const tier: { label: string; dot: string } = getTier(candidate.overall_score);

    const progressBarsInput = generateCategoryProgressBarsInput(candidate.category_scores);

    const totalColumns =
        1 /* checkbox */+
        1 /* candidate */ +
        1 /* current role */ +
        1 /* experience */ +
        1 /* score */ +
        (!compact ? 4 : 0); /* education + skills + actions */

    return (
        <tr
            onClick={handleRowClick}
            className={`group cursor-pointer transition-colors ${rowBg} ${selected ? "shadow-[inset_2px_0_0_0_#C85A17]" : ""}`}
        >

            <ProcessingOverlay colSpan={totalColumns} action={action} isProcessing={isProcessing}  >

                <td className={`w-10 px-3 py-3 align-middle ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        aria-label={`Select ${candidate.candidate_name ?? candidate.filename}`}
                        checked={selected}
                        onChange={(e) => onToggle?.(candidate.resume_id, e)}
                        onClick={(e) => {
                            // Forward shift/ctrl modifiers to the toggle handler via the click event.
                            if ((e as React.MouseEvent).shiftKey || (e as React.MouseEvent).ctrlKey || (e as React.MouseEvent).metaKey) {
                                e.preventDefault();
                                onToggle?.(candidate.resume_id, e as React.MouseEvent);
                            }
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

                {/* Candidate cell — sticky to the left so name stays visible during any
          horizontal scroll. Rank now lives inside the avatar circle instead
          of as a separate badge over name initials. */}
                <td className={`pl-3 pr-2 py-3 align-middle sticky left-0 z-1 transition-colors ${stickyBg}`}>
                    <div className="flex gap-2 items-center min-w-0">
                        <div className="h-8 w-8 rounded-full bg-[#FBF1E7] flex items-center justify-center shrink-0" title={`Rank ${candidate.rank}`}>
                            <span className="text-[12px] font-bold text-[#C85A17] leading-none">
                                {index + 1}
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#0F0F0F] truncate">
                                {formatName(candidate.candidate_name ?? candidate.filename)}
                            </p>
                            {(candidate.candidate_email || candidate.candidate_phone) && (
                                <p className="text-[11px] text-[#737373] truncate">
                                    {candidate.candidate_email ?? candidate.candidate_phone}
                                </p>
                            )}
                        </div>
                    </div>
                </td>
                {/* {!compact && ( */}
                <td className="px-2 py-3 align-middle">
                    <p className="text-xs text-[#404040] truncate font-semibold" title={candidate.candidate_current_job ?? undefined}>
                        {candidate.candidate_current_job ?? <span className="text-[#D4D4D4]">—</span>}
                    </p>
                    {
                        candidate.candidate_current_company && (
                            <p className="text-[11px] text-[#737373] truncate" title={candidate.candidate_current_company}>
                                {candidate.candidate_current_company}
                            </p>)

                    }
                </td>
                {/* )} */}
                {/* {!compact && ( */}
                <td className="px-2 py-3 align-middle text-center">
                    <span className="text-sm font-medium text-[#0F0F0F]">
                        {candidate.experience_years?.toPrecision(2) ?? "—"}
                    </span>
                </td>
                {/* )} */}
                <td className="px-2 py-3 text-center align-middle">
                    <ScoreProgressBar items={progressBarsInput} overall_score={candidate.overall_score} />
                </td>
                {/* {!compact && ( */}
                <td className="px-2 py-3 text-center align-middle">
                    <VoiceCell candidate={candidate} />
                </td>
                {/* )} */}

                <td className="px-2 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                    <StageSelect value={stage} stages={stages} onChange={onStageChange} onManage={onManageStages} disabled={disableStageChange} />
                </td>
                <td className="px-2 py-3 align-middle">
                    <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F0F0F] whitespace-nowrap"
                        title={tier.label}
                    >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                        <span className="truncate">{tier.label}</span>
                    </span>
                </td>
                {!compact && (
                    <td className="px-2 py-3 text-center flex align-middle" onClick={(e) => e.stopPropagation()}>
                        <AnalysisSheet resume_id={candidate.resume_id} />
                        <MenuButton key={candidate.resume_id} options={MenuOptions} data={candidate} />

                    </td>
                )}
                {compact && isOpen && (
                    <td className="hidden" onClick={(e) => e.stopPropagation()}>
                        <AnalysisSheet resume_id={candidate.resume_id} />
                    </td>
                )}
            </ProcessingOverlay>

        </tr>
    );
}

export function SkeletonRow({
    compact, selectable,
}: {
    categories?: RubricCategory[];
    compact: boolean;
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
            <td className="px-2 py-3 align-middle text-center">
                <div className="h-3 w-8 rounded bg-[#E8E5DF] mx-auto" />
            </td>
            <td className="px-2 py-3 align-middle text-center">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="h-3.5 w-6 rounded bg-[#E8E5DF]" />
                    <div className="h-1 w-10 rounded-full bg-[#F0EDE8]" />
                </div>
            </td>
            <td className="px-2 py-3 align-middle text-center">
                <div className="h-3 w-10 rounded bg-[#E8E5DF] mx-auto" />
            </td>
            <td className="px-2 py-3 align-middle">
                <div className="h-7 w-20 rounded-full bg-[#F0EDE8]" />
            </td>
            <td className="px-2 py-3 align-middle">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#E8E5DF]" />
                    <div className="h-3 w-12 rounded bg-[#E8E5DF]" />
                </div>
            </td>
            {!compact && (
                <td className="px-2 py-3 align-middle">
                    <div className="h-5 w-5 rounded bg-[#F0EDE8] mx-auto" />
                </td>
            )}
        </tr>
    );
}


/**
 * Voice-round outcome for one candidate, at a glance.
 *
 * The score alone would mislead: a call still ringing, one that never
 * connected, and one that produced a real interview are three different states
 * and only the last has a number worth reading. So the cell shows the STATE
 * first and the score only once there is one.
 */
function VoiceCell({ candidate }: { candidate: RankedCandidate }) {
    const status = candidate.voice_status ?? null;
    const score = candidate.voice_score ?? null;
    const rec = candidate.voice_recommendation ?? null;

    if (!status) {
        return <span className="text-xs text-[#D4D4D4]" title="No call placed yet">—</span>;
    }

    if (status !== "ready") {
        const label: Record<string, string> = {
            queued: "Queued",
            calling: "Calling",
            in_interview: "In call",
            processing: "Scoring",
            unreachable: "No answer",
        };
        const pending = status === "calling" || status === "in_interview" || status === "processing";
        return (
            <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${status === "unreachable" ? "text-amber-700" : "text-[#737373]"
                    }`}
            >
                {pending && (
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#C85A17]" aria-hidden="true" />
                )}
                {label[status] ?? status}
            </span>
        );
    }

    const tone =
        rec === "advance" ? "text-green-700" : rec === "reject" ? "text-red-600" : "text-[#0F0F0F]";
    return (
        <div className="flex flex-col items-center gap-0.5" title={rec ? `Recommendation: ${rec}` : undefined}>
            <span className={`text-sm font-bold leading-none ${tone}`}>
                {score == null ? "—" : Math.round(score)}
            </span>
        </div>
    );
}