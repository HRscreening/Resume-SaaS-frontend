import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateJDStream, downloadJDPdf } from "@/lib/api";
import type { JdGenerateInput, JdGenerateMeta } from "@/lib/api";
import { useTypewriter } from "@/hooks/useTypewriter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Compact field styling for the details grid — smaller than the wizard's main
// inputs so the seven fields don't dominate the step.
const fieldClass =
  "w-full h-9 px-3 rounded-lg border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed";
const labelClass = "block text-xs font-medium text-[#404040] mb-1";

const WORK_ARRANGEMENTS = ["Remote", "Hybrid", "On-site"] as const;
const EmploymentTypes = ["Full-time", "Internship", "Consulting"] as const;


const CURRENCY_OPTIONS = [
  { value: "INR", label: "₹ INR" },
  { value: "USD", label: "$ USD" },
  { value: "EUR", label: "€ EUR" },
  { value: "GBP", label: "£ GBP" },
  { value: "JPY", label: "¥ JPY" },
  { value: "AUD", label: "$ AUD" },
]
// The backend rejects a company_url without an http(s):// scheme, so accept a
// bare domain in the UI and prepend https:// before sending.
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

interface JdAiBuilderProps {
  // Required before generating — sent as `job_title`.
  jobTitle: string;
  // The working JD. Bound to the editable textarea and used as `current_Jd`
  // on reprompts; generation writes its result back through onJdTextChange.
  jdText: string;
  onJdTextChange: (value: string) => void;
}

