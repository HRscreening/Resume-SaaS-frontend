import { useEffect, useState } from "react";
import { canRepeat } from "./candidateEvents";

interface TurnControlsProps {
  showDone: boolean;
  showRepeat: boolean;
  onDone: () => void;
  onRepeat: () => void;
}

const BUTTON =
  "h-8 px-3 border border-[#D4D4D4] bg-white text-xs font-medium text-[#404040] rounded-lg hover:bg-[#F5F3EE] transition-colors disabled:opacity-40 disabled:pointer-events-none";

export default function TurnControls({ showDone, showRepeat, onDone, onRepeat }: TurnControlsProps) {
  const [lastRepeatAt, setLastRepeatAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Ticks only while the cooldown is running, and clears itself.
  useEffect(() => {
    if (lastRepeatAt === null || canRepeat(lastRepeatAt, now)) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [lastRepeatAt, now]);

  if (!showDone && !showRepeat) return null;

  function handleRepeat() {
    const pressedAt = Date.now();
    setNow(pressedAt);
    setLastRepeatAt(pressedAt);
    onRepeat();
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-1">
      {showDone && (
        <button type="button" className={BUTTON} onClick={onDone} aria-label="I'm done speaking">
          I'm done
        </button>
      )}
      {showRepeat && (
        <button
          type="button"
          className={BUTTON}
          onClick={handleRepeat}
          disabled={!canRepeat(lastRepeatAt, now)}
          aria-label="Repeat the question"
        >
          Repeat question
        </button>
      )}
    </div>
  );
}
