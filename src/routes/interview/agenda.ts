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

interface FinishedInput {
  total: number;
  index: number;
  currentId: string | null;
  deadlineAt: number | null;
  deadlineQuestionId: string | null;
}

// True only once the last question's own clock has been closed. The owner
// check stops a stale null deadline (left by the previous question) from
// reading as "finished" for a frame on arrival at the last question.
export function isInterviewFinished(i: FinishedInput): boolean {
  return (
    i.total > 0 &&
    i.index === i.total - 1 &&
    i.currentId !== null &&
    i.deadlineQuestionId === i.currentId &&
    i.deadlineAt === null
  );
}
