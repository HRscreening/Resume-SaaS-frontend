import {
    createContext,
    useState,
    useCallback,
    useContext,
    ReactNode,
    useEffect,
} from "react";
import { getLocalStorage, setLocalStorage } from "@/utils/localStorage";



type SelectedCandidatesContextType = {
    screening_id: string;
    showSelectedOnly: boolean;
    setShowSelectedOnly: (value: boolean) => void;
    selectedCandidates: Set<string>;
    lastClickedId: string | null;
    toggleSelection: (
        candidateId: string,
        e?: React.MouseEvent | React.ChangeEvent,
        visibleList?: string[],
    ) => void;
    togglePageSelection: (
        candidateIds: string[],
        select: boolean,
    ) => void;
    isSelected: (candidateId: string) => boolean;
    clearSelection: () => void;
};

const SelectedCandidatesContext =
    createContext<SelectedCandidatesContextType | null>(null);

export function SelectedCandidatesProvider({
    screening_id,
    children,
}: {
    screening_id: string;
    children: ReactNode;
}) {

    const storageKey = `job:selected-candidates:${screening_id}`;

     const [showSelectedOnly, setShowSelectedOnly] = useState<boolean>(false);
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(
        () => {
            const stored = getLocalStorage<string[]>(storageKey, []);
            return new Set(stored);
        }
    );

    const [lastClickedId, setLastClickedId] = useState<string | null>(null);

    // Persist selected candidates to localStorage whenever they change
    useEffect(() => {
        setLocalStorage(storageKey, [...selectedCandidates]);
    }, [selectedCandidates, storageKey]);





    const toggleSelection = useCallback((
        candidateId: string,
        e?: React.MouseEvent | React.ChangeEvent,
        visibleList?: string[],
    ) => {
        const me = e as React.MouseEvent | undefined;

        setSelectedCandidates((prev) => {
            const next = new Set(prev);
            const addedIds: string[] = [];

            if (
                me?.shiftKey &&
                lastClickedId &&
                visibleList &&
                visibleList.includes(lastClickedId) &&
                visibleList.includes(candidateId)
            ) {
                const a = visibleList.indexOf(lastClickedId);
                const b = visibleList.indexOf(candidateId);
                const [lo, hi] = a < b ? [a, b] : [b, a];
                for (let i = lo; i <= hi; i++) {
                    const id = visibleList[i];
                    if (!next.has(id)) {
                        addedIds.push(id);
                    }
                    next.add(id);
                }
            } else if (next.has(candidateId)) {
                next.delete(candidateId);
            } else {
                next.add(candidateId);
                addedIds.push(candidateId);
            }


            return next;
        });
        setLastClickedId(candidateId);
    }, [lastClickedId]);

    const isSelected = useCallback(
        (candidateId: string) => selectedCandidates.has(candidateId),
        [selectedCandidates]
    );

    const clearSelection = useCallback(() => {
        setSelectedCandidates(new Set());
        setLastClickedId(null);
        setShowSelectedOnly(false);
    }, []);

    const togglePageSelection = useCallback(
        (candidateIds: string[], select: boolean) => {
            setSelectedCandidates((prev) => {
                const next = new Set(prev);
                const addedIds: string[] = [];

                candidateIds.forEach((id) => {
                    if (select) {
                        if (!next.has(id)) addedIds.push(id);
                        next.add(id);
                    } else {
                        next.delete(id);
                    }
                });


                return next;
            });
            setLastClickedId(null);
            setShowSelectedOnly(false);
        },
        []
    );

    return (
        <SelectedCandidatesContext.Provider
            value={{
                screening_id,
                showSelectedOnly,
                setShowSelectedOnly,

                selectedCandidates,
                lastClickedId,

                toggleSelection,
                togglePageSelection,
                isSelected,
                clearSelection,
            }}
        >
            {children}
        </SelectedCandidatesContext.Provider>
    );
}

export function useSelectedCandidates() {
    const context = useContext(SelectedCandidatesContext);
    if (!context) {
        throw new Error(
            "useSelectedCandidates must be used inside SelectedCandidatesProvider"
        );
    }
    return context;
}