// "Build with AI" JD mode: a prompt input drives an AI-generated job
// description into an editable textarea. After the first generation the user
// can reprompt a limited number of times (attemptsLeft), passing the current
// JD back so the AI refines rather than starts over.
export function JdAiBuilder({ jobTitle, jdText, onJdTextChange }: JdAiBuilderProps) {
  const [prompt, setPrompt] = useState("");
  // Structured details that ground the generation (sent as `jd_details`). The
  // first four are required by the backend; the rest are optional.
  const [companyName, setCompanyName] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [workArrangement, setWorkArrangement] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [location, setLocation] = useState("");
  // const [salary, setSalary] = useState("");

  const [currency, setCurrency] = useState("INR");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");

  // const [yrsExperience, setYrsExperience] = useState("");

  const [minExperience, setMinExperience] = useState("");
  const [maxExperience, setMaxExperience] = useState("");

  const [department, setDepartment] = useState("");
  const [skills, setSkills] = useState("");
  const [generating, setGenerating] = useState(false);
  // True while the PDF export request is in flight, so the button shows a
  // spinner and can't be double-fired.
  const [downloading, setDownloading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Set once the first stream completes. Tracked separately from attemptsLeft
  // so the "reprompt" UI still works even if the X-Attempts-Left header isn't
  // exposed to the browser.
  const [hasGenerated, setHasGenerated] = useState(false);
  // Server-reported reprompts remaining; null when unknown.
  // const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  // // Total reprompts allowed per window, for the "x / y" display; null when unknown.
  // const [maxAttempts, setMaxAttempts] = useState<number | null>(null);
  // // When the attempt window resets; null when unknown.
  // const [resetsAt, setResetsAt] = useState<Date | null>(null);

  // const outOfAttempts = attemptsLeft !== null && attemptsLeft <= 0;
  // // e.g. "Jun 1, 3:45 PM" — compact, locale-aware, drops the year for brevity.
  // const resetLabel = resetsAt
  //   ? resetsAt.toLocaleString(undefined, {
  //       month: "short",
  //       day: "numeric",
  //       hour: "numeric",
  //       minute: "2-digit",
  //     })
  //   : null;
  // The backend requires these four; gate generation on them so we surface a
  // clear hint instead of a 422.
  const detailsComplete =
    Boolean(currency.trim()) &&
    Boolean(minSalary.trim()) &&
    Boolean(maxSalary.trim()) &&
    Boolean(minExperience.trim()) &&
    Boolean(maxExperience.trim())


  const canGenerate =
    Boolean(jobTitle.trim()) && !generating && detailsComplete && companyName.trim() && companyUrl.trim() && workArrangement.trim() && employmentType.trim();
  // The PDF needs both a JD body and the grounding details the backend requires;
  // gate the export the same way generation is gated so we don't send a 422.
  const canDownload =
    Boolean(jobTitle.trim()) &&
    Boolean(jdText.trim()) &&
    detailsComplete &&
    !generating &&
    !downloading;

  // Assemble the structured `jd_details` payload shared by generation and PDF
  // export. Optional numeric/text fields collapse to null when blank.
  function buildJdDetails(): JdGenerateInput {
    
    if(!minExperience.trim() && maxExperience.trim()){
      throw new Error("Please enter minimum experience");
    }

    if(minExperience.trim() && !maxExperience.trim()){
      throw new Error("Please enter maximum experience");
    }

    if(!minSalary.trim() && maxSalary.trim()){
      throw new Error("Please enter minimum salary");
    }

    if(minSalary.trim() && !maxSalary.trim()){
      throw new Error("Please enter maximum salary");
    }

    if(minExperience.trim() && maxExperience.trim() && parseInt(minExperience) > parseInt(maxExperience)){
      throw new Error("Minimum experience cannot be greater than maximum experience");
    }

    if(minSalary.trim() && maxSalary.trim() && parseInt(minSalary) > parseInt(maxSalary)){
      throw new Error("Minimum salary cannot be greater than maximum salary");
    }

    if(minExperience.trim() && maxExperience.trim() && parseInt(minExperience) < 0){
      throw new Error("Minimum experience cannot be negative");
    }

    if(minSalary.trim() && maxSalary.trim() && parseInt(minSalary) < 0){
      throw new Error("Minimum salary cannot be negative");
    }

    if(minExperience.trim() && maxExperience.trim() && parseInt(maxExperience) < 0){
      throw new Error("Maximum experience cannot be negative");
    }

    if(minSalary.trim() && maxSalary.trim() && parseInt(maxSalary) < 0){
      throw new Error("Maximum salary cannot be negative");
    }

    if(minExperience.trim() && maxExperience.trim() && parseInt(maxExperience) > 50){
      throw new Error("Maximum experience cannot be greater than 50 yrs");
    }

    const experienceRange = `${minExperience.trim()}-${maxExperience.trim()}`;
    const salaryRange = `${currency} ${minSalary.trim()}-${maxSalary.trim()} LPA`;


    const isCompanyUrlValid = !companyUrl.trim() || /^https?:\/\//i.test(companyUrl.trim());
    if (!isCompanyUrlValid) {
      throw new Error("Invalid company URL");
    }

    return {
      job_title: jobTitle.trim(),
      company_name: companyName.trim(),
      company_url: normalizeUrl(companyUrl),
      work_arrangement: workArrangement.trim(),
      employment_type: employmentType.trim(),
      location: location.trim(),
      yrs_experience: experienceRange,
      salary_compensation_info: salaryRange,
      department: department.trim() || null,
      skills: skills.trim() || null,
    };
  }

  // Reveals streamed text at a steady typewriter pace rather than in the big
  // bursts the backend sends, so it reads like a chat response being typed out.
  // `generating` stays true until the reveal fully drains (onDone).
  const typewriter = useTypewriter({
    onReveal: onJdTextChange,
    onDone: () => setGenerating(false),
  });

  // While revealing, keep the textarea pinned to the latest text so it reads
  // top-to-bottom like a chat response. Stops once generation ends so the user
  // can scroll back up freely.
  useEffect(() => {
    if (!generating) return;
    const el = textareaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [jdText, generating]);

  // Sync the attempts/resets display from the quota headers returned by both
  // generation and download. Each field is only applied when present so a
  // missing (e.g. unexposed) header doesn't blank out a known value.
  // function applyMeta(meta: JdGenerateMeta) {
  //   if (meta.attemptsLeft !== null) setAttemptsLeft(meta.attemptsLeft);
  //   if (meta.maxAttempts !== null) setMaxAttempts(meta.maxAttempts);
  //   if (meta.resetsAt !== null) setResetsAt(meta.resetsAt);
  // }

  async function handleGenerate() {
    if (!canGenerate) return;
    setGenerating(true);
    // Capture the JD to refine before we clear the textarea for the new stream.
    const currentJd = jdText;
    typewriter.reset();
    onJdTextChange("");
    try {
      const meta = await generateJDStream(
        {
          jd_details: buildJdDetails(),
          user_input: prompt.trim(),
          current_Jd: currentJd,
        },
        // Buffer each burst; the typewriter reveals it at a steady pace.
        (fullText) => typewriter.push(fullText),
      );
      setHasGenerated(true);
      // applyMeta(meta);
      // Let the typewriter finish revealing whatever is still buffered, then it
      // flips `generating` off via onDone.
      typewriter.finish();
    } catch (err) {
      // Restore the previous JD so a failed reprompt doesn't wipe the user's work.
      typewriter.cancel();
      onJdTextChange(currentJd);
      toast.error(err instanceof Error ? err.message : "Failed to generate job description");
      setGenerating(false);
    }
  }

  async function handleDownloadPdf() {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const { blob, filename, meta } = await downloadJDPdf({
        jd_details: buildJdDetails(),
        user_input: prompt.trim(),
        current_Jd: jdText,
      });
      // The download shares the generation window, so refresh the same
      // attempts/resets display from its headers.
      // applyMeta(meta);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename ?? `${jobTitle.trim() || "job-description"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // The backend returns a 429 with a human-readable limit message when the
      // download quota is spent. Surface it as a toast rather than the parent's
      // page-top banner: the download button lives deep in the scrolled builder,
      // so a banner up top would go unseen.
      toast.error(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-3">

      {/* Job details — structured fields that ground the generation. Open by
          default so the user fills them in; collapsible once done. */}
      <Accordion
        type="single"
        collapsible
        defaultValue="details"
        className="rounded-xl border border-[#D4D4D4] bg-white px-2.5"
      >
        <AccordionItem value="details" className="border-b-0">
          <AccordionTrigger className="px-1 text-[#0F0F0F]">
            <span className="flex items-center gap-2">
              Job details
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-1">
            <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 sm:grid-cols-2">
              {/* Company name */}
              <div>
                <label htmlFor="jd-company-name" className={labelClass}>
                  Company name<span className="text-red-500">*</span>
                </label>
                <input
                  id="jd-company-name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. Acme Inc."
                  className={fieldClass}
                />
              </div>
              {/* Company website */}
              <div>
                <label htmlFor="jd-company-url" className={labelClass}>
                  Company website<span className="text-red-500">*</span>
                </label>
                <input
                  id="jd-company-url"
                  type="text"
                  inputMode="url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. acme.com"
                  className={fieldClass}
                />
              </div>
              {/* Work arrangement */}
              <div>
                <label htmlFor="jd-work-arrangement" className={labelClass}>
                  Work arrangement<span className="text-red-500">*</span>
                </label>
                <select
                  id="jd-work-arrangement"
                  value={workArrangement}
                  onChange={(e) => setWorkArrangement(e.target.value)}
                  disabled={generating}
                  className={`${fieldClass} ${workArrangement ? "" : "text-[#A0A0A0]"}`}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {WORK_ARRANGEMENTS.map((opt) => (
                    <option key={opt} value={opt} className="text-[#0F0F0F]">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {/* Employement Type */}
              <div>
                <label htmlFor="jd-work-arrangement" className={labelClass}>
                  Employment Type<span className="text-red-500">*</span>
                </label>
                <select
                  id="jd-employment-type"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  disabled={generating}
                  className={`${fieldClass} ${employmentType ? "" : "text-[#A0A0A0]"}`}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {EmploymentTypes.map((opt) => (
                    <option key={opt} value={opt} className="text-[#0F0F0F]">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {/* Location */}
              <div>
                <label htmlFor="jd-location" className={labelClass}>
                  Location
                </label>
                <input
                  id="jd-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. Bengaluru, India"
                  className={fieldClass}
                />
              </div>
              {/* Years of experience */}
              <div>
                <label htmlFor="jd-yrs-experience" className={labelClass}>
                  Years of experience<span className="text-red-500">*</span>
                                  
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="jd-yrs-experience-min"
                    type="number"
                    min={0}
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    disabled={generating}
                    placeholder="Min. yrs"
                    className={fieldClass}
                  />
                  -
                  <input
                    id="jd-yrs-experience-max"
                    type="number"
                    min={0}
                    value={maxExperience}
                    onChange={(e) => setMaxExperience(e.target.value)}
                    disabled={generating}
                    placeholder="Max. yrs"
                    className={fieldClass}
                  />
                </div>
              </div>
              {/* Salary / compensation */}
              <div>
                <label htmlFor="jd-salary" className={labelClass}>
                  Salary / compensation<span className="text-red-500">*</span>
                                    <span className="ml-1.5 font-normal text-[#A0A0A0]">(In LPA)</span>
                </label>
                <div className="flex items-center gap-2">
                
                <select
                  id="salary-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={generating}
                  className={`${fieldClass} ${employmentType ? "" : "text-[#A0A0A0]"}`}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {CURRENCY_OPTIONS.map((cur) => (
                    <option key={cur.value} value={cur.value} className="text-[#0F0F0F]">
                      {cur.label}
                    </option>
                  ))}
                </select>

                <input
                  id="jd-salary-min"
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  disabled={generating}
                  placeholder="Min. LPA"
                  className={fieldClass}
                  /> 
                   -
                   <input
                  id="jd-salary-max"
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(e.target.value)}
                  disabled={generating}
                  placeholder="Max. LPA"
                  className={fieldClass}
                  /> 
                  </div>
              </div>
              {/* Department / Team */}
              <div>
                <label htmlFor="jd-department" className={labelClass}>
                  Department / Team
                  <span className="ml-1.5 font-normal text-[#A0A0A0]">(optional)</span>
                </label>
                <input
                  id="jd-department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. Engineering — Platform"
                  className={fieldClass}
                />
              </div>
              {/* Skills — full width */}
              <div className="sm:col-span-2">
                <label htmlFor="jd-skills" className={labelClass}>
                  Required skills
                  <span className="ml-1.5 font-normal text-[#A0A0A0]">(optional)</span>
                </label>
                <input
                  id="jd-skills"
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. Python, FastAPI, PostgreSQL, AWS"
                  className={fieldClass}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Prompt input + generate */}
      <div>
        <label htmlFor="jd-ai-prompt" className="block text-xs font-medium text-[#404040] mb-1.5">
          {hasGenerated ? "Refine the job description" : "Describe the role you want to hire for"}
          <span className="ml-1.5 font-normal text-[#A0A0A0]">(optional)</span>
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            id="jd-ai-prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
            disabled={generating}
            placeholder={
              hasGenerated
                ? "Optional — e.g. add a section on team leadership"
                : "Optional — e.g. 2 yrs experience, scalable systems, strong communication"
            }
            className="flex-1 h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="h-11 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            {generating ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0l1.6 4.4L14 6l-4.4 1.6L8 12l-1.6-4.4L2 6l4.4-1.6L8 0z" />
                <path d="M13 10l.7 1.8L15.5 12.5l-1.8.7L13 15l-.7-1.8L10.5 12.5l1.8-.7L13 10z" />
              </svg>
            )}
            {generating ? "Generating…" : "Generate"}
          </button>
        </div>
        {!jobTitle.trim() ? (
          <p className="mt-1.5 text-xs text-[#a70c0c]">Enter a job title above to start generating.</p>
        ) : (
          !hasGenerated && (
            <p className="mt-1.5 text-xs text-[#A0A0A0]">
              Leave the prompt blank to generate from the details above, or add notes to guide the AI.
            </p>
          )
        )}
      </div>
      {/* Generated JD — editable */}

      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={12}
          value={jdText}
          onChange={(e) => onJdTextChange(e.target.value)}
          readOnly={generating}
          placeholder="Your AI-generated job description will appear here. You can edit it freely before continuing."
          className="w-full px-3.5 py-3 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow resize-none read-only:cursor-default"
        />
        {generating && !jdText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#F5F3EE]/80">
            <div className="h-5 w-5 rounded-full border-2 border-[#C85A17] border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-[#737373]">Writing your job description…</p>
          </div>
        )}
      </div>

      {(hasGenerated || jdText.trim()) && (
        <div className="flex items-center justify-between gap-3 text-xs text-[#A0A0A0]">
          <span>{jdText.length.toLocaleString()} characters</span>
          <div className="flex items-center gap-2">
            {/* { attemptsLeft !== null && (
              <>
              
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    outOfAttempts
                      ? "bg-[#FBE9E7] text-[#a70c0c]"
                      : "bg-[#EFEAE1] text-[#404040]"
                  }`}
                >
                  {maxAttempts !== null ? `${attemptsLeft} / ${maxAttempts}` : attemptsLeft}
                  <span className="font-normal text-[#A0A0A0]">left</span>
                </span>
                {resetLabel && <span className="text-[#A0A0A0]">Resets {resetLabel}</span>}
              </>
            )} */}
            {/* Download the current JD as a PDF (same payload as generation). */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!canDownload}
              className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#E8E5DF] text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download size={12} />
                  Download PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}


    </div>
  );
}
