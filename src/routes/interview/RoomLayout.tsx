import AgendaRail from "./AgendaRail";
import CodingPane from "./CodingPane";
import ControlBar from "./ControlBar";
import { ConversationCard, InterviewerRailCard, SelfView, interviewerStatus, type Voice } from "./InterviewerCard";
import { ENDING_COPY, FIVE_MINUTE_COPY, phaseLabel, type InterviewPhase } from "./phaseSignal";
import type { PresenceState } from "./presenceState";
import QuestionCard from "./QuestionCard";
import { railSteps, stepProgress } from "./rail";
import Transcript from "./Transcript";
import type { UseCodingQuestions } from "./useCodingQuestions";
import { formatCountdown } from "./useCountdown";
import type { TranscriptTurn } from "./useTranscript";
import { SILENCE_WARNING_COPY } from "./micSilence";

// The connected interview screen, Direction C: the agenda rail on the left,
// and the work area on the right, which holds either a spoken question
// (question card + conversation) or a coding question (problem + editor).
// Pure layout: InterviewRoom owns the call and passes plain values in, so
// the dev preview can render this exact screen with no LiveKit room.
export interface RoomLayoutProps {
  coding: UseCodingQuestions;
  phase: InterviewPhase | null;
  ending: boolean;
  presenceState: PresenceState;
  reconnecting: boolean;
  networkLabel: string | null;
  silenceWarning: boolean;
  showFiveMinuteNotice: boolean;
  voice: Voice;
  transcriptTurns: TranscriptTurn[];
  captionsEnabled: boolean;
  onToggleCaptions: () => void;
  micOn: boolean;
  onToggleMic: () => void;
  agentHasSpoken: boolean;
  requiresCamera: boolean;
  roleTitle: string | null;
  hiringCompany: string | null;
  durationMinutes: number;
  elapsedLabel: string;
  minutesLeft: number;
  onRepeat: () => void;
  onDone: () => void;
  momentActive: boolean;
  onMoment: () => void;
  onLeave: () => void;
}

const CODING_HINT = "Unclear about the input or output? Just ask. The interviewer clarifies the problem, not the solution.";

