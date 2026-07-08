import {useState} from 'react'
import { useCandidateRepositoryQuery } from '@/controllers/candidateRepository/useCandidateRepository'
import type { CandidateOverview } from '@/types/candidate.type';
import CandidatesTable from '@/components/candidates/candidateRepositoryTable';
import type { SortRule, SortField } from '@/types/candidate.type';
import CandidateAnalytics from '@/components/candidates/CandidateAnalysisSheet';
// import applications from '@/';

const NewCandidatePage = () => {

    const [selectedCandidate, setSelectedCandidate] = useState<CandidateOverview | null>(null);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);


    const {
        query,
        searchInput,
        setSearch,
        setAvgScoreRange,
        setBestScoreRange,
        setMatch,
        setPage,
        setStage,
        setSort,
        clearAll,
        state,
    } = useCandidateRepositoryQuery()
    const { data: candidates, isError, isLoading } = query

    const sortRule = state.sort?.[0] as SortRule | undefined

    if (isError) {
        return <div>Error loading candidates.</div>;
    }

    const handleRowClick = (candidate: CandidateOverview) => {
        // Implement navigation to candidate details page or modal here
        setSelectedCandidate(candidate);
        setIsAnalyticsOpen(true);
        console.log("Clicked candidate:", candidate);
    }

    const handleSort = (field: SortField) => {
        setSort([{ field, direction: state.sort?.[0]?.direction === "asc" ? "desc" : "asc" }]);
    }


    const onStageChange = (newStage: string) => {
        if (selectedCandidate) {
            // Implement stage change logic here, e.g., make an API call to update the candidate's stage
            console.log(`Changing stage for candidate ${selectedCandidate.id} to ${newStage}`);
            // After successful update, you might want to refresh the candidate data or update the local state
        }
    }




    return (
        <div className='py-8 px-6'>
            <CandidatesTable candidates={candidates ?? []} isLoading={isLoading} handleRowClick={handleRowClick}
                handleSort={handleSort} sortRule={sortRule}
            />
                {/* {
                    candidates && candidates.length > 0 &&
                    <CandidateAnalytics 
                    candidate={selectedCandidate}
                    isOpen={isAnalyticsOpen}
                    onStageChange={onStageChange}
                    onClose={() => setIsAnalyticsOpen(false)}
                    applications={}
                    />
                } */}

        </div>
    )
}

export default NewCandidatePage
