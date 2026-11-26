import { useEffect, useState } from "react";
import { useNavigate, useSearch as useRouteSearch } from "@tanstack/react-router";
import { ApiError } from "@/lib/api";
import { JdFileUpload } from "@/components/screening/new-screening/JdFileUpload";
import { createSearch, useAnswer, useCoverage, useResults, useSearch, useStartSearch, useUpdateSpec, useVerdict } from "../api";
import { providerNotice } from "../logic";
import type { SearchResult } from "../types";
import { CoveragePanel } from "../components/CoveragePanel";
import { ProspectDrawer } from "../components/ProspectDrawer";
import { QuestionCards } from "../components/QuestionCards";
import { ResultsTable } from "../components/ResultsTable";
import { SpecChips } from "../components/SpecChips";

const PROGRESS_STEPS = ["Searching 2 sources", "Removing duplicates", "Ranking the best matches"];

function errorText(e: unknown) {
  if (e instanceof ApiError && e.status === 404) return "Candidate search is not enabled for this account yet.";
  return e instanceof Error ? e.message : "Something went wrong. Please try again.";
}

export default function TalentSearchPage() {
  const { id } = useRouteSearch({ strict: false }) as { id?: string };
  const navigate = useNavigate();
  const [jdText, setJdText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [open, setOpen] = useState<SearchResult | null>(null);
  const [progress, setProgress] = useState(0);

  const search = useSearch(id);
  const s = search.data;
  const done = s?.status === "done";
  const results = useResults(id, done);
  const coverage = useCoverage(id, done && !!s?.test_mode);
  const answer = useAnswer(id);
  const updateSpec = useUpdateSpec(id);
  const start = useStartSearch(id);
  const verdict = useVerdict(id);

  useEffect(() => {
    if (s?.status !== "searching") { setProgress(0); return; }
    const timer = setInterval(() => setProgress((p) => Math.min(p + 1, PROGRESS_STEPS.length - 1)), 4000);
    return () => clearInterval(timer);
  }, [s?.status]);

  const submitJd = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createSearch({ jdText, file });
      navigate({ to: "/talent-search", search: { id: created.id } as never });
    } catch (e) {
      setCreateError(errorText(e));
    } finally {
      setCreating(false);
    }
  };

  const startOver = () => {
    setJdText(""); setFile(null); setOpen(null);
    navigate({ to: "/talent-search", search: {} as never });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F0F0F]">Find candidates</h1>
          <p className="text-sm text-[#737373]">Describe the role or upload a job description. We search professional profiles and rank the best matches.</p>
        </div>
        {id && <button type="button" onClick={startOver} className="text-sm underline text-[#5C5C5C]">New search</button>}
      </header>

      {!id && (
        <section className="space-y-4 rounded-2xl border border-[#E5E3DF] bg-white p-5">
          <textarea
            id="jd-text"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            disabled={!!file}
            rows={7}
            placeholder="Paste a job description, or type something like: Senior React and Node engineers in Noida, in office, 5+ years"
            className="w-full rounded-xl border border-[#E5E3DF] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A17]/30 disabled:bg-[#FAFAF8]"
          />
          <JdFileUpload file={file} extractedText={file ? file.name : ""} extracting={false} onSelect={setFile} onRemove={() => setFile(null)} />
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="button"
            disabled={creating || (!file && jdText.trim().length < 10)}
            onClick={submitJd}
            className="rounded-lg bg-[#0F0F0F] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {creating ? "Reading the job description…" : "Continue"}
          </button>
        </section>
      )}

      {id && search.isLoading && <p className="text-sm text-[#737373]">Loading…</p>}
      {id && search.error && <p className="text-sm text-red-600">{errorText(search.error)}</p>}

      {s?.status === "questions" && (
        <section className="rounded-2xl border border-[#E5E3DF] bg-white p-5">
          <QuestionCards questions={s.questions} submitting={answer.isPending} onSubmit={(a) => answer.mutate(a)} />
          {answer.error && <p className="mt-3 text-sm text-red-600">{errorText(answer.error)}</p>}
        </section>
      )}

      {s && s.status !== "questions" && (
        <SpecChips
          key={`${s.id}-${s.status === "searching" ? "locked" : "edit"}`}
          spec={s.spec}
          saving={updateSpec.isPending}
          searching={start.isPending || s.status === "searching"}
          onSave={(spec) => updateSpec.mutate(spec)}
          onSearch={async (spec) => { await updateSpec.mutateAsync(spec); start.mutate(); }}
        />
      )}
      {(updateSpec.error || start.error) && <p className="text-sm text-red-600">{errorText(updateSpec.error ?? start.error)}</p>}

      {s?.status === "searching" && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#E5E3DF] bg-white p-5 text-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#C85A17] border-t-transparent" />
          <span>{PROGRESS_STEPS[progress]}…</span>
        </div>
      )}

      {s?.status === "failed" && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{s.error ?? "The search failed. Please try again."}</p>}

      {done && (
        <section className="space-y-4">
          {providerNotice(s.provider_status) && (
            <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">{providerNotice(s.provider_status)}</p>
          )}
          {s.test_mode && <CoveragePanel coverage={coverage.data} />}
          {s.empty_hint && <p className="rounded-xl bg-[#FAFAF8] p-4 text-sm text-[#3D3D3D]">{s.empty_hint}</p>}
          {results.data && results.data.length > 0 && (
            <>
              <p className="text-sm text-[#737373]">{results.data.length} best matches, ranked</p>
              <ResultsTable
                results={results.data}
                mustHaves={s.spec.must_have_skills}
                onOpen={setOpen}
                onVerdict={(r, v) => verdict.mutate({ resultId: r.id, verdict: v })}
              />
            </>
          )}
        </section>
      )}

      <ProspectDrawer result={open} mustHaves={s?.spec.must_have_skills ?? []} showRaw={!!s?.test_mode} onClose={() => setOpen(null)} />
    </div>
  );
}
