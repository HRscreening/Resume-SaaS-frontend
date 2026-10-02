import type { InterviewScorecard } from "@/types";
import { languageLabel, otherFields, questionIds } from "./interviewScorecardUtils";

interface InterviewQuestionDetailProps {
  scorecard: InterviewScorecard;
}

/**
 * One card per question the scorer or the candidate's own submission has
 * anything to say about. This is where the coding questions' submitted code
 * lives, next to that question's score: scoring a coding answer without the
 * code beside it is scoring on half the evidence, so the two are never
 * shown apart.
 */
export function InterviewQuestionDetail({ scorecard }: InterviewQuestionDetailProps) {
  const ids = questionIds(scorecard);

  if (ids.length === 0) {
    return <p className="text-xs text-[#737373]">No per-question detail was reported for this interview.</p>;
  }

  return (
    <div className="space-y-2.5">
      {ids.map((id) => {
        const entry = scorecard.per_question?.[id];
        const code = scorecard.code?.[id];
        const extra = entry ? otherFields(entry) : [];

        return (
          <div key={id} className="rounded-lg border border-[#E8E5DF] bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#0F0F0F]">Question {id}</p>
              {entry?.score != null && (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[#0F0F0F]">
                  {entry.score}
                </span>
              )}
            </div>

            {(entry?.summary || entry?.explanation) && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#404040]">
                {entry.summary ?? entry.explanation}
              </p>
            )}

            {entry?.evidence && entry.evidence.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {entry.evidence.map((quote, qi) => (
                  <blockquote
                    key={qi}
                    className="border-l-2 border-[#C85A17] pl-2.5 text-[11px] italic leading-relaxed text-[#404040]"
                  >
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                ))}
              </div>
            )}

            {extra.length > 0 && (
              <dl className="mt-2 space-y-0.5">
                {extra.map((f, i) => (
                  <div key={i} className="flex gap-1.5 text-[11px] text-[#737373]">
                    <dt className="font-medium">{f.label}:</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {code && (
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
                    Submitted code
                  </p>
                  <span className="rounded border border-[#E8E5DF] bg-[#F5F3EE] px-1.5 py-0.5 text-[10px] font-medium text-[#404040]">
                    {languageLabel(code.language)}
                  </span>
                </div>
                <pre className="max-h-80 overflow-auto rounded-lg border border-[#E8E5DF] bg-[#0F0F0F] p-3 text-[11px] leading-relaxed text-[#F5F3EE]">
                  <code>{code.source}</code>
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
