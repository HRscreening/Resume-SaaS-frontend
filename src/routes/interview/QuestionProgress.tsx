interface QuestionProgressProps {
  // 0-based index of the question the server's pointer currently names, or
  // -1 when it has not named one yet (the warm-up, or a remount waiting on
  // the next publish tick — see useCodingQuestions). -1 is a real, expected
  // value, not an error: it renders nothing, same as `total <= 0` below,
  // rather than ever defaulting to "Question 1 of N" for a question the
  // pointer has not actually named.
  index: number;
  // Total questions in this round, coding and spoken combined — the same
  // list useCodingQuestions already fetched. 0 before that list has
  // loaded, in which case this renders nothing rather than a false "0 of 0".
  total: number;
  // TopBar's placement: text and dots sit on one line among the meter,
  // state label, and elapsed time, rather than stacked, to fit the bar.
  compact?: boolean;
}

const DONE_COLOR = "#C85A17";
const CURRENT_COLOR = "#1C1C1C";
const UPCOMING_COLOR = "#E5E1D8";

// The round's shape, made visible: how many questions make it up and which
// one the candidate is on right now. This is the map the roadmap opening
// promises out loud and the screen never otherwise shows — today's elapsed
// timer only says how long the candidate has been talking, never how far
// through the round they are. Purely presentational: `index`/`total` are
// the same values CodingPane already reads off useCodingQuestions, so this
// adds no state or network call of its own, and nothing here animates —
// it only ever changes when the agent actually advances the round.
export default function QuestionProgress({ index, total, compact = false }: QuestionProgressProps) {
  if (total <= 0 || index < 0) return null;
  const current = Math.min(index, total - 1);
  const segments = Array.from({ length: total }, (_, i) => i);

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-col"}`}>
      <p className="text-xs font-medium text-[#737373] whitespace-nowrap">
        Question {current + 1} of {total}
      </p>
      <div className="flex items-center gap-1" aria-hidden="true">
        {segments.map((i) => (
          <span
            key={i}
            className="h-1.5 rounded-full"
            style={{
              width: compact ? 12 : 18,
              backgroundColor: i < current ? DONE_COLOR : i === current ? CURRENT_COLOR : UPCOMING_COLOR,
              opacity: i < current ? 0.55 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
