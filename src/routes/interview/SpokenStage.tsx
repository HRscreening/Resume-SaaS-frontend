import { VideoOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import InterviewerOrb from "./InterviewerOrb";
import type { OrbState } from "./orbGeometry";
import type { PresenceState } from "./presenceState";
import { useSelfView } from "./useSelfView";

// The room for everything that is talk, not code: the warm-up, spoken
// questions, the walkthrough of a submitted solution, and the closing.
// One quiet stage with the interviewer at its centre and the candidate in
// the corner, then the question in focus and a one-line caption. Nothing
// else competes for attention while two people are talking.

interface SpokenStageProps {
  presenceState: PresenceState;
  reconnecting: boolean;
  interviewerAnalyser: AnalyserNode | null;
  candidateAnalyser: AnalyserNode | null;
  showSelfView: boolean;
  // The pinned question (or nothing in the warm-up), the caption strip and
  // the turn controls, in that order under the stage.
  children: ReactNode;
}

const STATUS: Record<OrbState, string> = {
  speaking: "Speaking",
  listening: "Listening",
  thinking: "Thinking",
  reconnecting: "Reconnecting",
  idle: "Ready",
};

const ORB_SIZE = 260;
const ORB_SIZE_SMALL = 200;
const SMALL_SCREEN = "(max-width: 639px)";

function useSmallScreen(): boolean {
  const [small, setSmall] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(SMALL_SCREEN).matches === true,
  );
  useEffect(() => {
    const mql = window.matchMedia?.(SMALL_SCREEN);
    if (!mql) return;
    const onChange = () => setSmall(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return small;
}

export default function SpokenStage({
  presenceState,
  reconnecting,
  interviewerAnalyser,
  candidateAnalyser,
  showSelfView,
  children,
}: SpokenStageProps) {
  const orbState: OrbState = reconnecting ? "reconnecting" : presenceState;
  const small = useSmallScreen();
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto px-4 pt-4">
        <div
          className="relative rounded-2xl overflow-hidden flex items-center justify-center"
          style={{
            backgroundColor: "#15130F",
            height: "min(46vh, 380px)",
            backgroundImage: "radial-gradient(circle at 50% 45%, #2A221B 0%, #15130F 62%)",
          }}
        >
          <InterviewerOrb
            state={orbState}
            interviewerAnalyser={interviewerAnalyser}
            candidateAnalyser={candidateAnalyser}
            size={small ? ORB_SIZE_SMALL : ORB_SIZE}
          />
          <StatusChip state={orbState} />
          {showSelfView && <SelfViewTile />}
        </div>
      </div>
      {children}
    </div>
  );
}

function StatusChip({ state }: { state: OrbState }) {
  const dot = state === "reconnecting" ? "#D97706" : state === "speaking" ? "#E08A4F" : "#A39787";
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-4 bottom-4 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-[#EDE6DC] backdrop-blur"
      style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot }} />
      Interviewer · {STATUS[state]}
    </div>
  );
}

function SelfViewTile() {
  const { videoRef, live } = useSelfView(true);
  return (
    <div
      className="absolute right-3 top-3 w-28 sm:top-auto sm:right-4 sm:bottom-4 sm:w-44 aspect-video rounded-xl overflow-hidden border"
      style={{ borderColor: "rgba(255,255,255,0.12)", backgroundColor: "#211D18" }}
    >
      <video
        ref={videoRef}
        muted
        playsInline
        className={`h-full w-full object-cover -scale-x-100 ${live ? "" : "hidden"}`}
      />
      {!live && (
        <div className="h-full w-full flex items-center justify-center">
          <VideoOff className="h-4 w-4 text-[#7A6F62]" />
        </div>
      )}
      <span className="absolute left-2 bottom-1.5 text-[10px] font-medium text-white/80">You</span>
    </div>
  );
}
