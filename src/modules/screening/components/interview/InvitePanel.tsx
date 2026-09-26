import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { createInterviewInvites } from "@/lib/api";
import { getScoredResumes } from "@/modules/screening/apis/screenings.api";
import { screeningSearchSchema } from "@/modules/screening/types/searchSchema";
import type { RankedCandidate } from "@/modules/screening/types/screening.type";
import type { InterviewInviteItem } from "@/types";

// Generous single page rather than real pagination: this panel picks
// invite recipients, it doesn't browse the full candidate list, so a
// screening with more than this many candidates at one stage is the rare
// case, not the one to optimize for.
const MAX_INVITE_CANDIDATES = 200;

/**
 * Pick candidates currently at `entryStage`, generate one invite link per
 * selected candidate, and copy them. Reads/writes the persisted config only —
 * this panel is inert until the round above has been saved with a plan
 * (`ready`), because POST /interview/invites acts on what's in the database,
 * not on unsaved edits in the parent form.
 */
export function InvitePanel({
  screeningId, entryStage, ready, canWrite,
}: {
  screeningId: string; entryStage: string; ready: boolean; canWrite: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<InterviewInviteItem[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  const { data: candidatesPage, isLoading, isError } = useQuery({
    queryKey: ["interview-invite-candidates", screeningId, entryStage],
    queryFn: () =>
      getScoredResumes(
        screeningId,
        screeningSearchSchema.parse({ screenStage: [entryStage] }),
        null,
        MAX_INVITE_CANDIDATES,
      ),
    enabled: ready,
  });
  const candidates: RankedCandidate[] = candidatesPage?.items ?? [];

  const inviteMutation = useMutation({
    mutationFn: (resumeIds: string[]) => createInterviewInvites(screeningId, resumeIds),
    onSuccess: (res) => {
      setResults(res.invites);
      setSkipped(res.skipped);
      if (res.invites.length > 0) {
        toast.success(`Generated ${res.invites.length} invite link${res.invites.length === 1 ? "" : "s"}`);
      }
      if (res.skipped.length > 0) {
        toast.info(`Skipped ${res.skipped.length} candidate${res.skipped.length === 1 ? "" : "s"} (not eligible or already interviewed)`);
      }
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not generate invites"),
  });

  const toggle = (resumeId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(resumeId)) next.delete(resumeId); else next.add(resumeId);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === candidates.length ? new Set() : new Set(candidates.map((c) => c.resume_id)),
    );

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — copy it manually");
    }
  };

  const nameFor = (resumeId: string) =>
    candidates.find((c) => c.resume_id === resumeId)?.candidate_name ?? resumeId;

  return (
    <section className="rounded-2xl border border-[#E8E5DF] bg-[#FAFAF8] p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[#0F0F0F]">Invite candidates</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
          Candidates at the &ldquo;{entryStage}&rdquo; stage. Each link is single-use per
          candidate and expires automatically.
        </p>
      </div>

      {!ready && (
        <p className="rounded-lg bg-[#F0EEE8] px-3 py-2 text-xs leading-relaxed text-[#737373]">
          Save the interview round above with at least one question before inviting candidates.
        </p>
      )}

      {ready && isLoading && <p className="text-xs text-[#737373]">Loading candidates…</p>}
      {ready && isError && (
        <p className="text-xs text-red-600">Could not load candidates at this stage.</p>
      )}

      {ready && !isLoading && !isError && (
        <>
          {candidates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#E8E5DF] py-6 text-center text-sm text-[#737373]">
              No candidates are currently at &ldquo;{entryStage}&rdquo;.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-[#404040]">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === candidates.length}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 accent-[#0F0F0F]"
                  />
                  Select all ({candidates.length})
                </label>
                {canWrite && (
                  <button
                    onClick={() => inviteMutation.mutate(Array.from(selected))}
                    disabled={selected.size === 0 || inviteMutation.isPending}
                    className="h-8 px-4 border border-[#0F0F0F] bg-[#0F0F0F] text-white text-xs font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-60"
                  >
                    {inviteMutation.isPending ? "Generating…" : `Generate ${selected.size || ""} link${selected.size === 1 ? "" : "s"}`}
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E8E5DF] bg-white">
                {candidates.map((c) => (
                  <label
                    key={c.resume_id}
                    className="flex cursor-pointer items-center gap-3 border-b border-[#F0EEE8] px-3 py-2 last:border-b-0 hover:bg-[#FAFAF8]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.resume_id)}
                      onChange={() => toggle(c.resume_id)}
                      className="h-3.5 w-3.5 accent-[#0F0F0F]"
                    />
                    <span className="text-sm text-[#0F0F0F]">{c.candidate_name ?? "Unnamed candidate"}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {results && results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-[#404040]">Invite links</p>
          {results.map((r) => (
            <div key={r.resume_id} className="flex items-center gap-2 rounded-lg border border-[#E8E5DF] bg-white px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-[#0F0F0F]">{r.candidate_name ?? "Unnamed candidate"}</p>
                <p className="truncate text-xs text-[#737373]">{r.invite_url}</p>
              </div>
              <button
                onClick={() => copy(r.invite_url)}
                className="h-7 shrink-0 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-[#FAFAF8] transition-colors"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      )}

      {skipped.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-[#737373]">
          Skipped: {skipped.map((rid) => nameFor(rid)).join(", ")} — not at &ldquo;{entryStage}&rdquo;,
          or already completed an interview.
        </p>
      )}
    </section>
  );
}
