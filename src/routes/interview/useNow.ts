import { useEffect, useState } from "react";

// Date.now(), refreshed every `intervalMs` while `active`. Read fresh from
// the wall clock on each tick (never incremented), so a throttled background
// tab cannot make a derived countdown drift.
export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
