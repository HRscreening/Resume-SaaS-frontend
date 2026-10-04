interface PinnedQuestionProps {
  // Always defined by the time this renders — InterviewRoom only mounts it
  // once a spoken question's text has actually been revealed server-side
  // (see useCodingQuestions' `pinned`). There is deliberately no
  // "question pending" placeholder state here: a question the interviewer
  // has not yet presented is not a thing this screen shows anything about,
  // half-rendered or otherwise.
  prompt: string;
}

// "Nobody scrolls back hunting for what was asked." The question that is
// currently being discussed stays on screen for as long as it is current —
// this is that slot for a spoken question. A coding question uses the same
// slot in CodingPane instead (problem statement + examples + editor), never
// both at once; see InterviewRoom for the switch between them.
export default function PinnedQuestion({ prompt }: PinnedQuestionProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-6 pb-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#A3A3A3] mb-2">
        Now discussing
      </p>
      <p className="text-[19px] leading-snug text-[#0F0F0F]">{prompt}</p>
    </div>
  );
}
