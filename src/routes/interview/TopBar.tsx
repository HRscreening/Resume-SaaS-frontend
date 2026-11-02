import VoiceMeter from "./VoiceMeter";
import ThinkingDots from "./ThinkingDots";
import QuestionProgress from "./QuestionProgress";
import { describePresence, type PresenceState } from "./presenceState";

interface TopBarProps {
  elapsedLabel: string;
  durationMinutes: number;
  presenceState: PresenceState;
  reconnecting: boolean;
  interviewerAnalyser: AnalyserNode | null;
  interviewerSpeaking: boolean;
  candidateAnalyser: AnalyserNode | null;
  candidateSpeaking: boolean;
  questionIndex: number;
  questionTotal: number;
  onEndInterview: () => void;
}

// Everything that used to be a large, centered orb is now this one
// compact strip: the "question in focus" design shrinks the voice presence
// down to a level meter here and gives the screen's top of attention to the
// pinned question instead (see PinnedQuestion / CodingPane). Connection
// state, voice activity, round progress, and elapsed time all live in one
// place so nothing about "is this still working" requires scanning the rest
// of the page.
export default function TopBar({
  elapsedLabel,
  durationMinutes,
  presenceState,
  reconnecting,
  interviewerAnalyser,
  interviewerSpeaking,
  candidateAnalyser,
  candidateSpeaking,
  questionIndex,
  questionTotal,
  onEndInterview,
}: TopBarProps) {
  const label = describePresence(presenceState, reconnecting);

  return (
    <div className="w-full flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Thinking is drawn as itself, never as amplitude (see
            ThinkingDots) — so it replaces the meter outright rather than
            sitting next to a meter that would otherwise just sit at 0 and
            look identical to plain silence. */}
        {!reconnecting && presenceState === "thinking" ? (
          <ThinkingDots />
        ) : (
          <VoiceMeter
            interviewerAnalyser={interviewerAnalyser}
            interviewerSpeaking={interviewerSpeaking}
            candidateAnalyser={candidateAnalyser}
            candidateSpeaking={candidateSpeaking}
            reconnecting={reconnecting}
          />
        )}
        <span className="text-xs font-medium text-[#404040] truncate">{label}</span>
        {questionTotal > 0 && (
          <QuestionProgress index={questionIndex} total={questionTotal} compact />
        )}
        <span className="text-xs tabular-nums text-[#737373] whitespace-nowrap">
          {elapsedLabel} of about {durationMinutes} minutes
        </span>
      </div>
      <button
        type="button"
        onClick={onEndInterview}
        className="h-8 px-3 border border-[#D4D4D4] text-xs font-medium text-[#404040] rounded-lg hover:bg-white transition-colors shrink-0"
      >
        End interview
      </button>
    </div>
  );
}
