import { useState } from "react";
import { useMutationState } from "@tanstack/react-query";
import { Archive, Trash2, Share2, Download } from "lucide-react";
import { useApplicationUtility } from "@/modules/screening/hooks/application/queries/application.hook"
import type { Application, ApplicationActionStatus } from "@/modules/screening/types/application.type";
import { archiveResume, unarchiveResume, deleteResume } from "@/modules/screening/apis/screenings.api"
import type { ApplicationsSearchParams, applicationSearchSchema } from "@/modules/screening/types/searchSchema"
import { toast } from "sonner";
import { type Option } from "@/modules/screening/components/shared/MenuButton";
import { resumeUploadService } from "@/lib/services/index";


export function useApplicationActions({
    screeningId,
    applicationSearchParams,
}: {
    screeningId: string;
    applicationSearchParams: ApplicationsSearchParams;
}) {

    const [localActions, setLocalActions] = useState(new Map<string, ApplicationActionStatus["action"]>());

    // Use localActions to track the status of actions for each application. This allows us to show a loading state for individual rows without affecting the entire table.
    const startLocalAction = (resumeId: string, action: ApplicationActionStatus["action"]) => {
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
        console.log("START", args.resumeId);

        const result = await archiveResume(args);

        console.log("END", args.resumeId);

        return result;
    };

    const archiveMutation = useApplicationUtility(archive, applicationSearchParams, "archive");



    // const archiveMutation = useApplicationUtility(archiveResume, applicationSearchParams);

    const unarchiveMutation = useApplicationUtility(unarchiveResume, applicationSearchParams, "unarchive");

    const deleteMutation = useApplicationUtility(deleteResume, applicationSearchParams, "delete");

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

    const { appType } = applicationSearchParams



    const menuOptions: Option[] = [
        {
            label: "Resume",
            icon: <Download size={12} />,
            onClick: async (application: Application) => {
                if (!application.resume_url) {
                    toast.error("Resume URL is not available for this candidate.");
                    return;
                }

                startLocalAction(application.id, "download");

                try {
                    await resumeUploadService.downloadResume(application.resume_url, application.candidate_name);
                } catch (error) {
                    console.error("Error downloading resume:", error);
                    toast.error("Failed to download resume. Please try again.");
                }
                finally {
                    finishLocalAction(application.id);
                }

            },
        },
    ];

    // Push Archive/Unarchive/Delete options based on the application type
    if (appType === "Active") {
        menuOptions.push(
            {
                label: "Archive",
                icon: <Archive size={12} />,
                onClick: (application) => {
                    archiveMutation.mutate({
                        screeningId,
                        resumeId: application.id,
                    });
                },
            })
    }
    else if (appType === "Archived") {
        menuOptions.push({
            label: "UnArchive",
            icon: <Archive size={12} />,
            onClick: (application) => {
                unarchiveMutation.mutate({
                    screeningId,
                    resumeId: application.id,
                });
            },
        },)
    }

    // Add Delete option for Archived applications only
    if (appType === "Archived") {
        menuOptions.push(
            {
                label: "Delete",
                icon: <Trash2 size={12} />,
                onClick: (application) => {
                    deleteMutation.mutate({
                        screeningId,
                        resumeId: application.id,
                    });
                },
            },
        )
    }



    const getRowStatus = (resumeId: string): ApplicationActionStatus => {

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
    };
}