// Development only: the talent search screens with sample data, so the layout
// can be reviewed without provider keys or a backend.
import { useState } from "react";
import { CoveragePanel } from "../components/CoveragePanel";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { QuestionCards } from "../components/QuestionCards";
import { ResultsTable } from "../components/ResultsTable";
import { SpecChips } from "../components/SpecChips";
import type { ClarifyingQuestion, Coverage, SearchResult, SearchSpec } from "../types";

const SPEC: SearchSpec = {
  role_title: "Senior Full-stack Engineer", seniority: "Senior", min_years: 5, max_years: 10,
  locations: [{ country: "IN", city: "Noida" }], work_mode: "onsite",
  must_have_skills: ["React", "Node"], nice_to_have_skills: ["TypeScript", "AWS"], skill_synonyms: { React: ["ReactJS"] },
  title_variants: ["Full Stack Developer", "Software Engineer", "MERN Developer"], target_companies: [],
  signals: [], anti_signals: [], work_authorization: null, timezone_overlap: null,
};

const QUESTIONS: ClarifyingQuestion[] = [
  { field: "must_have_skills", question: "Which core skills must candidates have?", allow_other: true, options: [
    { id: "a", label: "Node, React", description: "", patch: {} },
    { id: "b", label: "Java, React", description: "", patch: {} },
    { id: "c", label: ".NET, React", description: "", patch: {} },
    { id: "d", label: "Python, React", description: "", patch: {} },
  ] },
  { field: "min_years", question: "How much relevant experience is needed?", allow_other: true, options: [
    { id: "e", label: "3-5 years", description: "Mid level", patch: {} },
    { id: "f", label: "5-8 years", description: "Senior", patch: {} },
    { id: "g", label: "8+ years", description: "Lead or staff", patch: {} },
  ] },
];

const COVERAGE: Coverage = {
  providers: {
    crustdata: { returned: 50, fields: { photo: 64, linkedin: 100, full_name: 100, title: 100, company: 98, location: 100, work_history: 96, skills: 72, email: 0 } },
    apollo: { returned: 100, fields: { photo: 21, linkedin: 25, full_name: 25, title: 100, company: 100, location: 25, work_history: 24, skills: 0, email: 18 } },
  },
  cross_provider_duplicates: 9,
};

function result(i: number, name: string | null, photo: string | null, score: number, band: SearchResult["fit_band"], react: "yes" | "no" | "unknown", node: "yes" | "no" | "unknown", sources: string[]): SearchResult {
  return {
    id: `r${i}`, rank: i, score, fit_band: band, verdict: "pending", reject_reason: null,
    summary: "Six years building React and Node products at B2B SaaS companies, currently a senior engineer.",
    skill_verdicts: { React: { verdict: react, evidence: react === "yes" ? "Led the React rewrite of the dashboard at Acme (2023 to now)" : "" }, Node: { verdict: node, evidence: node === "yes" ? "Built Node.js APIs for billing at Beta Labs" : "" } },
    full_name: name, headline: "Senior Software Engineer | React, Node, AWS", current_title: "Senior Software Engineer",
    current_company: ["Acme", "Zeta Systems", "Paytm", "Nagarro", "Adobe"][i % 5], location: "Noida, Uttar Pradesh, India",
    photo_url: photo, linkedin_url: name ? `https://www.linkedin.com/in/sample-${i}` : null, sources,
    work_history: [
      { title: "Senior Software Engineer", company: "Acme", start_date: "2023-03-01", end_date: null, current: true },
      { title: "Software Engineer", company: "Beta Labs", start_date: "2019-07-01", end_date: "2023-02-01" },
      { title: "Associate Engineer", company: "Gamma", start_date: "2018-01-01", end_date: "2019-06-01" },
    ],
    skills: ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"], total_years: 7.4,
    tenure: { total_months: 86, avg_months: 29, current_months: 20, role_count: 3 }, switch_likelihood: "medium",
    raw_records: { [sources[0]]: { sample: true } },
  };
}

const RESULTS = [
  result(0, "Asha Rao", "https://broken.example/asha.jpg", 92, "strong", "yes", "yes", ["crustdata", "apollo"]),
  result(1, "Vikram Shah", null, 84, "strong", "yes", "yes", ["crustdata"]),
  result(2, "Neha Ku***r", null, 71, "good", "yes", "unknown", ["apollo"]),
  result(3, "Rohan Mehta", null, 58, "partial", "unknown", "yes", ["crustdata"]),
  result(4, null, null, 41, "weak", "no", "unknown", ["apollo"]),
];

export default function TalentSearchPreview() {
  const [open, setOpen] = useState<SearchResult | null>(null);
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Talent search preview (sample data)</h1>
      <section className="rounded-2xl border border-[#E5E3DF] bg-white p-5">
        <QuestionCards questions={QUESTIONS} submitting={false} onSubmit={() => {}} />
      </section>
      <SpecChips spec={SPEC} saving={false} searching={false} onSave={() => {}} onSearch={() => {}} />
      <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">1 source unavailable: Apollo</p>
      <CoveragePanel coverage={COVERAGE} />
      <ResultsTable results={RESULTS} mustHaves={SPEC.must_have_skills} onOpen={setOpen} onVerdict={() => {}} />
      <ProspectDrawer result={open} mustHaves={SPEC.must_have_skills} showRaw onClose={() => setOpen(null)} />
    </div>
  );
}
