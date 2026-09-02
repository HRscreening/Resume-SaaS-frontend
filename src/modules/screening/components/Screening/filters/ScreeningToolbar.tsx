import { useState } from "react";
import type { MatchTierId, StagesMap, RubricCategory } from "@/types"
import { FilterAddOnButton as AddNewFilterDropDown } from "@/modules/screening/components/Screening/filters/ScreeningFilterAddOnButton";
import { Screening_FILTER_KEYS, type ScreeningFilterKey } from "@/modules/screening/types/searchSchema"
import type { CandidateQuery } from "@/modules/screening/hooks/screening/custom/useCandidateQuery";
import { getFilterLabel } from "@/modules/screening/components/Screening/filters/ScreeningFilterUtils";
import { FilterButton } from "@/modules/screening/components/shared/filters/FilterButton";
import ExperienceRangeSelector from "@/modules/screening/components/shared/filters/ExperienceRangeSelector";
import { DEFAULT_RANGE } from "@/modules/screening/types/searchSchema";
import { MultiSelectPopover } from "@/modules/screening/components/shared/filters/MultiSelectPopover";
import { TIER_OPTIONS } from "./matchTiers";
import { sortedStages } from "@/lib/stages";

import { FilterDialog } from "@/modules/screening/components/Screening/filters/FilterDialog";

interface ScreeningToolbarProps {
  candidateQuery: CandidateQuery;
  stages: StagesMap;
  categories: RubricCategory[]

}




const matchOptions = TIER_OPTIONS.map((t) => ({
  value: t.id,
  label: t.label,
  dot: t.dot,
}));

export function ScreeningToolbar({
  candidateQuery,
  stages,
  categories
}: ScreeningToolbarProps) {

  const state = candidateQuery.state;
  const [newFilter, setNewFilter] = useState<ScreeningFilterKey | null>(null);


  const stageOptions = sortedStages(stages).map((s) => ({
    value: s.name,
    label: s.name,
    dot: s.color,
  }));


  const activeFilters = Screening_FILTER_KEYS.filter(
    (key) => state[key] !== undefined && state[key] !== ""
  );

  const hasActiveStageFilter =
    (state.screenStage?.length ?? 0) > 0;

  const hasActiveMatchFilter =
    (state.screenMatch?.length ?? 0) > 0;

  const hasActiveScoreFilter =
    state.screenOverallScore !== undefined ||
    Object.keys(state.screenCategoryScores ?? {}).length > 0;

  const hasActiveFilters =
    activeFilters.length > 0 ||
    hasActiveStageFilter ||
    hasActiveMatchFilter ||
    hasActiveScoreFilter;


  const filtersToRender = newFilter && !activeFilters.includes(newFilter)
    ? [...activeFilters, newFilter]
    : activeFilters;



  return (
    <>
      <div className="flex flex-col items-start gap-2">



        <div className="flex flex-wrap items-center gap-1.5">

          <AddNewFilterDropDown handleFilterSelect={setNewFilter} AlreadyAppliedFilters={filtersToRender} />
          <ExperienceRangeSelector setExperienceRange={candidateQuery.setExperience} initialRange={candidateQuery.state.sExp} />

          <MultiSelectPopover
            label="Stage"
            options={stageOptions}
            value={state.screenStage}
            onChange={(v) => candidateQuery.setStage(v as string[])}
            emptyHint="No stages configured"
          />

          <MultiSelectPopover
            label="Match"
            options={matchOptions}
            value={state.screenMatch as MatchTierId[]}
            onChange={(v) => candidateQuery.setMatch(v as MatchTierId[])}
          />

          <FilterDialog
            categories={categories}
            onCategoryChange={candidateQuery.setCategoryRange}
            onOverallChange={candidateQuery.setOverallRange}
            state={candidateQuery.state}
          />




          {(hasActiveFilters) && (
            <button
              type="button"
              onClick={() => {
                candidateQuery.clearAll();
                setNewFilter(null);
              }}
              className="cursor-pointer text-xs font-medium text-[#737373] hover:text-[#0F0F0F] underline underline-offset-2 ml-1"

            >
              Clear All
            </button>
          )}

        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">


          {filtersToRender.map((key) => (
            <FilterButton
              key={key}
              label={getFilterLabel(key)}
              value={(state[key] ?? "") as string}
              onChange={(value) =>
                candidateQuery.setFilter(key, value)
              }
              initiallyOpen={key === newFilter}
              onRemove={() => {
                candidateQuery.setFilter(key, undefined);

                if (key === newFilter) {
                  setNewFilter(null);
                }
              }}
            />
          ))}

        </div>



      </div>


    </>
  );
}
