import type { InterviewExample } from "@/lib/interviewApi";
import CodeEditor from "./CodeEditor";
import CodingConsole from "./CodingConsole";
import { ActionButton, Banner, LabelledCode, LanguagePicker, TimerBadge } from "./codingPaneParts";
import { summarizeError } from "./execution/errorTrace";
import { Markdown } from "./markdown";
import type { UseCodingQuestions } from "./useCodingQuestions";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface CodingPaneProps {
  coding: UseCodingQuestions;
}

// The "question in focus" pinned slot, for a coding question: the problem
// statement and examples, with the editor beside it. This is the SAME slot
// PinnedQuestion fills for a spoken one (InterviewRoom mounts exactly one
// of the two, never both), so this component owns only that slot's content.
// Progress ("question N of M"), elapsed time and the voice presence live in
// TopBar, which is shared across both slot kinds.
//
// Rendered only while the current question is a coding one AND the agent's
// own signal has actually presented it (InterviewRoom gates on
// `coding.showPane`).
//
// Layout rule, because breaking it is what made this pane unusable: on a
// wide screen the page never scrolls and nothing is ever cut off. The two
// columns share one grid row pinned to the available height
// (`grid-rows-[minmax(0,1fr)]`; an implicit `auto` row grows with its
// content and gets clipped instead), and exactly three regions scroll
// inside themselves: the statement, the editor, and the output panel. On a
// narrow screen the columns stack and the pane scrolls as one page, with no
// scrollers nested inside it (`auto-rows-max`: each stacked row is as tall
// as its content, or the statement gets squeezed to nothing and clipped).
export default function CodingPane({ coding }: CodingPaneProps) {
  const { current } = coding;
  if (!current || current.kind !== "coding") return null;

  return (
    <div className="w-full h-full flex flex-col gap-2 px-4 pb-3 min-h-0">
      {coding.warning && <Banner tone="warning">One minute left on this question.</Banner>}
      {coding.submitNotice && (
        <Banner tone={coding.submitNotice.kind === "saved" ? "success" : "error"}>
          {coding.submitNotice.message}
        </Banner>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 auto-rows-max gap-3 overflow-y-auto lg:overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[minmax(0,1fr)]">
        <QuestionPane title={current.title} statementMd={current.statement_md} examples={current.examples} />
        <EditorPane coding={coding} examples={current.examples} />
      </div>
    </div>
  );
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
  // Stays on screen for the whole question and nothing collapses it: the
  // candidate was explicit that the question must not disappear.
  return (
    <div className="flex flex-col rounded-xl border border-[#E5E1D8] bg-white overflow-hidden lg:min-h-0">
      <div className="shrink-0 px-4 py-2.5 border-b border-[#E5E1D8]">
        <h2 className="text-sm font-semibold text-[#0F0F0F]">{title}</h2>
      </div>
      <div className="flex-1 px-4 py-3 flex flex-col gap-4 lg:min-h-0 lg:overflow-y-auto">
        <Markdown text={statementMd} />
        {examples.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Examples</p>
            {examples.map((example, i) => (
              <div key={i} className="rounded-lg border border-[#E8E5DF] bg-[#FAF9F5] p-3 flex flex-col gap-2">
                <p className="text-xs font-medium text-[#737373]">Example {i + 1}</p>
                <LabelledCode label="Input" value={example.input} />
                <LabelledCode label="Output" value={example.output} />
                {example.note && <p className="text-xs text-[#737373] italic">{example.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditorPane({ coding, examples }: { coding: UseCodingQuestions; examples: InterviewExample[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const { buffer, setSource, setLanguage, isRunning, isSubmitting, runBlockedReason, submitBlocked,
    submitBlockedReason, handleRun, handleSubmit, verdict } = coding;
  if (!buffer) return null;

  // Run is disabled either because a run is already in flight or for a
  // structural reason the candidate cannot fix by clicking again (a
  // language with no browser runner). Either way the button says why.
  const runDisabled = isRunning || Boolean(runBlockedReason);
  const runDisabledReason = isRunning ? "A run is already in progress." : (runBlockedReason ?? "");

  return (
    <div className="flex flex-col gap-2 lg:min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <LanguagePicker value={buffer.language} onChange={setLanguage} disabled={isRunning} />
          <TimerBadge
            secondsRemaining={coding.secondsRemaining}
            warning={coding.warning}
            reducedMotion={reducedMotion}
          />
        </div>
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
            label={isSubmitting ? "Checking" : verdict ? "Submit again" : "Submit"}
            loading={isSubmitting}
            primary
            disabledReason={isSubmitting ? "Checking your previous submission." : (submitBlockedReason ?? "")}
          />
        </div>
      </div>

      {submitBlockedReason && !isSubmitting && (
        <p className="shrink-0 text-xs text-[#737373]">{submitBlockedReason}</p>
      )}

      <div className="h-[360px] lg:h-auto lg:flex-1 lg:min-h-[120px]">
        <CodeEditor
          value={buffer.source}
          onChange={setSource}
          language={buffer.language}
          errorLine={firstErrorLine(coding)}
        />
      </div>

      <CodingConsole coding={coding} examples={examples} />
    </div>
  );
}

// The line to mark in the editor: wherever the most recent run, of either
// kind, first stopped on an error in the candidate's own code.
function firstErrorLine(coding: UseCodingQuestions): number | null {
  const results = [...(coding.runResult?.results ?? []), ...(coding.customResult?.results ?? [])];
  for (const result of results) {
    if (result.status !== "runtime_error") continue;
    const line = summarizeError(result.stderr)?.line;
    if (line) return line;
  }
  return null;
}
