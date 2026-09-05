import { useState } from 'react'
import { useSelectedCandidates } from "@/modules/screening/hooks/screening/custom/useSelectedCandidates"
import { ANALYSIS_SHEET_WIDTH } from "@/modules/screening/components/Screening/AnalysisSheet";
import {
  type LucideIcon,
  Download,
  Plus,
  Share2,
  PhoneCall,
  RefreshCw,
  FileText,
  Archive,
  ArchiveRestore,
  Trash2,
  CirclePlay,
  ClipboardPenLine
} from 'lucide-react'
import LoadingSpinner from '@/modules/screening/components/shared/LoadingSpinner'
import { toast } from 'sonner'
import type { StagesMap } from "@/types";
import { ResumeSections } from "@/modules/screening/types/screening.type"
import { useMultiScoredResumeUtility, type MultiMutationOptions } from "@/modules/screening/hooks/screening/queries/screening.query"
import { archiveResumeMulti, deleteResumeMulti, unarchiveResumeMulti, downloadSelectedResumes, callSelectedScreenings, exportSelectedScreenings, rescoreScreenings, changeScreeningsStage, shareScreenings } from "@/modules/screening/apis/screenings.api"
import { useScoringMutation } from "@/modules/screening/hooks/shared/useScoringMutation"
import { UtilityButton } from "@/modules/screening/components/shared/MultiSelectUtilityButton"
import MultiShareDialog from "@/modules/screening/components/shared/MultiShareDialog";
import { useNavigate } from "@tanstack/react-router"
import { useAccount } from "@/hooks/useAccount"


import {
  getStageMeta,
  sortedStages,
  tintColor,
  shadeColor,
  type StageEntry,
} from "@/lib/stages";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"



function getIdsFromSet(set: Set<string>): string[] {
  return Array.from(set);
}

interface CandidateMultiSelectToolBarProps {
  type: ResumeSections,
  isMultiSelectMode?: boolean;
  setIsMultiSelectMode: (value: boolean) => void;
  analysisOpen: boolean;
  stages: StagesMap | undefined | null;
}

