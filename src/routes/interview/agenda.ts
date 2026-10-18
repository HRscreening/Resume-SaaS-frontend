export type AgendaSegment = "done" | "current" | "upcoming";

// One segment per question. `index` is null during the warm-up (nothing
// presented yet); `finished` means the pointer is past the last question.
export function agendaSegments(
  total: number,
  index: number | null,
  finished: boolean,
): AgendaSegment[] {
  return Array.from({ length: Math.max(total, 0) }, (_, i): AgendaSegment => {
    if (finished) return "done";
    if (index === null) return "upcoming";
    if (i < index) return "done";
    return i === index ? "current" : "upcoming";
  });
}
