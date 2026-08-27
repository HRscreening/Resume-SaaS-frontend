import { useState } from "react";
import { FilterAddOnButton as AddNewFilterDropDown} from "@/modules/screening/components/Application/filters/FilterAddOnButton";
import  { APPLICATION_FILTER_KEYS,type ApplicationFilterKey } from "@/modules/screening/types/searchSchema"
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
      <div className="flex items-center gap-2 flex-wrap">
        {/* <div className="relative flex-1 min-w-50 max-w-sm">
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            stroke="#A0A0A0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L12 12" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search applicants"
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#0F0F0F] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#A0A0A0]"
          />
        </div> */}



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

          <AddNewFilterDropDown handleFilterSelect={setNewFilter} AlreadyAppliedFilters={filtersToRender} />
          <ExperienceRangeSelector setExperienceRange={applicationQuery.setExperience} initialRange={applicationQuery.state.appExperience}/>

          {(activeFilters.length > 0 ) && (
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




      </div>
    </>
  );
}
