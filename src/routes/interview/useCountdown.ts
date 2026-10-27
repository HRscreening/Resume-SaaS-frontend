import { useEffect, useRef, useState } from "react";

const WARNING_THRESHOLD_SECONDS = 60;

export interface Countdown {
  secondsRemaining: number;
  warning: boolean;
}

// Ticks down to a wall-clock deadline and fires `onExpire` exactly once when
// it is crossed. Recomputes from Date.now() every tick (same reasoning as
// useElapsedTime) so a throttled background tab cannot make a question's
// allocated time run long — the candidate is bound by how much real time
// has passed, which is also what keeps every candidate's allocation equal.
//
// `onExpire` is read through a ref so this effect's only real dependency is
// `deadlineAt`: a parent that re-creates the callback on every render (very
// likely, since it closes over current buffer state) must not retrigger the
// interval or double-arm the expiry guard.
export function useCountdown(deadlineAt: number | null, onExpire: () => void): Countdown {
  const [secondsRemaining, setSecondsRemaining] = useState(() =>
    deadlineAt === null ? 0 : Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  );
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const firedRef = useRef(false);

  useEffect(() => {
    firedRef.current = false;
    if (deadlineAt === null) {
      setSecondsRemaining(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  return {
    secondsRemaining,
    warning: secondsRemaining > 0 && secondsRemaining <= WARNING_THRESHOLD_SECONDS,
  };
}

// "mm:ss" countdown display, never negative.
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
