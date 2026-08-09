import { useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCallScorecard } from "@/lib/api";
import type { CallScorecardDetail, TranscriptTurn } from "@/types";
import { formatDuration, scoreTone, recommendationChip, verdictChip, TONE_HEX, TONE_CHIP } from "@/components/screening/voice/scorecard/scorecardUtils";
import type { Chip } from "@/components/screening/voice/scorecard/scorecardUtils";
import { ArrowLeft, Printer } from "lucide-react";

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

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptPage() {
  const { id: screeningId, callId } = useParams({ strict: false }) as {
    id: string;
    callId: string;
  };

  const { data, isLoading, isError } = useQuery<CallScorecardDetail>({
    queryKey: ["call-scorecard", screeningId, callId],
    queryFn: () => getCallScorecard(screeningId, callId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#F5F3EE" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#0F0F0F] border-t-transparent animate-spin" />
          <p className="text-sm text-[#737373]">Loading transcript…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#F5F3EE" }}>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-red-700">Failed to load transcript</p>
          <p className="text-xs text-[#737373]">The call data could not be retrieved.</p>
          <Link
            to="/screenings/$id"
            params={{ id: screeningId }}
            className="inline-flex items-center gap-1.5 h-8 px-3 mt-3 border border-[#E8E5DF] text-xs font-medium text-[#404040] rounded-lg hover:bg-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to screening
          </Link>
        </div>
      </div>
    );
  }

  const turns: TranscriptTurn[] = data.transcript ?? [];
  const rec = recommendationChip(data.recommendation);
  const ver = verdictChip(data.qualification?.verdict);
  const tone = scoreTone(data.overall_score);
  const duration = formatDuration(
    turns.length > 0 ? Math.ceil(turns[turns.length - 1].ts) : null,
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F3EE" }}>
      {/* Header bar */}
      <header className="sticky top-0 z-10 border-b border-[#E8E5DF] bg-white/80 backdrop-blur-md print:static print:bg-white print:border-none">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/screenings/$id"
              params={{ id: screeningId }}
              className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[#E8E5DF] text-[#404040] hover:bg-[#F5F3EE] transition-colors print:hidden"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[#0F0F0F] truncate">
                {data.candidate_name ?? "Interview Transcript"}
              </h1>
              <p className="text-[11px] text-[#737373] mt-0.5">
                Voice Interview Transcript
                {duration && <span> · {duration}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#E8E5DF] text-xs font-medium text-[#404040] hover:bg-[#F5F3EE] transition-colors"
            >
              <Printer size={12} />
              Print
            </button>
          </div>
        </div>
      </header>

      {/* Summary bar */}
      <div className="max-w-3xl mx-auto px-6 pt-5 pb-2">
        <div className="rounded-xl border border-[#E8E5DF] bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge chip={ver} strong />
            <Badge chip={rec} strong />
            {data.is_partial && <Badge chip={{ label: "Partial interview", tone: "caution" }} />}
            {data.overall_score != null && (
              <span
                className="ml-auto text-lg font-bold tabular-nums"
                style={{ color: TONE_HEX[tone] }}
              >
                {data.overall_score.toFixed(0)}
                <span className="text-[11px] font-normal text-[#A3A3A3]">/100</span>
              </span>
            )}
          </div>
          {data.overall_summary && (
            <p className="mt-2.5 text-xs leading-relaxed text-[#404040]">{data.overall_summary}</p>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="max-w-3xl mx-auto px-6 py-4">
        <p className="text-xs font-semibold text-[#737373] uppercase tracking-wide mb-3">
          Full Transcript
          {turns.length > 0 && (
            <span className="font-normal text-[#A3A3A3] ml-2">{turns.length} turns</span>
          )}
        </p>

        {turns.length === 0 ? (
          <div className="rounded-xl border border-[#E8E5DF] bg-white p-6 text-center">
            <p className="text-sm text-[#737373]">No transcript available for this call.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {turns.map((turn, i) => {
              const isAgent = turn.speaker === "agent";
              const prevTurn = i > 0 ? turns[i - 1] : null;
              const showDivider = prevTurn && prevTurn.speaker !== turn.speaker;

              return (
                <div key={i}>
                  {showDivider && <div className="my-2" />}
                  <div
                    className={`group rounded-xl px-4 py-3 transition-colors ${
                      isAgent
                        ? "bg-white border border-[#E8E5DF]"
                        : "bg-[#FAFAF8]"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wide ${
                          isAgent ? "text-[#C85A17]" : "text-[#0F0F0F]"
                        }`}
                      >
                        {isAgent ? "AI Interviewer" : "Candidate"}
                      </span>
                      <span className="text-[10px] tabular-nums text-[#A3A3A3] opacity-0 group-hover:opacity-100 transition-opacity">
                        {formatTimestamp(turn.ts)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#404040]">{turn.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
