import { InterviewScorecardPanel } from "./InterviewScorecardPanel";

interface InterviewScorecardDrawerProps {
  screeningId: string;
  resumeId: string;
  onClose: () => void;
}

/**
 * The interview round's result, read-only, opened the same way the voice
 * round's CallScorecardDrawer is opened (see InterviewScorePill): a pill
 * beside the resume score that slides this panel in.
 *
 * Modal chrome only. The content lives in InterviewScorecardPanel, because
 * the same body is also a tab in the candidate sheet (AnalysisSheet) and
 * the two must never drift into showing different things about one result.
 */
export function InterviewScorecardDrawer({ screeningId, resumeId, onClose }: InterviewScorecardDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-[#E8E5DF] px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F0F0F]">Interview Scorecard</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#737373] hover:text-[#0F0F0F] text-lg">
            &times;
          </button>
        </div>
        <div className="p-6">
          <InterviewScorecardPanel screeningId={screeningId} resumeId={resumeId} />
        </div>
      </div>
    </div>
  );
}
