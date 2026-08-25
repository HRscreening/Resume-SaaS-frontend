import {
    createContext,
    useState,
    useCallback,
    useContext,
    ReactNode,
} from "react";

type SelectedApplicationsContextType = {
    screening_id: string;
    selectedApplications: Set<string>;
    toggleSelection: (applicationId: string) => void;
    isSelected: (applicationId: string) => boolean;
    clearSelection: () => void;
    togglePageSelection: (
        applicationIds: string[],
        select: boolean
    ) => void;
};

const SelectedApplicationsContext =
    createContext<SelectedApplicationsContextType | null>(null);

export function SelectedApplicationsProvider({
    screening_id,
    children,
}: {
    screening_id: string;
    children: ReactNode;
}) {
    const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set());
    
    const toggleSelection = useCallback((applicationId: string) => {
        setSelectedApplications(prev => {
            const next = new Set(prev);

            if (next.has(applicationId)) {
                next.delete(applicationId);
            } else {
                next.add(applicationId);
            }

            return next;
        });
    }, []);

    const isSelected = useCallback(
        (applicationId: string) =>
            selectedApplications.has(applicationId),
        [selectedApplications]
    );

    const clearSelection = useCallback(() => {
        setSelectedApplications(new Set());
    }, []);

    const togglePageSelection = useCallback(
        (applicationIds: string[], select: boolean) => {
            setSelectedApplications(prev => {
                const next = new Set(prev);

                applicationIds.forEach(id => {
                    if (select) {
                        next.add(id);
                    } else {
                        next.delete(id);
                    }
                });

                return next;
            });
        },
        []
    );

    return (
        <SelectedApplicationsContext.Provider
            value={{
                screening_id,
                selectedApplications,
                toggleSelection,
                isSelected,
                clearSelection,
                togglePageSelection,
            }}
        >
            {children}
        </SelectedApplicationsContext.Provider>
    );
}




export function useSelectedApplications() {
    const context = useContext(SelectedApplicationsContext);

    if (!context) {
        throw new Error(
            "useSelectedApplications must be used inside SelectedApplicationsProvider"
        );
    }

    return context;
}