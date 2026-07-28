import { useState, useSyncExternalStore } from "react";
import { format, parseISO } from "date-fns";
import {
  Eye,
  ExternalLink,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderOpen,
  Award,
  Languages,
  Trophy,
} from "lucide-react";
import {InfoRow,MAX_VISIBLE_SKILLS,formatDateSafe,formatExperience} from "@/modules/screening/components/info_sheet";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Application } from "@/modules/screening/types/application.type";
import { resumeUploadService } from "@/lib/services";


/* ─── helpers ─── *
/* ─── main component ─── */


const InfoTab = ({ candidate }: { candidate: Application }) => {

  const [showAllSkills, setShowAllSkills] = useState(false);

  const initials =
    candidate.candidate_name
      ?.split(" ")
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "—";

  const currentJob = candidate.candidate_current_job;
  const currentCompany = candidate.current_company ?? candidate.work_ex?.[0]?.company;

  // Collect which accordion sections have content
  const hasContact = !!(candidate.candidate_email || candidate.candidate_phone);
  const hasSkills = (candidate.skills?.length ?? 0) > 0;
  const hasWorkEx = (candidate.work_ex?.length ?? 0) > 0;
  const hasEducation = (candidate.education?.length ?? 0) > 0;
  const hasProjects = (candidate.project?.length ?? 0) > 0;
  const hasCerts = (candidate.certification?.length ?? 0) > 0;
  const hasAchievements = (candidate.achievements?.length ?? 0) > 0;
  const hasLeadership = (candidate.leadership_pors?.length ?? 0) > 0;
  const hasLanguages = (candidate.languages?.length ?? 0) > 0;


  const handleResumeClick = async (path: string | null) => {
    if (!path) return;

    const url = path.startsWith("http")
      ? path
      : await resumeUploadService.generateSignedUrls(path);

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div
        className="w-full! sm:!max-w-150! overflow-y-auto p-0 z-40!"
      >

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          {/* ── Candidate header ── */}
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-[#FBF1E7] border border-[#E8E5DF] flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-[#C85A17]">{initials}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-[#0F0F0F] leading-tight">
                {candidate.candidate_name}
              </h1>

              {currentJob && (
                <p className="text-sm text-[#404040] mt-0.5">
                  {currentJob}
                  {currentCompany && (
                    <span className="text-[#737373]"> @ {currentCompany}</span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {candidate.total_experience != null && (
                  <span className="px-2 py-1 rounded-lg bg-[#F5F3EE] text-xs text-[#404040] font-medium">
                    💼 {formatExperience(candidate.total_experience)}
                  </span>
                )}
                {candidate.current_industry && (
                  <span className="px-2 py-1 rounded-lg bg-[#F5F3EE] text-xs text-[#404040] font-medium">
                    🏢 {candidate.current_industry}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-1">
              {candidate.resume_url && (
                <span
                  onClick={() => handleResumeClick(candidate.resume_url)}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#E8E5DF] text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors"
                >
                  <ExternalLink size={12} />
                  Resume
                </span>
              )}
            </div>
          </div>

          {/* ── Accordion sections ── */}
          <Accordion type="multiple" defaultValue={["contact", "skills"]}>
            {/* Contact */}
            {hasContact && (
              <AccordionItem value="contact" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Contact Information
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="bg-[#F5F3EE] rounded-xl p-4 space-y-0">
                    {candidate.candidate_email && (
                      <InfoRow
                        icon={<Mail size={13} className="text-[#A0A0A0]" />}
                        label="Email"
                        value={candidate.candidate_email}
                        href={`mailto:${candidate.candidate_email}`}
                      />
                    )}
                    {candidate.candidate_phone && (
                      <InfoRow
                        icon={<Phone size={13} className="text-[#A0A0A0]" />}
                        label="Phone"
                        value={candidate.candidate_phone}
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Skills */}
            {hasSkills && (
              <AccordionItem value="skills" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Wrench size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Skills
                    </span>
                    <span className="ml-1 text-[10px] text-[#BDB8AE]">
                      ({candidate.skills!.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  {(() => {
                    const allSkills = candidate.skills!;
                    const hasMore = allSkills.length > MAX_VISIBLE_SKILLS;
                    const visible = showAllSkills ? allSkills : allSkills.slice(0, MAX_VISIBLE_SKILLS);
                    return (
                      <div className="flex flex-wrap gap-2">
                        {visible.map((skill, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-100 text-xs font-medium text-green-700"
                          >
                            {skill}
                          </span>
                        ))}
                        {hasMore && (
                          <button
                            type="button"
                            onClick={() => setShowAllSkills(!showAllSkills)}
                            className="inline-flex items-center h-6 px-2.5 rounded-lg text-[11px] font-semibold bg-[#0F0F0F] text-white hover:bg-[#333] transition-colors cursor-pointer"
                          >
                            {showAllSkills ? "Show less" : `+${allSkills.length - MAX_VISIBLE_SKILLS} more`}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Work Experience */}
            {hasWorkEx && (
              <AccordionItem value="work-ex" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Briefcase size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Work Experience
                    </span>
                    <span className="ml-1 text-[10px] text-[#BDB8AE]">
                      ({candidate.work_ex!.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="space-y-3">
                    {candidate.work_ex!.map((exp, index) => (
                      <div
                        key={`${exp.company}-${index}`}
                        className="rounded-xl border border-[#E8E5DF] p-4 bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[#0F0F0F]">
                            {exp.designation ?? "—"}
                          </p>
                          {index === 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-green-50 border border-green-100 text-[11px] font-medium text-green-700">
                              Current
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-[#404040]">
                            {exp.company ?? "—"}
                            {exp.company_industry && (
                              <span className="text-[#A0A0A0]"> · {exp.company_industry}</span>
                            )}
                          </p>
                          <p className="text-xs text-[#737373] whitespace-nowrap">
                            {formatDateSafe(exp.start_date)} – {exp.end_date ? formatDateSafe(exp.end_date) : "Present"}
                          </p>
                        </div>

                        {/* Achievements */}
                        {(exp.achievements?.length ?? 0) > 0 && (
                          <div className="mt-2.5 space-y-1">
                            {exp.achievements!.map((a, idx) => (
                              <p key={idx} className="text-[11px] text-[#737373] flex items-start gap-1.5">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C85A17] shrink-0" />
                                {a}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Responsibilities */}
                        {(exp.responsibilities?.length ?? 0) > 0 && (
                          <div className="mt-2 space-y-1">
                            {exp.responsibilities!.map((r, idx) => (
                              <p key={idx} className="text-[11px] text-[#737373] flex items-start gap-1.5">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#A0A0A0] shrink-0" />
                                {r}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Education */}
            {hasEducation && (
              <AccordionItem value="education" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Education
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="space-y-3">
                    {candidate.education!.map((edu, index) => (
                      <div
                        key={`${edu.institution}-${index}`}
                        className="rounded-xl border border-[#E8E5DF] p-4 bg-white"
                      >
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                          {edu.institution ?? "—"}
                        </p>
                        <p className="text-sm text-[#404040] mt-0.5">
                          {edu.degree ?? "—"}
                          {edu.course_specialization && (
                            <span className="text-[#737373]"> · {edu.course_specialization}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {edu.education_lvl && (
                            <span className="text-xs text-[#737373]">{edu.education_lvl}</span>
                          )}
                          {(edu.start_yr || edu.end_yr) && (
                            <span className="text-xs text-[#A0A0A0]">
                              ({edu.start_yr ?? "—"} – {edu.end_yr ?? "—"})
                            </span>
                          )}
                          {edu.grade && (
                            <span className="px-1.5 py-0.5 rounded bg-[#F5F3EE] text-[11px] font-medium text-[#404040]">
                              {edu.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Projects */}
            {hasProjects && (
              <AccordionItem value="projects" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FolderOpen size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Projects
                    </span>
                    <span className="ml-1 text-[10px] text-[#BDB8AE]">
                      ({candidate.project!.length})
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="space-y-3">
                    {candidate.project!.map((proj, index) => (
                      <div
                        key={`${proj.name}-${index}`}
                        className="rounded-xl border border-[#E8E5DF] p-4 bg-white"
                      >
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                          {proj.name ?? "—"}
                        </p>
                        {proj.role_played && (
                          <p className="text-xs text-[#737373] mt-0.5">{proj.role_played}</p>
                        )}
                        {proj.description && (
                          <p className="text-xs text-[#404040] leading-relaxed mt-1.5">
                            {proj.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {proj.duration && (
                            <span className="text-[11px] text-[#A0A0A0]">⏱ {proj.duration}</span>
                          )}
                          {proj.technologies_used?.map((tech, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-[#F5F3EE] text-[11px] font-medium text-[#404040]"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Certifications */}
            {hasCerts && (
              <AccordionItem value="certifications" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Certifications
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="space-y-3">
                    {candidate.certification!.map((cert, index) => (
                      <div
                        key={`${cert.name}-${index}`}
                        className="rounded-xl border border-[#E8E5DF] p-4 bg-white"
                      >
                        <p className="text-sm font-semibold text-[#0F0F0F]">
                          {cert.name ?? "—"}
                        </p>
                        {cert.issuing_organization && (
                          <p className="text-xs text-[#404040] mt-0.5">
                            {cert.issuing_organization}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                          {cert.issue_date && (
                            <span className="text-[11px] text-[#A0A0A0]">
                              Issued: {formatDateSafe(cert.issue_date, "MMM yyyy")}
                            </span>
                          )}
                          {cert.expiration_date && (
                            <span className="text-[11px] text-[#A0A0A0]">
                              · Expires: {formatDateSafe(cert.expiration_date, "MMM yyyy")}
                            </span>
                          )}
                        </div>
                        {cert.credential_url_or_id && (
                          <a
                            href={cert.credential_url_or_id.startsWith("http") ? cert.credential_url_or_id : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#C85A17] hover:underline mt-1.5"
                          >
                            <ExternalLink size={10} />
                            View Credential
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Achievements & Leadership */}
            {(hasAchievements || hasLeadership) && (
              <AccordionItem value="achievements" className="border-b border-[#E8E5DF]">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Achievements & Leadership
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="space-y-4">
                    {hasAchievements && (
                      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                        <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2.5">
                          Achievements
                        </p>
                        <ul className="space-y-1.5">
                          {candidate.achievements!.map((a, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-green-900">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasLeadership && (
                      <div className="bg-[#F5F3EE] border border-[#E8E5DF] rounded-xl p-4">
                        <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-2.5">
                          Leadership & PORs
                        </p>
                        <ul className="space-y-1.5">
                          {candidate.leadership_pors!.map((l, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#404040]">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C85A17] shrink-0" />
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Languages */}
            {hasLanguages && (
              <AccordionItem value="languages" className="border-b-0">
                <AccordionTrigger className="py-3 px-1 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Languages size={14} className="text-[#C85A17]" />
                    <span className="text-xs font-semibold text-[#737373] uppercase tracking-wide">
                      Languages
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-1 pb-3">
                  <div className="flex flex-wrap gap-2">
                    {candidate.languages!.map((lang, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#F5F3EE] border border-[#E8E5DF] text-xs font-medium text-[#404040]"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default InfoTab;