const CandidateMultiSelectToolBar = ({
  type,
  isMultiSelectMode = false,
  setIsMultiSelectMode,
  analysisOpen,
  stages
}: CandidateMultiSelectToolBarProps) => {

  const navigate = useNavigate()
  const { screening_id, selectedCandidates, clearSelection, showSelectedOnly, setShowSelectedOnly } = useSelectedCandidates()
  const { canWrite } = useAccount()

  const [isResumeDownloading, setIsResumeDownloading] = useState(false)

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);


  function cancelMultiSelectMode() {
    setIsMultiSelectMode(false)
    clearSelection()
  }


  const totalSelected = selectedCandidates.size

  const multiArchiveMutation = useMultiScoredResumeUtility(archiveResumeMulti, TOAST_MESSAGES.ARCHIVE)
  const multiUnarchiveMutation = useMultiScoredResumeUtility(unarchiveResumeMulti, TOAST_MESSAGES.UNARCHIVE)
  const multiDeleteMutation = useMultiScoredResumeUtility(deleteResumeMulti, TOAST_MESSAGES.DELETE)
  const multiCallMutation = useMultiScoredResumeUtility(callSelectedScreenings)
  const multiExportMutation = useMultiScoredResumeUtility(exportSelectedScreenings, TOAST_MESSAGES.EXPORT)
  const multiRescoreMutation = useScoringMutation(TOAST_MESSAGES.RESCORE)
  const multiChangeStageMutation = useMultiScoredResumeUtility(changeScreeningsStage, TOAST_MESSAGES.CHANGE_STAGE)
  const multiShareMutation = useMultiScoredResumeUtility(shareScreenings, TOAST_MESSAGES.SHARE)

  const closeToolBar = () => {
    setIsMultiSelectMode(false)
    clearSelection()
  }

  const RescoreOptions: RescoreOption[] = [
    {
      label: "Edit Rubric",
      onClick: () => {
        navigate({
          to: "/screenings/$id/rubric",
          params: {
            id: screening_id,
          },
        search: (prev) => prev,
        });
      },
      icon: ClipboardPenLine,
    },
    {
      label: "Continue",
      onClick: handleRescore,
      icon: CirclePlay,
    },
  ];



  async function handleExport() {
    try {
      // const { blob, filename } = await exportResults(id, queryState);
      const { blob, filename } = await multiExportMutation.mutateAsync({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedCandidates) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `${"results"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export resumes");
    }
  }

  async function handleResumeDownload() {
    setIsResumeDownloading(true);
    try {
      const { blob, filename } = await downloadSelectedResumes({
        screeningId: screening_id,
        resumeIds: getIdsFromSet(selectedCandidates),
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? "resumes.zip";

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download resumes");
    }
    setIsResumeDownloading(false);
  }

  async function handleCall() {
    try {
      if (selectedCandidates.size > 10) {
        toast.error("You can only initiate calls for 10 candidates at a time");
        return;
      }

      const res = await multiCallMutation.mutateAsync({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedCandidates) }, { onSuccess: closeToolBar });

      if (res) {

        if (res.created.length === 0) {
          toast.error(`Failed to initiate calls for candidates`);
        }
        else {
          toast.success(`Calls initiated successfully for ${res.created.length} candidates`);
        }

      }
    }
    catch {
      toast.error("Failed to initiate calls");
    }

  }

  async function handleShare(emails: string[], note?: string) {

    try {

      const resumeIds = getIdsFromSet(selectedCandidates)

      if (resumeIds.length === 0) {
        toast.error("No candidates selected for Screening.");
        return;
      }

      const res = await multiShareMutation.mutateAsync({ screeningId: screening_id, resumeIds: resumeIds, emails, note },{ onSuccess: closeToolBar });
      setIsShareDialogOpen(false);
    }
    catch {
      toast.error("Failed to share resumes");
    }


  }



  async function handleRescore() {
    if (selectedCandidates.size === 0) {
      toast.error("No candidates selected for Screening.");
      return;
    }

    try {
      const resume_ids = getIdsFromSet(selectedCandidates);
      const res = await multiRescoreMutation.mutateAsync({ screeningId: screening_id, resumeIds: resume_ids, isRescore: true });
      toast.success(res.message || "Candidates scoring batch started successfully.");
      closeToolBar()
    }
    catch (error) {
      toast.error("Error Screening candidates. Please try again.");
    }



  }





  // compact mode kicks in once the analysis panel eats up horizontal space
  const compact = analysisOpen;

  if (!totalSelected && !isMultiSelectMode) return null

  return (
    <div
      className="w-full mt-3 sticky bottom-4 z-30 px-4"

    >
      <div
        className={`
    flex items-center gap-4
    rounded-2xl border border-[#E5E2DA] bg-white
    shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)]
    ${compact ? "px-3 py-2 flex-nowrap justify-between" : "px-5 py-3 flex-wrap justify-between"}
  `}
      >
        <div className="flex items-center gap-4 flex-wrap min-w-0">
          <span className="text-sm font-semibold text-[#0F0F0F] whitespace-nowrap">
            {totalSelected} selected
          </span>

          {!compact && (
            <>
              <div className="h-4 w-px bg-[#E5E2DA]" />

              <label
                className={`flex items-center gap-2 text-xs whitespace-nowrap ${totalSelected === 0
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
                  } text-[#595959]`}
              >
                <input
                  type="checkbox"
                  checked={showSelectedOnly}
                  disabled={totalSelected === 0}
                  onChange={(e) => setShowSelectedOnly(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[#C85A17]"
                />
                Show selected only
              </label>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-hide">
          <UtilityButton title="Cancel" onClick={cancelMultiSelectMode} variant="ghost" compact={compact} />

          {canWrite && stages && Object.keys(stages).length > 0 &&
            <StageSelectButton
              onOptionClick={(newStage) => {
                multiChangeStageMutation.mutate({
                  screeningId: screening_id,
                  resumeIds: getIdsFromSet(selectedCandidates),
                  newStage
                },
                  { onSuccess: closeToolBar }
                )
              }}
              isLoading={multiChangeStageMutation.isPending}
              stages={stages}
              compact={compact}

            />
          }


          {canWrite && (
             <RescoreButton options={RescoreOptions} isLoading={multiRescoreMutation.isPending} stages={stages ?? {}} compact={compact} />
          )}


          <UtilityButton title="Export"
            onClick={handleExport}
            Icon={FileText} compact={compact} isLoading={multiExportMutation.isPending} />


          <UtilityButton title="Resume" onClick={handleResumeDownload} Icon={Download} compact={compact} isLoading={isResumeDownloading} />

          <UtilityButton title="Share" onClick={() => setIsShareDialogOpen(true)} Icon={Share2} compact={compact} isLoading={multiShareMutation.isPending} />


          {canWrite && (
            <UtilityButton title="AI Call" onClick={handleCall} Icon={PhoneCall} compact={compact} isLoading={multiCallMutation.isPending} />
          )}

          {canWrite && (type === "Active" || type === "Archived") && (
            <div className="h-5 w-px bg-[#E5E2DA] mx-1" />
          )}

          {canWrite && type === "Active" && (
            <UtilityButton title="Archive" onClick={() => { multiArchiveMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedCandidates) }, { onSuccess: closeToolBar }) }} Icon={Archive} variant="danger" compact={compact} isLoading={multiArchiveMutation.isPending} />
          )}
          {canWrite && type === "Archived" && (
            <>
              <UtilityButton title="Unarchive" onClick={() => { multiUnarchiveMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedCandidates) }, { onSuccess: closeToolBar }) }} Icon={ArchiveRestore} compact={compact} isLoading={multiUnarchiveMutation.isPending} />
              <UtilityButton title="Delete" onClick={() => { multiDeleteMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedCandidates) }, { onSuccess: closeToolBar }) }} Icon={Trash2} variant="danger" compact={compact} isLoading={multiDeleteMutation.isPending} />
            </>
          )}

          {
            selectedCandidates.size > 0 && (
              <MultiShareDialog
                open={isShareDialogOpen}
                onClose={() => setIsShareDialogOpen(false)}
                onShare={handleShare}
                isPending={multiShareMutation.isPending}
              />
            )
          }

        </div>
      </div>
    </div>
  )
}

