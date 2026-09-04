import { useState } from 'react'
import { useSelectedApplications } from "@/modules/screening/hooks/application/custom/useSelectedApplication"
import {
  Download,
  Plus,
  Share2,
  PhoneCall,
  ScanSearch,
  FileText,
  Archive,
  ArchiveRestore,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ResumeSections } from "@/modules/screening/types/screening.type"
import { useMultiApplicationResumeUtility, type MultiMutationOptions } from "@/modules/screening/hooks/application/queries/application.hook"
import { archiveResumeMulti, deleteResumeMulti, unarchiveResumeMulti, downloadSelectedResumes, } from "@/modules/screening/apis/screenings.api"
import { exportSelectedApplications } from "@/modules/screening/apis/addApplications"
import { UtilityButton } from "@/modules/screening/components/shared/MultiSelectUtilityButton"
import {useScoringMutation} from "@/modules/screening/hooks/shared/useScoringMutation"
import { useAccount } from "@/hooks/useAccount"




function getIdsFromSet(set: Set<string>): string[] {
  return Array.from(set);
}

interface CandidateMultiSelectToolBarProps {
  type: ResumeSections,
  isMultiSelectMode: boolean;
  setIsMultiSelectMode: (value: boolean) => void;
  analysisOpen: boolean;
  onTabChange?: (tab: "Applications" | "Screening") => void;
}

const CandidateMultiSelectToolBar = ({
  type,
  isMultiSelectMode,
  setIsMultiSelectMode,
  analysisOpen,
  onTabChange
}: CandidateMultiSelectToolBarProps) => {

  const { screening_id, selectedApplications, clearSelection, showSelectedOnly, setShowSelectedOnly } = useSelectedApplications()
  const { canWrite } = useAccount()

  const [isResumeDownloading, setIsResumeDownloading] = useState(false)


  function cancelMultiSelectMode() {
    setIsMultiSelectMode(false)
    clearSelection()
  }


  const totalSelected = selectedApplications.size

  const multiArchiveMutation = useMultiApplicationResumeUtility(archiveResumeMulti, TOAST_MESSAGES.ARCHIVE)
  const multiUnarchiveMutation = useMultiApplicationResumeUtility(unarchiveResumeMulti, TOAST_MESSAGES.UNARCHIVE)
  const multiDeleteMutation = useMultiApplicationResumeUtility(deleteResumeMulti, TOAST_MESSAGES.DELETE)
  const multiScoreMutation = useScoringMutation(TOAST_MESSAGES.SCORE)
  const multiExportMutation = useMultiApplicationResumeUtility(exportSelectedApplications, TOAST_MESSAGES.EXPORT)

  const closeToolBar = () => {
    setIsMultiSelectMode(false)
    clearSelection()
  }


  async function handleExport() {
    try {
      // const { blob, filename } = await exportResults(id, queryState);
      const { blob, filename } = await multiExportMutation.mutateAsync({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedApplications) }, { onSuccess: closeToolBar });
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
        resumeIds: getIdsFromSet(selectedApplications),
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


  async function submitScreen() {
        if (selectedApplications.size === 0) {
            toast.error("No candidates selected for Screening.");
            return;
        }

        try {
            const resume_ids = Array.from(selectedApplications);
            const res = await multiScoreMutation.mutateAsync({ screeningId: screening_id, resumeIds: resume_ids });
            toast.success(res.message || "Candidates scoring batch started successfully.");
            closeToolBar()
            onTabChange?.("Screening");
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



          <UtilityButton title="Export"
            onClick={handleExport}
            Icon={FileText} compact={compact} isLoading={multiExportMutation.isPending} />


          <UtilityButton title="Resume" onClick={handleResumeDownload} Icon={Download} compact={compact} isLoading={isResumeDownloading} />

          {/* <UtilityButton title="Share" onClick={() => { multiShareMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedApplications) }, { onSuccess: closeToolBar }) }} Icon={Share2} compact={compact} isLoading={multiShareMutation.isPending} /> */}


          {canWrite && (
            <UtilityButton title="Screen"
              onClick={submitScreen}
              Icon={ScanSearch} compact={compact} isLoading={multiScoreMutation.isPending} variant='default' />
          )}

          {canWrite && (type === "Active" || type === "Archived") && (
            <div className="h-5 w-px bg-[#E5E2DA] mx-1" />
          )}

          {canWrite && type === "Active" && (
            <UtilityButton title="Archive" onClick={() => { multiArchiveMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedApplications) }, { onSuccess: closeToolBar }) }} Icon={Archive} variant="danger" compact={compact} isLoading={multiArchiveMutation.isPending} />
          )}
          {canWrite && type === "Archived" && (
            <>
              <UtilityButton title="Unarchive" onClick={() => { multiUnarchiveMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedApplications) }, { onSuccess: closeToolBar }) }} Icon={ArchiveRestore} compact={compact} isLoading={multiUnarchiveMutation.isPending} />
              <UtilityButton title="Delete" onClick={() => { multiDeleteMutation.mutate({ screeningId: screening_id, resumeIds: getIdsFromSet(selectedApplications) }, { onSuccess: closeToolBar }) }} Icon={Trash2} variant="danger" compact={compact} isLoading={multiDeleteMutation.isPending} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateMultiSelectToolBar


// UtilityButton — variant-driven, and collapses to icon-only + tooltip in compact mode


const TOAST_MESSAGES: Record<string, MultiMutationOptions> = {
  RESCORE: {
    successMessage: "Rescore started successfully",
    errorMessage: "Failed to rescore resumes",
  },
  SCORE: {
    successMessage: "Screening started successfully",
    errorMessage: "Failed to start screening",
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