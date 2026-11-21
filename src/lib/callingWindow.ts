import type { CallingWindow } from "@/types";

/** Check the configured timezone, independent of the recruiter's local timezone. */
export function assertWithinCallingWindow(window: CallingWindow | null | undefined, now = new Date()): void {
  const invalid = "Cannot verify the calling window. Check the voice settings and try again.";
  if (!window || !window.tz) throw new Error(invalid);
  const parse = (value: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(invalid);
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const start = parse(window.start);
  const end = parse(window.end);
  if (start === end) throw new Error(invalid);

  let current: number;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: window.tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    current = Number(parts.find((part) => part.type === "hour")?.value) * 60
      + Number(parts.find((part) => part.type === "minute")?.value);
  } catch {
    throw new Error(invalid);
  }

  // Start inclusive, end exclusive; overnight windows cross midnight.
  const allowed = start < end
    ? current >= start && current < end
    : current >= start || current < end;
  if (!allowed) {
    throw new Error(
      "Calls can only start between " + window.start + " and " + window.end
      + " (" + window.tz + "). Please schedule a call within that window or try again later.",
    );
  }
}