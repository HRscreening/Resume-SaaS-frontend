/**
 * Time helpers shared by every voice-scheduling surface (candidate drawer,
 * bulk scheduler, upcoming list).
 *
 * All of them talk to the same API, which is UTC ISO throughout, while the
 * `datetime-local` input has no timezone at all and means local wall-clock
 * time. Converting in one place keeps that boundary from being re-derived —
 * and re-derived slightly differently — in three components.
 */

/** Format a Date for a `<input type="datetime-local">` value.
 *  toISOString() is UTC, so the offset is subtracted first; otherwise a
 *  recruiter in IST picking 10:00 would see 04:30. */
export function toInputValue(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
}

/** Default booking time: the next whole minute an hour out. Far enough ahead
 *  that the recruiter is choosing a slot rather than racing the dispatcher. */
export function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  return toInputValue(d);
}

/** True when the input value is a usable future time. The backend enforces
 *  this too (and is the authority); this is only so the UI can refuse early
 *  instead of round-tripping to a 422. */
export function isFuture(inputValue: string): boolean {
  const t = new Date(inputValue).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** The viewer's IANA zone, shown beside pickers. Scheduled calls are dialed
 *  against a candidate who may be elsewhere, so naming the zone the time is
 *  expressed in prevents a silent hour-offset mistake. */
export function localZoneName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "local time";
  } catch {
    return "local time";
  }
}

export function formatDayHeading(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short",
  });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
  });
}

/** Group items by calendar day, chronologically, for the upcoming list.
 *  Generic over the item so the panel can group calls without this module
 *  needing to know what a call is. */
export function groupByDay<T>(
  items: readonly T[],
  getIso: (item: T) => string,
): { day: Date; items: T[] }[] {
  const buckets = new Map<string, { day: Date; items: T[] }>();
  for (const item of items) {
    const d = new Date(getIso(item));
    const key = d.toDateString();
    const bucket = buckets.get(key);
    if (bucket) bucket.items.push(item);
    else buckets.set(key, { day: d, items: [item] });
  }
  return [...buckets.values()]
    .sort((a, b) => a.day.getTime() - b.day.getTime())
    .map((b) => ({
      ...b,
      items: [...b.items].sort(
        (x, y) => new Date(getIso(x)).getTime() - new Date(getIso(y)).getTime(),
      ),
    }));
}
