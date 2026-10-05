import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { InterviewExample, InterviewLanguage } from "@/lib/interviewApi";
import { Markdown } from "./markdown";
import CodeEditor from "./CodeEditor";
import { formatCountdown } from "./useCountdown";
import type { UseCodingQuestions } from "./useCodingQuestions";

const LANGUAGES: { value: InterviewLanguage; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++" },
];

interface CodingPaneProps {
  coding: UseCodingQuestions;
}

// The "question in focus" pinned slot, for a coding question: the problem
// statement and examples, with the editor beside it. This is the SAME slot
// PinnedQuestion fills for a spoken one — InterviewRoom mounts exactly one
// of the two, never both — so this component owns only that slot's content.
// Progress ("question N of M"), elapsed time, and the voice presence all
// moved up to TopBar, which is shared across both slot kinds; duplicating
// them here (as the old CompactVoice/QuestionProgress did) would just be
// the same two numbers shown twice.
//
// Rendered only while the current question is a coding one AND the agent's
// own signal has actually presented it (InterviewRoom gates on
// `coding.showPane`) — a spoken question, or no question data at all, falls
// back to the plain conversation view untouched.
export default function CodingPane({ coding }: CodingPaneProps) {
  const { current } = coding;
  if (!current || current.kind !== "coding") return null;

  return (
    <div className="w-full flex-1 flex flex-col gap-4 px-4 pb-4 min-h-0">
      <div className="flex items-center justify-end gap-3">
        <TimerBadge secondsRemaining={coding.secondsRemaining} warning={coding.warning} />
      </div>

      {coding.warning && (
        <Banner tone="warning">One minute left on this question.</Banner>
      )}
      {coding.submitNotice && (
        <Banner tone={coding.submitNotice.kind === "saved" ? "success" : "error"}>
          {coding.submitNotice.message}
        </Banner>
      )}

      {/* Below lg the two panes stack. The ancestor is h-screen with
          overflow-hidden, so without a scroller here the editor column -
          and the Run button at the top of it - was simply clipped off the
          bottom of the screen, unreachable. At lg each pane scrolls
          internally instead and this stays a fixed two-column split. */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto lg:overflow-hidden">
        <QuestionPane
          title={current.title}
          statementMd={current.statement_md}
          examples={current.examples}
        />
        <EditorPane coding={coding} />
      </div>
    </div>
  );
}

function TimerBadge({ secondsRemaining, warning }: { secondsRemaining: number; warning: boolean }) {
  return (
    <span
      className={`text-xs font-semibold tabular-nums px-2.5 py-1 rounded-full ${
        warning ? "bg-[#FDECD2] text-[#8A4B08]" : "bg-[#F0EEE6] text-[#404040]"
      }`}
    >
      {formatCountdown(secondsRemaining)} left
    </span>
  );
}

function Banner({ tone, children }: { tone: "warning" | "success" | "error"; children: React.ReactNode }) {
  const classes =
    tone === "warning"
      ? "bg-[#FDECD2] text-[#8A4B08] border-[#F3D8A8]"
      : tone === "success"
        ? "bg-[#E7F5EC] text-[#166534] border-[#BBE5CA]"
        : "bg-red-50 text-red-700 border-red-200";
  return <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${classes}`}>{children}</div>;
}

function QuestionPane({
  title,
  statementMd,
  examples,
}: {
  title: string;
  statementMd: string;
  examples: InterviewExample[];
}) {
  // Stays on screen for the whole question: it scrolls internally rather
  // than scrolling off the page, and nothing collapses it. See the
  // contract's "Frontend behaviour" section — the candidate was explicit
  // that the question must not disappear.
  return (
    <div className="flex flex-col rounded-xl border border-[#E5E1D8] bg-white overflow-hidden min-h-[200px] lg:min-h-0">
      <div className="px-4 py-3 border-b border-[#E5E1D8]">
        <h2 className="text-sm font-semibold text-[#0F0F0F]">{title}</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        <Markdown text={statementMd} />
        {examples.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Examples</p>
            {examples.map((example, i) => (
              <ExampleCard key={i} index={i} example={example} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExampleCard({ index, example }: { index: number; example: InterviewExample }) {
  return (
    <div className="rounded-lg border border-[#E8E5DF] bg-[#FAF9F5] p-3 flex flex-col gap-2">
      <p className="text-xs font-medium text-[#737373]">Example {index + 1}</p>
      <LabelledCode label="Input" value={example.input} />
      <LabelledCode label="Output" value={example.output} />
      {example.note && <p className="text-xs text-[#737373] italic">{example.note}</p>}
    </div>
  );
}

function LabelledCode({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A3A3A3] mb-1">{label}</p>
      <pre className="text-xs font-mono whitespace-pre-wrap break-words rounded bg-white border border-[#E8E5DF] px-2 py-1.5">
        {value}
      </pre>
    </div>
  );
}

function EditorPane({ coding }: { coding: UseCodingQuestions }) {
  const { buffer, setSource, setLanguage, isRunning, isSubmitting, runBlockedReason, runNote,
    submitBlocked, submitBlockedReason, handleRun, handleSubmit } = coding;
  if (!buffer) return null;

  // Run is disabled either because a run is already in flight (self-evident
  // from the spinner) or for a structural reason the candidate cannot fix by
  // waiting a moment and clicking again in the same way — a language with no
  // browser runner, or Python's worker not being ready yet. Both still get
  // an explicit reason on the button itself ("every disabled control
  // explains itself"); the structural one additionally gets a standing
  // banner below, since a hover tooltip alone is easy to miss on a button
  // that otherwise looks identical to always.
  const runDisabled = isRunning || Boolean(runBlockedReason);
  const runDisabledReason = isRunning ? "A run is already in progress." : (runBlockedReason ?? "");

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {/* shrink-0: Run and Submit are the two controls the candidate needs
          most, so they are the last thing allowed to lose height. */}
      <div className="flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <LanguagePicker value={buffer.language} onChange={setLanguage} disabled={isRunning} />
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={handleRun}
            disabled={runDisabled}
            label={isRunning ? "Running" : "Run"}
            loading={isRunning}
            disabledReason={runDisabledReason}
          />
          <ActionButton
            onClick={handleSubmit}
            disabled={isSubmitting || submitBlocked}
            label={isSubmitting ? "Saving" : "Submit"}
            loading={isSubmitting}
            primary
            disabledReason={
              isSubmitting ? "Saving your previous submission." : (submitBlockedReason ?? "")
            }
          />
        </div>
      </div>

      {runNote && !isRunning && <Banner tone="warning">{runNote}</Banner>}
      {submitBlockedReason && !isSubmitting && (
        <p className="text-xs text-[#737373] shrink-0">{submitBlockedReason}</p>
      )}

      <div className="flex-1 min-h-[180px]">
        <CodeEditor value={buffer.source} onChange={setSource} />
      </div>

      <div className="shrink-0">
        <RunResultsPanel coding={coding} />
      </div>
    </div>
  );
}

function LanguagePicker({
  value,
  onChange,
  disabled,
}: {
  value: InterviewLanguage;
  onChange: (language: InterviewLanguage) => void;
  disabled: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Language"
      title={disabled ? "Wait for the current run to finish before switching languages." : undefined}
      className="inline-flex rounded-lg border border-[#D4D4D4] bg-white p-0.5"
    >
      {LANGUAGES.map((lang) => (
        <button
          key={lang.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(lang.value)}
          aria-pressed={value === lang.value}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
            value === lang.value
              ? "bg-[#0F0F0F] text-white"
              : "text-[#404040] hover:bg-[#F5F3EE]"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  label,
  loading,
  primary,
  disabledReason,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  loading: boolean;
  primary?: boolean;
  disabledReason: string;
}) {
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className={`h-8 px-3 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none ${
          primary
            ? "bg-[#0F0F0F] text-white hover:bg-[#1C1C1C]"
            : "border border-[#D4D4D4] text-[#404040] hover:bg-[#F5F3EE]"
        }`}
      >
        {loading && <Loader2 className="h-3 w-3 animate-spin" />}
        {label}
      </button>
    </span>
  );
}

function RunResultsPanel({ coding }: { coding: UseCodingQuestions }) {
  const { runResult, runNotice } = coding;

  if (runNotice) {
    return (
      <Banner tone={runNotice.kind === "unavailable" ? "warning" : "error"}>
        {runNotice.message}
      </Banner>
    );
  }

  if (!runResult) return null;

  return (
    <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
      {runResult.compile_error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700 mb-1">Compile error</p>
          <pre className="text-xs font-mono text-red-700 whitespace-pre-wrap break-words">
            {runResult.compile_error}
          </pre>
        </div>
      )}
      {!runResult.compile_error && (
        <>
          {/* A question with no structured examples has nothing to check
              against, so claiming "1 of 1 examples passed" would be a lie
              about work that was never done. Say what actually happened. */}
          <p className="text-xs font-medium text-[#404040]">
            {runResult.results[0]?.status === "output"
              ? "Your code ran. Output below."
              : `${runResult.passed} of ${runResult.ran} examples passed.`}
          </p>
          {runResult.results.map((result) => (
            <div
              key={result.index}
              className={`rounded-lg border p-2.5 ${
                result.passed ? "border-[#BBE5CA] bg-[#E7F5EC]" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {result.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#166534]" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                )}
                <span className={result.passed ? "text-[#166534]" : "text-red-700"}>
                  Example {result.index + 1}: {result.passed ? "Passed" : "Failed"}
                </span>
              </div>
              {!result.passed && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {result.expected !== undefined && (
                    <LabelledCode label="Expected" value={result.expected} />
                  )}
                  {result.actual !== undefined && (
                    <LabelledCode label="Actual" value={result.actual} />
                  )}
                  {result.stderr && <LabelledCode label="Error output" value={result.stderr} />}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
