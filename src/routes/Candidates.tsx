import { useState, useMemo } from "react";
import testCandidateData from "../../trash/testCandidateData.json";
import testApplications from "../../trash/test.json";
import CandidateAnalysisSheet from "@/components/candidates/CandidateAnalysisSheet";
import { Pagination } from "@/components/screening/Pagination";
import { MultiSelectPopover } from "@/components/screening/filters/MultiSelectPopover";
import { getTier } from "@/lib/tier";
import { ArrowDown, ArrowUp, ArrowUpDown, Briefcase, Search, Sparkles } from "lucide-react";
import type { CandidateOverview, CandidateDetails } from "@/types/candidate.type";

type SortField = "candidate_name" | "best_score" | "avg_score" | "total_resumes";
type SortDirection = "asc" | "desc";

interface SortRule {
  field: SortField;
  direction: SortDirection;
}

const Candidates = () => {
  // Load candidate list and applications into local state to allow in-memory updates
  const [candidates, setCandidates] = useState<CandidateOverview[]>(testCandidateData);
  const [applications, setApplications] = useState<CandidateDetails[]>(testApplications as any);

  // Filter states
  const [searchInput, setSearchInput] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  
  // Sort state
  const [sortRule, setSortRule] = useState<SortRule | null>({
    field: "best_score",
    direction: "desc",
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Selected candidate state for Analysis Sheet
  const [openCandidate, setOpenCandidate] = useState<CandidateOverview | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Unique roles from all candidates for filter list
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    candidates.forEach((c) => {
      c.applied_roles?.forEach((r) => roles.add(r));
    });
    return Array.from(roles).sort().map((r) => ({
      value: r,
      label: r,
    }));
  }, [candidates]);

  // Match tier filter options
  const matchOptions = [
    { value: "strong", label: "Strong Match", dot: "#22C55E" },
    { value: "potential", label: "Potential", dot: "#EAB308" },
    { value: "risky", label: "Risky", dot: "#F97316" },
    { value: "poor", label: "Poor Fit", dot: "#EF4444" },
  ];

  // Callback to handle stage changes from the analysis sheet
  const handleStageChange = (scoreId: string, nextStage: string) => {
    setApplications((prevApps) =>
      prevApps.map((app) => {
        if (app.score_id === scoreId) {
          const timestamp = new Date().toISOString();
          const historyEntry = {
            stage: nextStage,
            moved_at: timestamp,
          };
          const updatedHistory = app.stage_history
            ? [...app.stage_history, historyEntry]
            : [historyEntry];

          return {
            ...app,
            stage: nextStage,
            stage_history: updatedHistory,
            updated_at: timestamp,
          };
        }
        return app;
      })
    );
  };

  // Filter candidates based on search, roles, and tiers
  const filteredCandidates = useMemo(() => {
    return candidates.filter((candidate) => {
      // 1. Search Query
      if (searchInput.trim()) {
        const query = searchInput.toLowerCase();
        const matchesName = candidate.candidate_name.toLowerCase().includes(query);
        const matchesJob = candidate.candidate_current_job?.toLowerCase().includes(query) || false;
        const matchesSkills = candidate.skills?.some((s) => s.toLowerCase().includes(query)) || false;
        const matchesRoles = candidate.applied_roles?.some((r) => r.toLowerCase().includes(query)) || false;
        
        if (!matchesName && !matchesJob && !matchesSkills && !matchesRoles) {
          return false;
        }
      }

      // 2. Roles Filter
      if (selectedRoles.length > 0) {
        const hasMatchingRole = candidate.applied_roles?.some((r) => selectedRoles.includes(r));
        if (!hasMatchingRole) return false;
      }

      // 3. Match Tier Filter
      if (selectedTiers.length > 0) {
        const score = candidate.best_score || 0;
        const tier = getTier(score).id;
        if (!selectedTiers.includes(tier)) return false;
      }

      return true;
    });
  }, [candidates, searchInput, selectedRoles, selectedTiers]);

  // Sort candidates
  const sortedCandidates = useMemo(() => {
    if (!sortRule) return filteredCandidates;

    return [...filteredCandidates].sort((a, b) => {
      const field = sortRule.field;
      const direction = sortRule.direction;

      let valA: any = a[field];
      let valB: any = b[field];

      if (field === "candidate_name") {
        valA = valA || "";
        valB = valB || "";
        return direction === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      valA = valA || 0;
      valB = valB || 0;
      return direction === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredCandidates, sortRule]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(sortedCandidates.length / PAGE_SIZE));

  // Current page items
  const paginatedCandidates = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedCandidates.slice(start, start + PAGE_SIZE);
  }, [sortedCandidates, currentPage]);

  // Handle header sort clicks
  const handleSort = (field: SortField) => {
    if (sortRule?.field === field) {
      if (sortRule.direction === "desc") {
        setSortRule({ field, direction: "asc" });
      } else {
        setSortRule(null);
      }
    } else {
      setSortRule({ field, direction: "desc" });
    }
    setCurrentPage(1);
  };

  const isFilterActive = searchInput.trim() !== "" || selectedRoles.length > 0 || selectedTiers.length > 0;

  const clearAllFilters = () => {
    setSearchInput("");
    setSelectedRoles([]);
    setSelectedTiers([]);
    setCurrentPage(1);
  };

  const handleRowClick = (candidate: CandidateOverview) => {
    setOpenCandidate(candidate);
    setSheetOpen(true);
  };

  return (
    <div
      className={`flex flex-col transition-[margin] duration-200 ease-out ${
        sheetOpen ? "md:mr-[600px]" : ""
      }`}
    >
      <div className="px-4 pt-6 pb-6 sm:px-6 sm:pt-8 md:px-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Page Title & Desc */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F0F0F]">Candidates Repository</h1>
          <p className="text-sm text-[#737373] mt-1">
            Search, filter, and view history across all active and past candidate pools.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#737373] bg-[#F5F3EE] border border-[#E8E5DF] rounded-xl px-4 py-2 self-start md:self-auto">
          <Sparkles size={14} className="text-[#C85A17]" />
          <span>Total Pool: {candidates.length} Candidates</span>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-white border border-[#E8E5DF] p-3.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[300px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A0A0A0] pointer-events-none"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, skills or role..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-[#E8E5DF] bg-white text-sm text-[#0F0F0F] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#C85A17] transition-colors"
            />
          </div>

          {/* Roles Filter Dropdown */}
          <MultiSelectPopover
            label="Applied Roles"
            options={availableRoles}
            value={selectedRoles}
            onChange={(v) => {
              setSelectedRoles(v);
              setCurrentPage(1);
            }}
            emptyHint="No roles available"
          />

          {/* Match Tier Filter Dropdown */}
          <MultiSelectPopover
            label="Match Tier"
            options={matchOptions}
            value={selectedTiers}
            onChange={(v) => {
              setSelectedTiers(v);
              setCurrentPage(1);
            }}
          />

          {/* Clear Filters Button */}
          {isFilterActive && (
            <button
              onClick={clearAllFilters}
              className="h-9 px-3 text-xs font-semibold text-[#C85A17] hover:bg-[#FBF1E7] border border-transparent rounded-xl transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Candidates Table */}
      <div className="rounded-2xl border border-[#E8E5DF] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[900px]">
            <colgroup>
              <col className="w-[240px]" />
              <col className="w-[200px]" />
              <col className="w-[180px]" />
              <col className="w-[240px]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[#E8E5DF] bg-[#F5F3EE]">
                {/* Candidate Name Sortable Header */}
                <th className="pl-4 pr-2 py-3 text-left">
                  <button
                    onClick={() => handleSort("candidate_name")}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                  >
                    Candidate
                    {sortRule?.field === "candidate_name" ? (
                      sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                  Current Role
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                  Applied Roles
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                  Skills
                </th>
                {/* Best Score Sortable Header */}
                <th className="px-3 py-3 text-center">
                  <button
                    onClick={() => handleSort("best_score")}
                    className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                  >
                    Best Score
                    {sortRule?.field === "best_score" ? (
                      sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                    )}
                  </button>
                </th>
                {/* Avg Score Sortable Header */}
                <th className="px-3 py-3 text-center">
                  <button
                    onClick={() => handleSort("avg_score")}
                    className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                  >
                    Avg Score
                    {sortRule?.field === "avg_score" ? (
                      sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                    )}
                  </button>
                </th>
                {/* Resumes Count Sortable Header */}
                <th className="pr-4 pl-2 py-3 text-center">
                  <button
                    onClick={() => handleSort("total_resumes")}
                    className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#737373] hover:text-[#0F0F0F]"
                  >
                    Resumes
                    {sortRule?.field === "total_resumes" ? (
                      sortRule.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={12} className="text-[#BDB8AE]" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E5DF]">
              {paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-[#737373]">
                    No candidates found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((candidate) => {
                  const initials = candidate.candidate_name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();
                  const bestScore = candidate.best_score || 0;
                  const avgScore = candidate.avg_score || 0;
                  const tier = getTier(bestScore);
                  
                  // Mock Email
                  const mockEmail = candidate.candidate_name.toLowerCase().replace(/\s+/g, "") + "@example.com";

                  return (
                    <tr
                      key={candidate.id}
                      onClick={() => handleRowClick(candidate)}
                      className="group hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                    >
                      {/* Name / Profile Cell */}
                      <td className="pl-4 pr-2 py-3.5 align-middle sticky left-0 z-10 bg-white group-hover:bg-[#FAFAF8] transition-colors border-r border-[#FAF9F6] shadow-[2px_0_5px_0_rgba(0,0,0,0.01)]">
                        <div className="flex gap-3 items-center min-w-0">
                          <div className="h-9 w-9 rounded-full bg-[#FBF1E7] border border-[#F0D9C0] flex items-center justify-center shrink-0">
                            <span className="text-[12px] font-bold text-[#C85A17] leading-none">
                              {initials}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#0F0F0F] truncate group-hover:text-[#C85A17] transition-colors">
                              {candidate.candidate_name}
                            </p>
                            <p className="text-[11px] text-[#737373] truncate mt-0.5">
                              {mockEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Current Job Cell */}
                      <td className="px-3 py-3.5 align-middle">
                        <p className="text-xs text-[#404040] truncate flex items-center gap-1.5">
                          <Briefcase size={12} className="text-[#A0A0A0]" />
                          {candidate.candidate_current_job || <span className="text-[#D4D4D4] italic">None</span>}
                        </p>
                      </td>

                      {/* Applied Roles Cell */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-full">
                          {candidate.applied_roles.slice(0, 1).map((role) => (
                            <span
                              key={role}
                              className="inline-flex items-center h-5.5 px-2 rounded-full text-[10px] font-semibold bg-[#FBF1E7] text-[#C85A17] border border-[#F0D9C0] truncate max-w-full"
                              title={role}
                            >
                              {role}
                            </span>
                          ))}
                          {candidate.applied_roles.length > 1 && (
                            <span
                              className="inline-flex items-center h-5.5 px-1.5 rounded-full text-[10px] font-semibold bg-[#F5F3EE] text-[#737373] border border-[#E8E5DF]"
                              title={candidate.applied_roles.slice(1).join(", ")}
                            >
                              +{candidate.applied_roles.length - 1} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Skills Cell */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-full">
                          {candidate.skills?.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center h-5.5 px-2 rounded-md text-[10px] font-medium bg-[#F5F3EE] text-[#404040] whitespace-nowrap"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.skills && candidate.skills.length > 3 && (
                            <span className="inline-flex items-center h-5.5 px-1.5 rounded-md text-[10px] font-semibold bg-[#0F0F0F] text-white">
                              +{candidate.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Best Score Cell */}
                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-[#0F0F0F] leading-none">
                            {Math.round(bestScore)}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-semibold"
                            style={{ color: tier.dot }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                            {tier.label}
                          </span>
                        </div>
                      </td>

                      {/* Avg Score Cell */}
                      <td className="px-3 py-3.5 text-center align-middle">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-bold text-[#404040] leading-none">
                            {avgScore.toFixed(1)}
                          </span>
                          <div className="w-12 h-1 bg-[#E8E5DF] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#737373]"
                              style={{ width: `${avgScore}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Resumes Count Cell */}
                      <td className="pr-4 pl-2 py-3.5 text-center align-middle">
                        <span className="inline-flex items-center justify-center h-6 min-w-8 px-2 rounded-full text-xs font-semibold bg-[#F5F3EE] border border-[#E8E5DF] text-[#404040]">
                          {candidate.total_resumes}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-2 bg-transparent">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={filteredCandidates.length}
            pageSize={PAGE_SIZE}
            onChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}

      {/* Analysis Slide-Out Sheet */}
      <CandidateAnalysisSheet
        candidate={openCandidate}
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setOpenCandidate(null);
        }}
        applications={applications}
        onStageChange={handleStageChange}
      />
    </div>
    </div>
  );
};

export default Candidates;

