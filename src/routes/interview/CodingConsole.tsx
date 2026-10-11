import { useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";

import type { InterviewExample, RunResultItem } from "@/lib/interviewApi";
import { ActionButton, Banner, LabelledCode } from "./codingPaneParts";
import { summarizeError } from "./execution/errorTrace";
import { verdictSummary } from "./execution/verdictSummary";
import type { UseCodingQuestions } from "./useCodingQuestions";

type ConsoleTab = "results" | "input";

interface CodingConsoleProps {
  coding: UseCodingQuestions;
  examples: InterviewExample[];
}

// Everything a run or a submit reports, in one panel under the editor with
// a height of its own. It used to be stacked loose beneath the editor,
// where a few failed examples pushed the rest past the bottom of a screen
// that cannot scroll: the candidate could see that something failed but
// not what. Now the panel is a fixed share of the column and scrolls
// inside itself, and it opens on its own whenever there is news.
export default function CodingConsole({ coding, examples }: CodingConsoleProps) {
  const { runResult, runNotice, runNote, isRunning, verdict, customResult } = coding;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ConsoleTab>("results");

  useEffect(() => {
    if (runResult || runNotice || verdict) {
      setOpen(true);
      setTab("results");
    }
  }, [runResult, runNotice, verdict]);

  // A run in flight opens the panel but leaves the tab alone: it may be a
  // run of the candidate's own input, started from the other tab.
  useEffect(() => {
    if (isRunning) setOpen(true);
  }, [isRunning]);

  useEffect(() => {
    if (customResult) {
      setOpen(true);
      setTab("input");
    }
  }, [customResult]);

  function choose(next: ConsoleTab) {
    setTab(next);
    setOpen(true);
  }

  return (
    <section
      aria-label="Run output"
      className={`shrink-0 flex flex-col rounded-lg border border-[#E5E1D8] bg-white overflow-hidden ${
        open ? "lg:h-[42%] lg:min-h-[168px]" : ""
      }`}
    >
      <div className="shrink-0 flex items-center justify-between gap-2 px-2 h-9 border-b border-[#E5E1D8] bg-[#FAF9F5]">
        <div className="flex items-center gap-1" role="tablist">
          <TabButton active={open && tab === "results"} onClick={() => choose("results")}>
            Results
            <ResultsBadge coding={coding} />
          </TabButton>
          <TabButton active={open && tab === "input"} onClick={() => choose("input")}>
            Try your own input
          </TabButton>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? "Collapse output panel" : "Expand output panel"}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-[#737373] hover:bg-[#F0EEE6]"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2.5">
          {tab === "results" ? (
            <>
              {verdict && (
                <VerdictPanel verdict={verdict} onMoveOn={coding.handleMoveOn} busy={coding.isSubmitting} />
              )}
              {runNote && !isRunning && <Banner tone="warning">{runNote}</Banner>}
              <RunResults coding={coding} examples={examples} />
            </>
          ) : (
            <CustomInput coding={coding} />
          )}
        </div>
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? "bg-white text-[#0F0F0F] shadow-sm border border-[#E5E1D8]" : "text-[#737373] hover:text-[#0F0F0F]"
      }`}
    >
      {children}
    </button>
  );
}

// The outcome at a glance, readable even while the panel is collapsed.
function ResultsBadge({ coding }: { coding: UseCodingQuestions }) {
  const { runResult, isRunning } = coding;
  if (isRunning || !runResult || runResult.results[0]?.status === "output") return null;
  const allPassed = runResult.passed === runResult.ran;
  return (
    <span
      className={`px-1.5 rounded-full text-[10px] font-semibold tabular-nums ${
        allPassed ? "bg-[#E7F5EC] text-[#166534]" : "bg-red-50 text-red-700"
      }`}
    >
      {runResult.passed}/{runResult.ran}
    </span>
  );
}

function RunResults({ coding, examples }: { coding: UseCodingQuestions; examples: InterviewExample[] }) {
  const { runResult, runNotice, isRunning } = coding;

  if (isRunning) return <p className="text-xs text-[#737373]">Running your code.</p>;
  if (runNotice) {
    return <Banner tone={runNotice.kind === "unavailable" ? "warning" : "error"}>{runNotice.message}</Banner>;
  }
  if (!runResult) {
    return (
      <p className="text-xs text-[#737373]">
        Press Run to check your code against the examples. What it prints, and any error, shows here.
      </p>
    );
  }
  if (runResult.compile_error) {
    return <LabelledCode label="Compile error" value={runResult.compile_error} tone="error" />;
  }

  // A question with no structured examples has nothing to check against, so
  // "1 of 1 examples passed" would be a claim about work never done.
  const bare = runResult.results[0]?.status === "output" || examples.length === 0;
  return (
    <>
      <p className="text-xs font-medium text-[#404040]">
        {bare ? "Your code ran. Output below." : `${runResult.passed} of ${runResult.ran} examples passed.`}
      </p>
      {runResult.results.map((result) =>
        bare ? (
          <BareResult key={result.index} result={result} />
        ) : (
          <ExampleResult key={result.index} result={result} input={examples[result.index]?.input} />
        ),
      )}
    </>
  );
}

function ExampleResult({ result, input }: { result: RunResultItem; input: string | undefined }) {
  if (result.passed) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-[#BBE5CA] bg-[#E7F5EC] px-2.5 py-1.5 text-xs font-semibold text-[#166534]">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Example {result.index + 1}: Passed
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        Example {result.index + 1}: {failureLabel(result)}
      </div>
      <ErrorDetail stderr={result.stderr} crashed={result.status !== "ok"} />
      {input !== undefined && <LabelledCode label="Input" value={input} />}
      {result.status === "ok" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <LabelledCode label="Expected output" value={result.expected ?? ""} />
          <LabelledCode label="Your output" value={result.actual || "(nothing printed)"} />
        </div>
      ) : (
        result.stdout && <LabelledCode label="Printed before the error" value={result.stdout} />
      )}
    </div>
  );
}

function BareResult({ result }: { result: RunResultItem }) {
  return (
    <div className="flex flex-col gap-2">
      <ErrorDetail stderr={result.stderr} crashed={!result.passed} />
      <LabelledCode label="Output" value={result.stdout || "(nothing printed)"} />
    </div>
  );
}

function failureLabel(result: RunResultItem): string {
  if (result.status === "timeout") return "Timed out";
  if (result.status === "runtime_error") return "Your code raised an error";
  return "Wrong output";
}

// What went wrong, most useful part first: the error itself and the line of
// the candidate's own code it happened on, then the call path for anyone
// who wants it. `crashed` false means stderr is just something the program
// chose to print, which is shown plainly rather than dressed as an error.
function ErrorDetail({ stderr, crashed }: { stderr: string; crashed: boolean }) {
  if (!stderr.trim()) return null;
  if (!crashed) return <LabelledCode label="Written to stderr" value={stderr} />;

  const summary = summarizeError(stderr);
  if (!summary) return null;
  const hasPath = stderr.trim() !== summary.headline;
  return (
    <div className="rounded border border-red-200 bg-white px-2 py-1.5 flex flex-col gap-1">
      <p className="text-xs font-mono font-semibold text-red-700 break-words">{summary.headline}</p>
      {summary.line !== null && (
        <p className="text-xs text-red-700">On line {summary.line} of your code, highlighted in the editor.</p>
      )}
      {hasPath && (
        <details>
          <summary className="cursor-pointer select-none text-[11px] text-[#737373]">Show the call path</summary>
          <pre className="mt-1 text-[11px] font-mono text-[#404040] whitespace-pre-wrap break-words">{stderr}</pre>
        </details>
      )}
    </div>
  );
}

// Shown after a Submit whose hidden checks did not all pass. The question
// is not over: the code is saved, and the candidate can fix it and submit
// again, or leave it as it is. Counts and categories only, because that is
// all the server sends; which input failed is theirs to work out.
function VerdictPanel({
  verdict,
  onMoveOn,
  busy,
}: {
  verdict: NonNullable<UseCodingQuestions["verdict"]>;
  onMoveOn: () => void;
  busy: boolean;
}) {
  const summary = verdictSummary(verdict);
  const isError = summary.tone === "error";
  const text = isError ? "text-red-700" : "text-[#8A4B08]";
  return (
    <div
      role="status"
      className={`rounded-lg border px-3 py-2.5 flex flex-col gap-1.5 ${
        isError ? "border-red-200 bg-red-50" : "border-[#F3D8A8] bg-[#FDECD2]"
      }`}
    >
      <p className={`text-xs font-semibold ${text}`}>Last submission: {summary.headline}</p>
      {summary.detail &&
        (isError ? (
          <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap break-words">{summary.detail}</pre>
        ) : (
          <p className={`text-xs ${text}`}>{summary.detail}</p>
        ))}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className={`text-xs ${text}`}>
          Your code is saved. Fix it and submit again, or move on with this answer.
        </p>
        <button
          type="button"
          onClick={onMoveOn}
          disabled={busy}
          className="h-7 px-2.5 text-xs font-medium rounded-lg border border-[#D4D4D4] bg-white text-[#404040] hover:bg-[#F5F3EE] disabled:opacity-50 disabled:pointer-events-none"
        >
          Move on with this answer
        </button>
      </div>
    </div>
  );
}

// Lets the candidate run their code on input of their own, to try a case
// the worked examples do not cover. Output only: there is nothing to
// compare it against, and it does not count towards unlocking Submit.
function CustomInput({ coding }: { coding: UseCodingQuestions }) {
  const { customInput, setCustomInput, customResult, handleRunCustom, isRunning, runBlockedReason } = coding;
  const result = customResult?.results[0];
  return (
    <>
      <textarea
        value={customInput}
        onChange={(event) => setCustomInput(event.target.value)}
        rows={3}
        spellCheck={false}
        aria-label="Custom input"
        placeholder="Type the input your program should read, in the same format as the examples."
        className="w-full shrink-0 rounded border border-[#E8E5DF] bg-[#FAF9F5] px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0F0F0F]"
      />
      <div className="flex justify-end">
        <ActionButton
          onClick={handleRunCustom}
          disabled={isRunning || Boolean(runBlockedReason)}
          label={isRunning ? "Running" : "Run with this input"}
          loading={isRunning}
          disabledReason={isRunning ? "A run is already in progress." : (runBlockedReason ?? "")}
        />
      </div>
      {result && <BareResult result={result} />}
    </>
  );
}
