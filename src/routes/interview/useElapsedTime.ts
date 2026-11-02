import { useEffect, useState } from "react";

// Reads like a stopwatch: minutes unpadded, seconds always two digits
// ("3:04", "12:04" — never "03:04" or a countdown).
function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Ticks a "mm:ss since connect" string once a second. Recomputes from
// wall-clock time on every tick (rather than incrementing a counter) so a
// backgrounded tab's throttled timers cannot make the display drift.
//
// `startedAt` is a Date.now() timestamp taken at first connect, or null
// before that. It is intentionally set once and never reset by the caller,
// so a reconnect or rejoin does not restart the clock: the candidate cares
// how long they have been in the interview, not how long the current socket
// has been open.
export function useElapsedTime(startedAt: number | null): string {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (startedAt === null) {
      setElapsedSeconds(0);
      return;
    }
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return formatElapsed(elapsedSeconds);
}
