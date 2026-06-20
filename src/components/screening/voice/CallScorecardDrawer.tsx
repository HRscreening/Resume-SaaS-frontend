import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCallScorecard, overrideCallScorecard } from "@/lib/api";
import type { CallScorecardDetail } from "@/types";

interface Props {
  screeningId: string;
  callId: string;
  onClose: () => void;
}

const recColor: Record<string, string> = {
  advance: "text-green-700 bg-green-50 border-green-200",
  hold: "text-amber-700 bg-amber-50 border-amber-200",
  reject: "text-red-700 bg-red-50 border-red-200",
};

function scoreColor(n: number | null): string {
  if (n == null) return "text-[#737373]";
  if (n >= 75) return "text-green-700";
  if (n >= 50) return "text-amber-600";
  return "text-red-600";
}

export function CallScorecardDrawer({ screeningId, callId, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["call-scorecard", screeningId, callId],
    queryFn: () => getCallScorecard(screeningId, callId),
  });

  const [rec, setRec] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const overrideMut = useMutation({
    mutationFn: () =>
      overrideCallScorecard(screeningId, callId, {
        recommendation: (rec || undefined) as "advance" | "hold" | "reject" | undefined,
        notes: notes || undefined,
      }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(["call-scorecard", screeningId, callId], fresh);
      queryClient.invalidateQueries({ queryKey: ["voice-calls", screeningId] });
      toast.success("Override saved");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save override"),
  });

  const sc: CallScorecardDetail | undefined = data;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[#E8E5DF] px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Call Scorecard</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#737373] hover:text-[#0F0F0F] text-lg">✕</button>
        </div>

        {isLoading || !sc ? (
          <div className="p-6 text-sm text-[#737373]">Loading…</div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm text-[#737373]">{sc.candidate_name ?? "Candidate"}</p>
              <p className="text-xs text-[#A3A3A3]">Status: {sc.status}{sc.is_partial ? " · partial" : ""}</p>
            </div>

            {/* Side-by-side scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-[#E8E5DF] rounded-xl p-4">
                <p className="text-xs text-[#737373] mb-1">Voice score</p>
                <p className={`text-2xl font-bold ${scoreColor(sc.overall_score)}`}>
                  {sc.overall_score != null ? sc.overall_score.toFixed(1) : "—"}
                </p>
                {sc.recommendation && (
                  <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full border ${recColor[sc.recommendation] ?? ""}`}>
                    {sc.recommendation}
                  </span>
                )}
              </div>
              <div className="border border-[#E8E5DF] rounded-xl p-4">
                <p className="text-xs text-[#737373] mb-1">Resume score</p>
                <p className={`text-2xl font-bold ${scoreColor(sc.resume_score)}`}>
                  {sc.resume_score != null ? sc.resume_score.toFixed(1) : "—"}
                </p>
                <p className="mt-2 text-xs text-[#A3A3A3]">Same 0–100 scale</p>
              </div>
            </div>

            {sc.overall_summary && (
              <div>
                <h3 className="text-sm font-semibold text-[#0F0F0F] mb-1">Summary</h3>
                <p className="text-sm text-[#404040] leading-relaxed">{sc.overall_summary}</p>
              </div>
            )}

            {sc.flags && sc.flags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#0F0F0F] mb-1">Flags</h3>
                <ul className="list-disc pl-5 text-sm text-amber-700 space-y-1">
                  {sc.flags.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            {sc.strengths && sc.strengths.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#0F0F0F] mb-1">Strengths</h3>
                <ul className="list-disc pl-5 text-sm text-[#404040] space-y-1">
                  {sc.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {/* Override */}
            <div className="border-t border-[#E8E5DF] pt-4">
              <h3 className="text-sm font-semibold text-[#0F0F0F] mb-2">Reviewer override</h3>
              {sc.reviewer_override && (
                <p className="text-xs text-[#737373] mb-2">
                  Current: {JSON.stringify(sc.reviewer_override)}
                </p>
              )}
              <label className="block text-xs font-medium text-[#404040] mb-1">Recommendation</label>
              <select
                value={rec}
                onChange={(e) => setRec(e.target.value)}
                className="w-full h-9 px-3 border border-[#D4D4D4] rounded-lg text-sm mb-2"
              >
                <option value="">(no change)</option>
                <option value="advance">advance</option>
                <option value="hold">hold</option>
                <option value="reject">reject</option>
              </select>
              <label className="block text-xs font-medium text-[#404040] mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[#D4D4D4] rounded-lg text-sm mb-2 resize-y"
                placeholder="Why are you overriding?"
              />
              <button
                onClick={() => overrideMut.mutate()}
                disabled={overrideMut.isPending || (!rec && !notes)}
                className="h-9 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] disabled:opacity-60"
              >
                {overrideMut.isPending ? "Saving…" : "Save override"}
              </button>
            </div>

            {/* Transcript */}
            {sc.transcript && sc.transcript.length > 0 && (
              <div className="border-t border-[#E8E5DF] pt-4">
                <h3 className="text-sm font-semibold text-[#0F0F0F] mb-2">Transcript</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {sc.transcript.map((t, i) => (
                    <div key={i} className="text-sm">
                      <span className={`font-medium ${t.speaker === "agent" ? "text-indigo-600" : "text-[#0F0F0F]"}`}>
                        {t.speaker === "agent" ? "AI" : "Candidate"}:
                      </span>{" "}
                      <span className="text-[#404040]">{t.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