export default CandidateMultiSelectToolBar




interface StageSelectButtonProps {
  onOptionClick: (value: string) => void;
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  stages: StagesMap;
  compact?: boolean;
}
function StageSelectButton({
  stages,
  onOptionClick,
  isLoading,
  className = "",
  disabled = false,
  compact = false,
}: StageSelectButtonProps) {

  const SortedStages = sortedStages(stages);

  const trigger = (
    <DropdownMenuTrigger
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-1.5
        h-9 rounded-xl
        text-sm font-medium
        border border-[#0F0F0F] bg-[#0F0F0F] text-white
        hover:bg-[#262626]
        transition-colors cursor-pointer whitespace-nowrap
        ${compact ? "w-9 px-0" : "px-3.5"}
        ${className}
        ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <Plus size={14} />
      {!compact && <span>Stage</span>}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="top">
            <p>Stage</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <DropdownMenuContent
        className="
          w-44
          p-1.5
          rounded-lg
          border border-[#E5E5E5]
          bg-white
          shadow-lg
        "
        align="center"
        sideOffset={6}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        {SortedStages.map((stage: StageEntry) => (
          <DropdownMenuItem
            key={stage.name}
            className="
              h-8 px-2 rounded-lg
              text-sm text-[#404040]
              cursor-pointer outline-none
              hover:bg-[#F5F3EE]
            "
            onClick={() => onOptionClick(stage.name)}
          >
            <span
              className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-xs font-medium"
              style={{
                backgroundColor: tintColor(stage.color),
                color: shadeColor(stage.color),
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              {stage.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


interface RescoreOption {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
}


interface RescoreButtonProps {
  options: RescoreOption[],
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  stages: StagesMap;
  compact?: boolean;
}
function RescoreButton({
  options,
  isLoading,
  className = "",
  disabled = false,
  compact = false,
}: RescoreButtonProps) {


  const trigger = (
    <DropdownMenuTrigger
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-1.5
        h-9 rounded-xl
        text-sm font-medium
        border border-[#D9D6CE] bg-white text-[#3A3A3A] hover:bg-[#F5F3EE] hover:border-[#C9C5BA]
        transition-colors cursor-pointer whitespace-nowrap
        ${compact ? "w-9 px-0" : "px-3.5"}
        ${className}
        ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <RefreshCw size={14} />
      {!compact && <span>Re-Score</span>}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu>
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="top">
            <p>ReScore</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}

      <DropdownMenuContent
        className="
          w-44
          p-1.5
          rounded-lg
          border border-[#E5E5E5]
          bg-white
          shadow-lg
        "
        align="center"
        sideOffset={6}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        {
          options.map((option) => (
            <DropdownMenuItem
              className="
              h-8 px-2 rounded-lg
              text-sm text-[#404040]
              cursor-pointer outline-none
              hover:bg-[#F5F3EE]
            "
              onClick={() => {
                option.onClick()
              }}
            >
              {
                option.icon && <option.icon size={14} className="mr-2" />
              }
              {option.label}


            </DropdownMenuItem>

          ))
        }


      </DropdownMenuContent >
    </DropdownMenu >
  );
}



const TOAST_MESSAGES: Record<string, MultiMutationOptions> = {
  RESCORE: {
    successMessage: "Rescore started successfully",
    errorMessage: "Failed to rescore resumes",
  },

  SHARE: {
    successMessage: "Resumes shared successfully",
    errorMessage: "Failed to share resumes",
  },

  EXPORT: {
    successMessage: "Resumes exported successfully",
    errorMessage: "Failed to export resumes",
  },

  CHANGE_STAGE: {
    successMessage: "Stage changed successfully.Will take a few seconds to reflect in the list",
    errorMessage: "Failed to change stage",
  },

  CALL: {
    successMessage: "Calls initiated successfully",
    errorMessage: "Failed to initiate calls",
  },

  ARCHIVE: {
    successMessage: "Resumes archived successfully",
    errorMessage: "Failed to archive resumes",
  },

  UNARCHIVE: {
    successMessage: "Resumes unarchived successfully",
    errorMessage: "Failed to unarchive resumes",
  },

  DELETE: {
    successMessage: "Resumes deleted successfully",
    errorMessage: "Failed to delete resumes",
  },
};