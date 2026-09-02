import { useState } from "react";
import { FilterAddOnButton as AddNewFilterDropDown } from "@/modules/screening/components/Application/filters/FilterAddOnButton";
import { APPLICATION_FILTER_KEYS, type ApplicationFilterKey } from "@/modules/screening/types/searchSchema"
import type { ApplicationQuery } from "@/modules/screening/hooks/application/custom/useApplicationQuery";
import { getFilterLabel } from "@/modules/screening/components/Application/filters/FilterUtils";
import { FilterButton } from "@/modules/screening/components/shared/filters/FilterButton";
import { DEFAULT_RANGE } from "@/modules/screening/types/searchSchema";
import ExperienceRangeSelector from "@/modules/screening/components/shared/filters/ExperienceRangeSelector";

interface CandidatesToolbarProps {
  applicationQuery: ApplicationQuery;
}



export function ApplicationsToolbar({
  applicationQuery,
}: CandidatesToolbarProps) {

  const state = applicationQuery.state;
  const [newFilter, setNewFilter] = useState<ApplicationFilterKey | null>(null);



  const activeFilters = APPLICATION_FILTER_KEYS.filter(
    (key) => state[key] !== undefined && state[key] !== ""
  );

  const filtersToRender = newFilter && !activeFilters.includes(newFilter)
    ? [...activeFilters, newFilter]
    : activeFilters;



  return (
    <>
      <div className="flex flex-col items-start gap-2">
     


        <div className="flex flex-wrap items-center gap-1.5">

          <AddNewFilterDropDown handleFilterSelect={setNewFilter} AlreadyAppliedFilters={filtersToRender} />
          <ExperienceRangeSelector setExperienceRange={applicationQuery.setExperience} initialRange={applicationQuery.state.appExperience} />


          {(activeFilters.length > 0) && (
            <button
              type="button"
              onClick={() => {
                applicationQuery.clearAll();
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
                applicationQuery.setFilter(key, value)
              }
              initiallyOpen={key === newFilter}
              onRemove={() => {
                applicationQuery.setFilter(key, undefined);

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
