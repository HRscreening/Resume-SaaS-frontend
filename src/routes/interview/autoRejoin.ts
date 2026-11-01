// Automatic rejoin after a dropped connection. The interviewer holds the
// interview open for five minutes (backend voice_agent/disconnect_hold.py,
// HOLD_S), so the page keeps trying for that long on its own before asking
// the candidate to press anything.
export const REJOIN_WINDOW_MS = 5 * 60_000;

const DELAYS_MS = [1_000, 2_000, 4_000];
const STEADY_DELAY_MS = 5_000;

/** Wait before rejoin attempt `attempt` (0-based): quick at first, then steady. */
export function rejoinDelayMs(attempt: number): number {
  return DELAYS_MS[attempt] ?? STEADY_DELAY_MS;
}

/** Whether the page should still be retrying on its own. */
export function shouldKeepRejoining(lostAtMs: number | null, nowMs: number): boolean {
  return lostAtMs !== null && nowMs - lostAtMs < REJOIN_WINDOW_MS;
}
