import { agendaSegments, type AgendaSegment } from "./agenda";

interface AgendaBarProps {
  total: number;
  // -1 (or any negative) means the warm-up: no question presented yet.
  index: number;
  finished: boolean;
}

const SEGMENT_CLASS: Record<AgendaSegment, string> = {
  done: "bg-[#4B4B4B]",
  current: "bg-[#C85A17]",
  upcoming: "bg-[#E5E1D8]",
};

export default function AgendaBar({ total, index, finished }: AgendaBarProps) {
  if (total <= 0) return null;
  const active = index >= 0 ? index : null;
  const segments = agendaSegments(total, active, finished);
  const now = finished ? total : active === null ? 0 : active + 1;
  return (
    <div
      role="progressbar"
      aria-label={`Question ${Math.min(Math.max(now, 1), total)} of ${total}`}
      aria-valuenow={now}
      aria-valuemin={0}
      aria-valuemax={total}
      className="w-full flex gap-1 px-4"
    >
      {segments.map((state, i) => (
        <div key={i} className={`h-1 flex-1 rounded-full ${SEGMENT_CLASS[state]}`} />
      ))}
    </div>
  );
}
