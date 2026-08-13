import { useState, useEffect } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  X
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import type { CandidateOverview, CandidateDetails } from "@/types/candidate.type";
import type { StagesMap, HiringStage } from "@/types";
import { StageSelect } from "@/components/screening/StageSelect";
import { getTier } from "@/lib/tier";
import { tintColor, shadeColor } from "@/lib/stages";

type CandidateAnalysisSheetProps = {
  candidate: CandidateOverview | null;
  isOpen: boolean;
  onClose: () => void;
  applications: CandidateDetails[];
  onStageChange: (scoreId: string, nextStage: string) => void;
};

// Custom stages mapping matching test data stages
const CANDIDATE_STAGES: StagesMap = {
  Applied: { color: "#A0AEC0", index: 1 },
  "Round 1": { color: "#ED8936", index: 2 },
  "Round 2": { color: "#ECC94B", index: 3 },
  Shortlisted: { color: "#63B3ED", index: 4 },
  Interviewed: { color: "#4299E1", index: 5 },
  Offered: { color: "#48BB78", index: 6 },
  Hired: { color: "#16A34A", index: 7 },
};

const CandidateAnalysisSheet = ({
  candidate,
  isOpen,
  onClose,
  applications,
  onStageChange,
}: CandidateAnalysisSheetProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'applications'>('details');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Filter applications matching candidate applied roles
  const displayApps = candidate
    ? applications.filter((app) =>
        candidate.applied_roles?.some(
          (role) => role.toLowerCase().trim() === app.screening_title.toLowerCase().trim()
        )
      )
    : [];

  // Fallback in case no exact role match is found: show all matching candidate
  const matchedApps = displayApps.length > 0 ? displayApps : applications;

  useEffect(() => {
    setShowAllSkills(false);
    setActiveTab('details');
    setExpandedAppId(null);
  }, [candidate]);

  if (!candidate) return null;

  const initials = candidate.candidate_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const achievements = (candidate.candidate_metadata?.achivements as string[]) || [];
  const certifications = (candidate.candidate_metadata?.certifications as string[]) || [];
  const preferredLocation = candidate.candidate_metadata?.preferred_location || null;

  // Safe date formatter helper
  const formatDateSafe = (dateStr: string, formatStr: string) => {
    try {
      return format(parseISO(dateStr), formatStr);
    } catch {
      try {
        return format(new Date(dateStr), formatStr);
      } catch {
        return dateStr;
      }
    }
  };

  // Safe distance to now helper
  const formatDistanceSafe = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      try {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
      } catch {
        return "";
      }
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <SheetContent
        showOverlay={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="!w-full sm:!max-w-[600px] overflow-y-auto p-0 !z-40 border-l border-[#E8E5DF] bg-[#FAF9F6] flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-[#E8E5DF] bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3 mt-4">
            <SheetTitle className="text-sm font-semibold text-[#0F0F0F]">
              Candidate Overview
            </SheetTitle>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#F5F3EE] text-[#737373] transition-colors focus:outline-none"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex space-x-4 mt-6 border-b border-[#E8E5DF]">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-[#C85A17] text-[#C85A17]'
                  : 'border-transparent text-[#737373] hover:text-[#0F0F0F]'
              }`}
            >
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-[#C85A17] text-[#C85A17]'
                  : 'border-transparent text-[#737373] hover:text-[#0F0F0F]'
              }`}
            >
              Applications ({matchedApps.length})
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'details' && (
            <div className="px-6 py-6 bg-white space-y-6 min-h-full">
              {/* Candidate Profile Details */}
              <div className="flex items-start gap-4 pb-6 border-b border-[#E8E5DF]">
                <div className="h-14 w-14 rounded-full bg-[#FBF1E7] border border-[#F0D9C0] flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-[#C85A17]">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-[#0F0F0F] leading-tight">
                    {candidate.candidate_name}
                  </h1>
                  <p className="text-sm text-[#404040] mt-1 flex items-center gap-1.5">
                    <Briefcase size={14} className="text-[#A0A0A0]" />
                    {candidate.candidate_current_job || <span className="text-[#A0A0A0] italic">No current job</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#737373]">
                    <span className="flex items-center gap-1">
                      <Mail size={12} />
                      {candidate.candidate_name.toLowerCase().replace(/\s+/g, "")}@example.com
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      +91 99999 99999
                    </span>
                    {preferredLocation && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {preferredLocation}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (() => {
                const skills = candidate.skills;
                const hasMore = skills.length > 6;
                const visible = showAllSkills ? skills : skills.slice(0, 6);
                return (
                  <div className="space-y-1.5 pb-6 border-b border-[#E8E5DF]">
                    <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wide">
                      Key Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visible.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center h-6 px-2.5 rounded-md text-xs font-medium bg-[#F5F3EE] text-[#404040]"
                        >
                          {skill}
                        </span>
                      ))}
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => setShowAllSkills(!showAllSkills)}
                          className="inline-flex items-center h-6 px-2.5 rounded-md text-[11px] font-semibold bg-[#0F0F0F] text-white hover:bg-[#333] transition-colors cursor-pointer"
                        >
                          {showAllSkills ? "Show less" : `+${skills.length - 6} more`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Achievements & Certifications */}
              {(achievements.length > 0 || certifications.length > 0) && (
                <div className="grid grid-cols-1 gap-4">
                  {achievements.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#F0EDE8] pb-2 text-[#C85A17]">
                        <Award size={16} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                          Achievements
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {achievements.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-[#404040] leading-relaxed">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C85A17] shrink-0 mt-1.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {certifications.length > 0 && (
                    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#F0EDE8] pb-2 text-[#4299E1]">
                        <BookOpen size={16} />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                          Certifications
                        </h3>
                      </div>
                      <ul className="space-y-2">
                        {certifications.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-[#404040] leading-relaxed">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#4299E1] shrink-0 mt-1.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="px-6 py-6 space-y-4 min-h-full">
              {matchedApps.length > 0 ? (
                matchedApps.map((app) => {
                  const isExpanded = expandedAppId === app.score_id;
                  const tier = getTier(app.candidate_score);
                  return (
                    <div key={app.score_id} className="bg-white rounded-2xl border border-[#E8E5DF] shadow-sm overflow-hidden">
                      {/* Accordion Header */}
                      <button
                        onClick={() => setExpandedAppId(isExpanded ? null : app.score_id)}
                        className="w-full text-left p-5 hover:bg-[#FAF9F6] transition-colors focus:outline-none flex flex-col space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-bold text-[#0F0F0F]">{app.screening_title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-[#737373] flex items-center gap-1">
                                <Clock size={12} />
                                Updated {formatDistanceSafe(app.updated_at)}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                                style={{
                                  backgroundColor: tintColor(tier.dot, 0.9),
                                  color: shadeColor(tier.dot, 0.4),
                                  borderColor: tintColor(tier.dot, 0.7),
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tier.dot }} />
                                {tier.label} ({Math.round(app.candidate_score)}%)
                              </span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="text-[#A0A0A0]" size={20} /> : <ChevronDown className="text-[#A0A0A0]" size={20} />}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#F0EDE8]">
                          <div className="flex gap-4">
                            <div>
                              <span className="text-[10px] text-[#A0A0A0] uppercase font-semibold tracking-wider block">Candidate</span>
                              <span className="text-sm font-bold text-[#0F0F0F]">{Math.round(app.candidate_score)}<span className="text-[10px] text-[#A0A0A0] font-normal">/100</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#A0A0A0] uppercase font-semibold tracking-wider block">Average</span>
                              <span className="text-sm font-bold text-[#737373]">{parseFloat(app.screening_avg_score as any)?.toFixed(1)}<span className="text-[10px] text-[#A0A0A0] font-normal">/100</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#A0A0A0] uppercase font-semibold tracking-wider block">Stage</span>
                              <span className="text-sm font-medium text-[#404040]">{app.stage || "Applied"}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              to="/screenings/$id"
                              params={{ id: app.screening_id }}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-[#F5F3EE] hover:bg-[#E8E5DF] transition-colors text-[#404040]"
                              title="Go to Screening"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={16} />
                            </Link>
                            <button
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-[#F5F3EE] hover:bg-[#E8E5DF] transition-colors text-[#404040]"
                              title="Download Resume"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle download functionality
                              }}
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        </div>
                      </button>

                      {/* Accordion Content (History) */}
                      {isExpanded && (
                        <div className="p-5 border-t border-[#E8E5DF] bg-[#FAF9F6]">
                          {/* Stage Management */}
                          <div className="bg-white rounded-xl border border-[#E8E5DF] p-4 shadow-sm flex items-center justify-between mb-5">
                            <div className="space-y-0.5">
                              <p className="text-[10px] font-semibold text-[#A0A0A0] uppercase tracking-wide">
                                Update Stage
                              </p>
                            </div>
                            <div className="shrink-0">
                              <StageSelect
                                value={app.stage as HiringStage}
                                stages={CANDIDATE_STAGES}
                                onChange={(next) => onStageChange(app.score_id, next)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-4">
                            <TrendingUp size={16} className="text-[#C85A17]" />
                            <h3 className="text-sm font-semibold text-[#0F0F0F]">Stage History & Timeline</h3>
                          </div>

                          <div className="relative pl-6 border-l border-[#E8E5DF] ml-2.5 py-1 space-y-6">
                            {app.stage_history && app.stage_history.length > 0 ? (
                              [...app.stage_history]
                                .sort((a, b) => new Date(b.moved_at).getTime() - new Date(a.moved_at).getTime())
                                .map((historyItem, idx) => {
                                  const stageColor = CANDIDATE_STAGES[historyItem.stage]?.color || "#A0AEC0";
                                  return (
                                    <div key={idx} className="relative">
                                      <span
                                        className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm"
                                        style={{ backgroundColor: stageColor }}
                                      />
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="inline-flex items-center h-5.5 px-2 rounded-full text-xs font-semibold"
                                            style={{
                                              backgroundColor: tintColor(stageColor, 0.85),
                                              color: shadeColor(stageColor, 0.4),
                                            }}
                                          >
                                            {historyItem.stage}
                                          </span>
                                        </div>
                                        <p className="text-xs text-[#737373] flex items-center gap-1.5">
                                          <Calendar size={12} className="text-[#A0A0A0]" />
                                          {formatDateSafe(historyItem.moved_at, "PPP 'at' h:mm a")}
                                          <span className="text-[#D4D4D4]">•</span>
                                          <span className="text-[11px] font-medium text-[#404040]">
                                            {formatDistanceSafe(historyItem.moved_at)}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="relative">
                                <span className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white bg-[#A0AEC0] flex items-center justify-center shadow-sm" />
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center h-5.5 px-2 rounded-full text-xs font-semibold bg-[#F0EDE8] text-[#737373]">
                                      {app.stage || "Applied"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#737373] flex items-center gap-1.5">
                                    <Calendar size={12} className="text-[#A0A0A0]" />
                                    {formatDateSafe(app.created_at, "PPP 'at' h:mm a")}
                                    <span className="text-[#D4D4D4]">•</span>
                                    <span className="text-[11px] font-medium text-[#404040]">
                                      {formatDistanceSafe(app.created_at)}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6 text-center shadow-sm">
                  <p className="text-sm text-[#737373]">No applications recorded for this candidate.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CandidateAnalysisSheet;
