import { useState, useCallback } from "react";
import { useMutationState } from "@tanstack/react-query";
import { RotateCcw, Archive, Trash2, Share2, Expand, UserRound, ChartNoAxesCombined, PhoneCall, Download } from "lucide-react";
import { useScoredResumeUtility } from "@/modules/screening/hooks/screening/queries/screening.query"
import type { RankedCandidate, ScreeningActionStatus } from "@/modules/screening/types/screening.type";
import { archiveResume, unarchiveResume, deleteResume } from "@/modules/screening/apis/screenings.api"
import type { ScreeningSearchParams, ScreeningDetailsSearchParams } from "@/modules/screening/types/searchSchema"
import { useScreeningDetailsNavigation } from "@/modules/screening/hooks/shared/useScreeningDetailNavigation"
import { toast } from "sonner";
import { type Option } from "@/modules/screening/components/shared/MenuButton";
import { resumeUploadService } from "@/lib/services/index";

export function useScreeningActions({
    screeningId,
}: {
    screeningId: string;
}) {

    const { setScreenId, setAnalysisTab, getScreeningSearchParams } = useScreeningDetailsNavigation();

    const screeningSearchParams = getScreeningSearchParams() as ScreeningSearchParams;


    const [localActions, setLocalActions] = useState(new Map<string, ScreeningActionStatus["action"]>());

    const [shareCandidate, setShareCandidate] = useState<RankedCandidate | null>(null);

    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);


    // Use localActions to track the status of actions for each application. This allows us to show a loading state for individual rows without affecting the entire table.
    const startLocalAction = (resumeId: string, action: ScreeningActionStatus["action"]) => {
        setLocalActions(prev => {
            const next = new Map(prev);
            next.set(resumeId, action);
            return next;
        });
    };


    // Finish local action by removing the entry from localActions map. This is called after the action is completed (success or failure) to reset the state for that application.
    const finishLocalAction = (resumeId: string) => {
        setLocalActions(prev => {
            const next = new Map(prev);
            next.delete(resumeId);
            return next;
        });
    };

    const archive = async (args: {
        screeningId: string;
        resumeId: string;
    }) => {

        const result = await archiveResume(args);

        return result;
    };

    const archiveMutation = useScoredResumeUtility(archive, screeningSearchParams, "archive");



    // const archiveMutation = useApplicationUtility(archiveResume, screeningSearchParams);

    const unarchiveMutation = useScoredResumeUtility(unarchiveResume, screeningSearchParams, "unarchive");

    const deleteMutation = useScoredResumeUtility(deleteResume, screeningSearchParams, "delete");

    const pendingMutations = useMutationState({
        filters: {
            status: "pending",
        },
        select: (mutation) => ({
            mutationKey: mutation.options.mutationKey,
            variables: mutation.state.variables as {
                screeningId: string;
                resumeId: string;
            } | undefined,
        }),
    });

    const { screenType } = screeningSearchParams




    const menuOptions: Option[] = [
        ...[
            { label: "ScoreCard", Icon: ChartNoAxesCombined, tab: "scorecard" },
            { label: "Profile", Icon: UserRound, tab: "profile" },
            { label: "Voice", Icon: PhoneCall, tab: "voice" },
        ].map(({ label, Icon, tab }) => ({
            label,
            icon: <Icon size={12} />,
            onClick: (candidate: RankedCandidate) => {
                setScreenId(candidate.resume_id);
                setAnalysisTab(tab as "profile" | "scorecard" | "voice");
            }
        })),
        {
            label: "Resume",
            icon: <Download size={12} />,
            onClick: async (candidate: RankedCandidate) => {
                if (!candidate.resume_url) {
                    toast.error("Resume URL is not available for this candidate.");
                    return;
                }

                startLocalAction(candidate.resume_id, "download");

                try {
                    await resumeUploadService.downloadResume(candidate.resume_url, candidate.candidate_name ?? "Resume", screeningId);
                } catch (error) {
                    console.error("Error downloading resume:", error);
                    toast.error("Failed to download resume. Please try again.");
                }
                finally {
                    finishLocalAction(candidate.resume_id);
                }

            },
        },
        {
            label: "Rescore",
            icon: <RotateCcw size={12} />,
            onClick: (candidate: RankedCandidate) => {
                // console.log("Rescore clicked for candidate:", candidate);
                toast.success("Unavaileble Currently");
            },
        },
        {
            label: "Expand",
            icon: <Expand size={12} />,
            onClick: (candidate) => {
                window.open(
                    `/screenings/${screeningId}/${candidate.resume_id}`,
                    "_blank",
                    "noopener,noreferrer"
                );
            },
        },
        {
            label: "Share",
            icon:
                <Share2 size={12} />,
            onClick: (candidate: RankedCandidate) => {
                setShareCandidate(candidate);
                setIsShareDialogOpen(true);
            },
        },

    ]

    // Push Archive/Unarchive/Delete options based on the application type
    if (screenType === "Active") {
        menuOptions.push(...[
            {
                label: "Archive",
                icon: <Archive size={12} />,
                onClick: (candidate: RankedCandidate) => {
                    archiveMutation.mutate({
                        screeningId: screeningId,
                        resumeId: candidate.resume_id,
                    });
                },
            },



        ])
    }
    else if (screenType === "Archived") {
        menuOptions.push({
            label: "Unarchive",
            icon: <Archive size={12} />,
            onClick: (candidate: RankedCandidate) => {
                unarchiveMutation.mutate({
                    screeningId,
                    resumeId: candidate.resume_id,
                });
            },
        },)
    }

    // Add Delete option for Archived applications only
    if (screenType === "Archived") {
        menuOptions.push(
            {
                label: "Delete",
                icon: <Trash2 size={12} />,
                onClick: (candidate: RankedCandidate) => {
                    deleteMutation.mutate({
                        screeningId,
                        resumeId: candidate.resume_id,
                    });
                },
            },
        )
    }



    const getRowStatus = (resumeId: string): ScreeningActionStatus => {

        const localAction = localActions.get(resumeId);

        if (localAction) {
            return {
                isProcessing: true,
                action: localAction,
            };
        }

        const mutation = pendingMutations.find(
            (mutation) =>
                mutation.variables?.resumeId === resumeId &&
                mutation.variables?.screeningId === screeningId
        );

        if (!mutation) {
            return {
                isProcessing: false,
                action: null,
            };
        }

        const action = mutation.mutationKey?.[1];

        if (action !== "archive" && action !== "unarchive" && action !== "delete") {
            return {
                isProcessing: false,
                action: null,
            };
        }

        return {
            isProcessing: true,
            action: action,
        };
    };

    return {
        menuOptions,
        getRowStatus,

        shareCandidate,
        setShareCandidate,
        isShareDialogOpen,
        setIsShareDialogOpen,
    };
}