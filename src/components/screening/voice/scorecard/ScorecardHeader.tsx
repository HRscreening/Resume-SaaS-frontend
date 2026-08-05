import { TONE_CHIP, TONE_HEX, recommendationChip, scoreTone, verdictChip } from "./scorecardUtils";
import type { Chip } from "./scorecardUtils";

interface ScorecardHeaderProps {
  score: number | null;
  recommendation: string | null;
  verdict: string | undefined;
  verdictReason: string | null;
  isPartial: boolean;
  duration: string | null;
}

function Badge({ chip, strong = false }: { chip: Chip; strong?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 ${TONE_CHIP[chip.tone]} ${
        strong ? "text-xs font-semibold" : "text-[11px] font-medium"
      }`}
    >
      {chip.label}
    </span>
  );
}

/**
 * The decision line. A recruiter reads this first and often only this, so it
 * carries the two judgements that are actually actionable — the qualification
 * verdict (logistics) and the interview recommendation (competency) — next to
 * the score they justify. The bare number on its own told nobody anything.
 */
export function ScorecardHeader({
  score, recommendation, verdict, verdictReason, isPartial, duration,
}: ScorecardHeaderProps) {
  const rec = recommendationChip(recommendation);
  const ver = verdictChip(verdict);
  const tone = scoreTone(score);
  const pct = Math.max(0, Math.min(100, score ?? 0));

  return (
    <div className="rounded-xl border border-[#E8E5DF] bg-white p-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge chip={ver} strong />
        <Badge chip={rec} strong />
        {isPartial && <Badge chip={{ label: "Partial interview", tone: "caution" }} />}
        {duration && (
          <span className="ml-auto text-[11px] tabular-nums text-[#737373]">{duration} call</span>
        )}
      </div>

      {verdictReason && (
        <p className="mt-2 text-xs leading-relaxed text-[#404040]">{verdictReason}</p>
      )}

      {score != null && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[#737373]">
              Interview score
            </span>
            <span className="text-lg font-bold tabular-nums" style={{ color: TONE_HEX[tone] }}>
              {score.toFixed(0)}
              <span className="text-[11px] font-normal text-[#A3A3A3]">/100</span>
            </span>
          </div>
          <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EAE7DF]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${pct}%`, backgroundColor: TONE_HEX[tone] }}
            />
            {/* Band markers at the 50 / 75 thresholds the score colours change on. */}
            <span className="absolute inset-y-0 left-1/2 w-px bg-white/70" />
            <span className="absolute inset-y-0 left-3/4 w-px bg-white/70" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-[#A3A3A3]">
            <span>Weak</span>
            <span>Mixed</span>
            <span>Strong</span>
          </div>
        </div>
      )}
    </div>
  );
}
