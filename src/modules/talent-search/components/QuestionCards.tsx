import { useState } from "react";
import { cn } from "@/lib/utils";
import { buildAnswers, type Selection } from "../logic";
import type { Answer, ClarifyingQuestion } from "../types";

interface QuestionCardsProps {
  questions: ClarifyingQuestion[];
  submitting: boolean;
  onSubmit: (answers: Answer[]) => void;
}

export function QuestionCards({ questions, submitting, onSubmit }: QuestionCardsProps) {
  const [selections, setSelections] = useState<Partial<Record<string, Selection>>>({});
  const answers = buildAnswers(questions, selections);
  const select = (field: string, value: Selection) => setSelections((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#5C5C5C]">A few details are missing from the job description. Pick an answer, or type your own.</p>
      {questions.map((q) => {
        const current = selections[q.field];
        return (
          <fieldset key={q.field} className="space-y-3">
            <legend className="text-sm font-semibold text-[#0F0F0F]">{q.question}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => select(q.field, { optionId: option.id })}
                  className={cn(
                    "text-left rounded-xl border px-4 py-3 transition-colors",
                    current?.optionId === option.id
                      ? "border-[#C85A17] bg-[#FDF3EC]"
                      : "border-[#E5E3DF] hover:border-[#C9C6C0] bg-white",
                  )}
                >
                  <span className="block text-sm font-medium text-[#0F0F0F]">{option.label}</span>
                  {option.description && <span className="block text-xs text-[#737373] mt-0.5">{option.description}</span>}
                </button>
              ))}
            </div>
            {q.allow_other && (
              <input
                id={`other-${q.field}`}
                value={current?.other ?? ""}
                onChange={(e) => select(q.field, { other: e.target.value })}
                placeholder="Other: type your answer"
                className="w-full rounded-lg border border-[#E5E3DF] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A17]/30"
              />
            )}
          </fieldset>
        );
      })}
      <button
        type="button"
        disabled={submitting || answers.length === 0}
        onClick={() => onSubmit(answers)}
        className="rounded-lg bg-[#0F0F0F] text-white text-sm font-medium px-4 py-2 disabled:opacity-40"
      >
        {submitting ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
