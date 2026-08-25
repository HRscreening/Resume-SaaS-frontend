import {
    createContext,
    useState,
    useCallback,
    useContext,
    ReactNode,
} from "react";
import type { RankedCandidate } from "@/modules/screening/types/screening.type";

type RescoreSelectedCandidatesContextType = {
    screening_id: string;
    selectedCandidates: Set<string>;
    selectedDetails: Record<string, RankedCandidate>;
    lastClickedId: string | null;
    toggleSelection: (
        candidateId: string,
        e?: React.MouseEvent | React.ChangeEvent,
        visibleList?: string[],
        candidatesList?: RankedCandidate[]
    ) => void;
    togglePageSelection: (
        candidateIds: string[],
        select: boolean,
        candidatesList?: RankedCandidate[]
    ) => void;
    isSelected: (candidateId: string) => boolean;
    clearSelection: () => void;
    rememberDetails: (candidates: RankedCandidate[]) => void;
};

const RescoreSelectedCandidatesContext =
    createContext<RescoreSelectedCandidatesContextType | null>(null);

export function RescoreSelectedCandidatesProvider({
    screening_id,
    children,
}: {
    screening_id: string;
    children: ReactNode;
}) {
    const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
    const [selectedDetails, setSelectedDetails] = useState<Record<string, RankedCandidate>>({});
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);

    const rememberDetails = useCallback((candidates: RankedCandidate[]) => {
        setSelectedDetails((prev) => {
            const next = { ...prev };
            let updated = false;
            for (const c of candidates) {
                if (c && !next[c.resume_id]) {
                    next[c.resume_id] = c;
                    updated = true;
                }
            }
            return updated ? next : prev;
        });
    }, []);

    const toggleSelection = useCallback((
        candidateId: string,
        e?: React.MouseEvent | React.ChangeEvent,
        visibleList?: string[],
        candidatesList?: RankedCandidate[]
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

            if (addedIds.length > 0 && candidatesList) {
                const addedCandidates = candidatesList.filter(c => addedIds.includes(c.resume_id));
                rememberDetails(addedCandidates);
            }

            return next;
        });
        setLastClickedId(candidateId);
    }, [lastClickedId, rememberDetails]);

    const isSelected = useCallback(
        (candidateId: string) => selectedCandidates.has(candidateId),
        [selectedCandidates]
    );

    const clearSelection = useCallback(() => {
        setSelectedCandidates(new Set());
        setSelectedDetails({});
        setLastClickedId(null);
    }, []);

    const togglePageSelection = useCallback(
        (candidateIds: string[], select: boolean, candidatesList?: RankedCandidate[]) => {
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

                if (addedIds.length > 0 && candidatesList) {
                    const addedCandidates = candidatesList.filter(c => addedIds.includes(c.resume_id));
                    rememberDetails(addedCandidates);
                }

                return next;
            });
        },
        [rememberDetails]
    );

    return (
        <RescoreSelectedCandidatesContext.Provider
            value={{
                screening_id,
                selectedCandidates,
                selectedDetails,
                lastClickedId,
                toggleSelection,
                togglePageSelection,
                isSelected,
                clearSelection,
                rememberDetails,
            }}
        >
            {children}
        </RescoreSelectedCandidatesContext.Provider>
    );
}

export function useRescoreSelectedCandidates() {
    const context = useContext(RescoreSelectedCandidatesContext);
    if (!context) {
        throw new Error(
            "useRescoreSelectedCandidates must be used inside RescoreSelectedCandidatesProvider"
        );
    }
    return context;
}
