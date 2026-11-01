import { VideoOff } from "lucide-react";

import ThinkingDots from "./ThinkingDots";
import type { PresenceState } from "./presenceState";
import type { TranscriptTurn } from "./useTranscript";
import { useSelfView } from "./useSelfView";
import VoiceMeter from "./VoiceMeter";

// What the interviewer is doing, in the words the candidate sees. "Quiet"
// is listening during a coding question: the interviewer is there but will
// not talk unless spoken to, so silence is not a frozen screen.
export type InterviewerStatus = "speaking" | "listening" | "thinking" | "quiet" | "reconnecting";

export function interviewerStatus(
  presence: PresenceState,
  reconnecting: boolean,
  coding: boolean,
): InterviewerStatus {
  if (reconnecting) return "reconnecting";
  if (presence === "listening" && coding) return "quiet";
  return presence;
}

const STATUS_LABEL: Record<InterviewerStatus, string> = {
  speaking: "Speaking",
  listening: "Listening to you",
  thinking: "Thinking",
  quiet: "Quiet while you code",
  reconnecting: "Reconnecting",
};

export interface Voice {
  interviewerAnalyser: AnalyserNode | null;
  candidateAnalyser: AnalyserNode | null;
  interviewerSpeaking: boolean;
  candidateSpeaking: boolean;
}

function Avatar({ size, status }: { size: number; status: InterviewerStatus }) {
  const ring = status === "speaking" ? "ring-4 ring-[#FED7AA]" : "";
  return (
    <div
      className={`shrink-0 rounded-full bg-[#C85A17] text-white flex items-center justify-center font-semibold transition-shadow ${ring}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      AI
    </div>
  );
}

function Presence({ status, voice }: { status: InterviewerStatus; voice: Voice }) {
  if (status === "thinking") return <ThinkingDots />;
  return (
    <span className="inline-flex origin-right scale-150">
      <VoiceMeter {...voice} reconnecting={status === "reconnecting"} />
    </span>
  );
}

// The spoken-question conversation card: who is talking, the line being
// said now in large type, and the candidate's last line under it.
export function ConversationCard({
  status,
  voice,
  turns,
  captionsEnabled,
}: {
  status: InterviewerStatus;
  voice: Voice;
  turns: TranscriptTurn[];
  captionsEnabled: boolean;
}) {
  const latest = turns[turns.length - 1];
  const lastInterviewer = [...turns].reverse().find((t) => t.speaker === "interviewer");
  const lastCandidate = [...turns].reverse().find((t) => t.speaker === "candidate");
  // While the candidate is talking their own words lead; otherwise the
  // interviewer's latest line does.
  const lead = latest?.speaker === "candidate" && status === "listening" ? latest : lastInterviewer;
  const secondary = lead?.speaker === "candidate" ? lastInterviewer : lastCandidate;

  return (
    <div className="flex-1 min-w-0 min-h-0 rounded-[18px] border border-[#E8E5DF] bg-white px-6 py-6 sm:px-8 flex flex-col gap-5 overflow-hidden">
      <div className="flex items-center gap-3.5">
        <Avatar size={52} status={status} />
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold">Interviewer</span>
          <span role="status" aria-live="polite" className={`text-[13px] font-medium ${status === "speaking" ? "text-[#A9470F]" : "text-[#737373]"}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="ml-auto pr-3">
          <Presence status={status} voice={voice} />
        </div>
      </div>

      <div aria-live="polite" className="flex-1 min-h-0 overflow-y-auto">
        {!captionsEnabled ? (
          <p className="text-sm italic text-[#A3A3A3]">Captions are hidden.</p>
        ) : lead ? (
          <p className="text-lg sm:text-xl leading-[1.55] text-[#0F0F0F]">
            {lead.speaker === "candidate" && <span className="font-semibold text-[#404040]">You: </span>}
            {lead.text}
          </p>
        ) : (
          <p className="text-sm italic text-[#A3A3A3]">What you and the interviewer say appears here.</p>
        )}
      </div>

      {captionsEnabled && secondary && (
        <div className="shrink-0 border-t border-[#E8E5DF] pt-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-[#737373]">EARLIER</span>
          <p className="text-sm leading-[1.5] text-[#404040] line-clamp-2">
            <strong className="font-semibold text-[#0F0F0F]">
              {secondary.speaker === "candidate" ? "You" : "Interviewer"}:
            </strong>{" "}
            {secondary.text}
          </p>
        </div>
      )}
    </div>
  );
}

// The same interviewer, folded into the rail while code has the main area.
export function InterviewerRailCard({ status, voice }: { status: InterviewerStatus; voice: Voice }) {
  return (
    <div className="rounded-[14px] border border-[#E8E5DF] bg-[#FAF9F5] px-3.5 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <Avatar size={32} status={status} />
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold">Interviewer</span>
          <span role="status" aria-live="polite" className={`text-xs ${status === "speaking" ? "text-[#A9470F] font-medium" : "text-[#737373]"}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        <div className="ml-auto pr-2">
          <Presence status={status} voice={voice} />
        </div>
      </div>
      {status === "quiet" && (
        <p className="text-xs leading-[1.45] text-[#404040]">
          Thinking aloud is fine. Speak to the interviewer if you want to ask something.
        </p>
      )}
    </div>
  );
}

// The candidate's own camera, local preview only (see useSelfView).
export function SelfView({ className = "" }: { className?: string }) {
  const { videoRef, live } = useSelfView(true);
  return (
    <div className={`relative overflow-hidden rounded-[14px] bg-[#3A342D] ${className}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        className={`h-full w-full object-cover -scale-x-100 ${live ? "" : "hidden"}`}
      />
      {!live && (
        <div className="h-full w-full flex items-center justify-center">
          <VideoOff className="h-5 w-5 text-[#A39787]" aria-hidden="true" />
        </div>
      )}
      <span className="absolute left-3 bottom-2 text-xs font-medium text-[#EDE6DC]">You</span>
    </div>
  );
}
