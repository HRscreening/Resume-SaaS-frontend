import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultsTable } from "./ResultsTable";
import type { SearchResult } from "../types";

const row: SearchResult = {
  id: "r1", rank: 0, score: 86, fit_band: "strong", summary: "React at Acme for 3 years",
  skill_verdicts: { React: { verdict: "yes", evidence: "React at Acme" }, Node: { verdict: "unknown", evidence: "" } },
  verdict: "pending", reject_reason: null, full_name: "Asha Rao", headline: "Frontend", current_title: "Senior Frontend Engineer",
  current_company: "Acme", location: "Noida, India", photo_url: null, linkedin_url: "https://www.linkedin.com/in/asha",
  sources: ["crustdata", "apollo"], work_history: [], skills: [], total_years: 7,
  tenure: { total_months: 86, avg_months: 20, current_months: 20, role_count: 4 }, switch_likelihood: "medium",
};

describe("ResultsTable", () => {
  const html = renderToStaticMarkup(
    <ResultsTable results={[row]} mustHaves={["React", "Node"]} onOpen={() => {}} onVerdict={() => {}} />,
  );

  it("renders one column per must-have skill", () => {
    expect(html).toContain(">React<");
    expect(html).toContain(">Node<");
    expect(html.match(/data-skill-cell/g)?.length).toBe(2);
  });

  it("shows match, sources and a LinkedIn link", () => {
    expect(html).toContain("86%");
    expect(html).toContain("Crustdata");
    expect(html).toContain("Apollo");
    expect(html).toContain('href="https://www.linkedin.com/in/asha"');
  });
});
