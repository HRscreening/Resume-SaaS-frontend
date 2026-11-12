import { Captions, CaptionsOff, Mic, MicOff, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { canRepeat } from "./candidateEvents";

interface ControlBarProps {
  micOn: boolean;
  onToggleMic: () => void;
  captionsEnabled: boolean;
  onToggleCaptions: () => void;
  showRepeat: boolean;
  onRepeat: () => void;
  // "I'm done answering" is shown on spoken questions; enabled only while
  // the interviewer is listening, so it cannot cut the interviewer off.
  showDone: boolean;
  doneEnabled: boolean;
  onDone: () => void;
  // "Give me a moment": shown beside the done button. `momentActive` while
  // the interviewer is holding back for them.
  momentActive: boolean;
  onMoment: () => void;
  // A line of guidance in place of the done button (the coding question).
  hint?: string;
  // The rail (and its Leave button) is hidden on narrow screens.
  onLeave: () => void;
}

const ICON_BUTTON =
  "h-12 w-12 shrink-0 rounded-xl border border-[#D4D4D4] bg-white flex items-center justify-center hover:bg-[#F5F3EE] transition-colors";
const TEXT_BUTTON =
  "h-12 px-4 shrink-0 rounded-xl border border-[#D4D4D4] bg-white text-sm font-medium text-[#0F0F0F] hover:bg-[#F5F3EE] transition-colors disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-2";

export default function ControlBar({
  micOn,
  onToggleMic,
  captionsEnabled,
  onToggleCaptions,
  showRepeat,
  onRepeat,
  showDone,
  doneEnabled,
  onDone,
  momentActive,
  onMoment,
  hint,
  onLeave,
}: ControlBarProps) {
  const [lastRepeatAt, setLastRepeatAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while the repeat cooldown runs, then stops.
  useEffect(() => {
    if (lastRepeatAt === null || canRepeat(lastRepeatAt, now)) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [lastRepeatAt, now]);

  function handleRepeat() {
    const pressedAt = Date.now();
    setNow(pressedAt);
    setLastRepeatAt(pressedAt);
    onRepeat();
  }

  return (
    <footer className="shrink-0 flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={onToggleMic}
        aria-pressed={!micOn}
        aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        className={`${ICON_BUTTON} ${micOn ? "" : "!bg-[#FBE0DE] !border-[#F5B5AE]"}`}
      >
        {micOn ? (
          <Mic className="h-5 w-5 text-[#0F0F0F]" aria-hidden="true" />
        ) : (
          <MicOff className="h-5 w-5 text-[#9B1C1C]" aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={onToggleCaptions}
        aria-pressed={captionsEnabled}
        aria-label={captionsEnabled ? "Hide captions" : "Show captions"}
        className={ICON_BUTTON}
      >
        {captionsEnabled ? (
          <Captions className="h-5 w-5 text-[#0F0F0F]" aria-hidden="true" />
        ) : (
          <CaptionsOff className="h-5 w-5 text-[#737373]" aria-hidden="true" />
        )}
      </button>
      {showRepeat && (
        <button type="button" onClick={handleRepeat} disabled={!canRepeat(lastRepeatAt, now)} className={TEXT_BUTTON}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Repeat question
        </button>
      )}

      <span className="flex-1" />

      {hint && <p className="hidden md:block max-w-md text-[13px] leading-[1.4] text-[#737373]">{hint}</p>}

      {showDone && (
        <button
          type="button"
          onClick={onMoment}
          disabled={!doneEnabled || momentActive}
          aria-live="polite"
          className={TEXT_BUTTON}
        >
          {momentActive ? "Taking a moment…" : "Give me a moment"}
        </button>
      )}

      {showDone && (
        <button
          type="button"
          onClick={onDone}
          disabled={!doneEnabled}
          title={doneEnabled ? undefined : "Available once the interviewer has finished speaking."}
          className="h-12 px-6 shrink-0 rounded-xl bg-[#0F0F0F] text-sm font-semibold text-white hover:bg-[#1C1C1C] transition-colors disabled:bg-[#D4D4D4] disabled:text-[#404040] disabled:cursor-not-allowed"
        >
          I'm done answering
        </button>
      )}

      <button type="button" onClick={onLeave} className={`${TEXT_BUTTON} lg:hidden`}>
        Leave
      </button>
    </footer>
  );
}