export default function RoomLayout(p: RoomLayoutProps) {
  const { coding } = p;
  const showCodingPane = coding.showPane;
  const status = interviewerStatus(p.presenceState, p.reconnecting, showCodingPane);
  const steps = railSteps({
    questions: coding.questions ?? [],
    index: coding.index,
    finished: coding.finished,
    phase: p.phase,
    walkthrough: coding.walkthrough !== null,
  });
  const clockShown = coding.current !== undefined && coding.timerActive && !coding.finished;
  const questionLabel =
    coding.current && !coding.finished
      ? `QUESTION ${coding.index + 1} OF ${coding.total} · ${coding.current.kind === "coding" ? "CODING" : "SPOKEN"}`
      : null;

  // The top card of the spoken layout: the question being discussed, or a
  // plain framing line for the parts of the hour that are not a question.
  let card: { label: string; text: string; isQuestion: boolean; timed: boolean } | null = null;
  if (p.phase === "closing" || coding.finished) {
    card = { label: "YOUR QUESTIONS", text: "Ask the interviewer anything about the role or the team.", isQuestion: false, timed: false };
  } else if (coding.walkthrough) {
    card = {
      label: "WALKTHROUGH",
      text: `Talk the interviewer through your solution to “${coding.walkthrough.title}”.`,
      isQuestion: false,
      timed: true,
    };
  } else if (coding.pinned && questionLabel) {
    card = { label: questionLabel, text: coding.pinned.prompt, isQuestion: true, timed: true };
  } else if (coding.index < 0) {
    card = { label: "WARM-UP", text: "A few minutes to get to know you before the questions start.", isQuestion: false, timed: false };
  }

  return (
    <div className="h-screen flex overflow-hidden text-[#0F0F0F]" style={{ backgroundColor: "#F5F3EE" }}>
      <AgendaRail
        steps={steps}
        currentProgress={
          clockShown && coding.current ? stepProgress(coding.current.allocated_minutes, coding.secondsRemaining) : null
        }
        currentTimeLabel={clockShown ? `${formatCountdown(coding.secondsRemaining)} left` : null}
        warning={coding.warning}
        roleTitle={p.roleTitle}
        hiringCompany={p.hiringCompany}
        minutesLeft={p.minutesLeft}
        onLeave={p.onLeave}
        footer={
          showCodingPane ? (
            <>
              <InterviewerRailCard status={status} voice={p.voice} />
              {p.requiresCamera && <SelfView className="h-[132px]" />}
            </>
          ) : null
        }
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-3 p-3 sm:p-5 xl:p-6">
        {/* Narrow screens have no rail: one line says where they are. */}
        <div className="lg:hidden shrink-0 flex items-center justify-between gap-3 text-xs text-[#404040]">
          <span className="font-medium">{questionLabel ?? phaseLabel(p.phase) ?? "Interview"}</span>
          <span className="tabular-nums text-[#737373]">
            {p.elapsedLabel} of about {p.durationMinutes} min
          </span>
        </div>

        {p.reconnecting && <Notice tone="warn">Reconnecting you to the interview…</Notice>}
        {!p.reconnecting && p.networkLabel && (
          <Notice tone={p.networkLabel === "Connection lost" ? "error" : "warn"}>{p.networkLabel}</Notice>
        )}
        {p.silenceWarning && (
          <Notice tone="warn" alert>
            {SILENCE_WARNING_COPY}
          </Notice>
        )}
        {p.ending && <Notice tone="info">{ENDING_COPY}</Notice>}
        {p.showFiveMinuteNotice && <Notice tone="info">{FIVE_MINUTE_COPY}</Notice>}

        {showCodingPane ? (
          <>
            {/* CodingPane carries its own 16px side padding; cancel it so the
                problem and editor line up with the rest of the column. */}
            <div className="flex-1 min-h-0 overflow-hidden -mx-4">
              <CodingPane coding={coding} />
            </div>
            <div className="shrink-0 rounded-xl border border-[#E8E5DF] bg-white px-4 py-2">
              <Transcript turns={p.transcriptTurns} enabled={p.captionsEnabled} onToggle={p.onToggleCaptions} compact />
            </div>
          </>
        ) : (
          <>
            {card && (
              <QuestionCard
                label={card.label}
                text={card.text}
                isQuestion={card.isQuestion}
                secondsRemaining={coding.secondsRemaining}
                warning={coding.warning}
                timerActive={card.timed && clockShown}
              />
            )}
            <section aria-label="Conversation" className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 sm:gap-4">
              <ConversationCard
                status={status}
                voice={p.voice}
                turns={p.transcriptTurns}
                captionsEnabled={p.captionsEnabled}
              />
              {/* Phones skip the self-view: the captions need the height. */}
              {p.requiresCamera && <SelfView className="hidden md:block md:w-[260px] xl:w-[300px] shrink-0" />}
            </section>
          </>
        )}

        <ControlBar
          micOn={p.micOn}
          onToggleMic={p.onToggleMic}
          captionsEnabled={p.captionsEnabled}
          onToggleCaptions={p.onToggleCaptions}
          showRepeat={coding.current !== undefined && !coding.finished}
          onRepeat={p.onRepeat}
          showDone={!showCodingPane && p.agentHasSpoken}
          doneEnabled={p.presenceState === "listening" && !p.voice.interviewerSpeaking}
          onDone={p.onDone}
          momentActive={p.momentActive}
          onMoment={p.onMoment}
          hint={showCodingPane ? CODING_HINT : undefined}
          onLeave={p.onLeave}
        />
      </div>
    </div>
  );
}

const NOTICE_TONE = {
  warn: "bg-[#FDECD2] text-[#8A4B08] border-[#F3D8A8]",
  error: "bg-[#FBE0DE] text-[#9B1C1C] border-[#F5B5AE]",
  info: "bg-white text-[#404040] border-[#E8E5DF]",
} as const;

function Notice({
  tone,
  alert = false,
  children,
}: {
  tone: keyof typeof NOTICE_TONE;
  alert?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role={alert ? "alert" : "status"}
      className={`shrink-0 rounded-xl border px-4 py-2 text-[13px] ${NOTICE_TONE[tone]}`}
    >
      {children}
    </div>
  );
}
