import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type ConnectionState = "connected" | "reconnecting" | "disconnected";

interface StatusPillProps {
  connectionState: ConnectionState;
  speaking: boolean;
}

// The single, first-class readout of "is this still working, and is the
// interviewer talking." Previously this was two separate indicators (a bare
// connection dot, and an "Interviewer speaking/listening" pill) that could
// disagree in how much attention they drew — one dot for connection health,
// one pill for voice activity, read together by habit rather than by
// design. This folds them into one: the connection problem always wins the
// read when there is one ("Reconnecting" overrides any speaking state,
// because a candidate who cannot tell the call is unstable is worse off
// than one who briefly cannot tell who is talking), and otherwise it reports
// the interviewer's voice activity, which is the thing that matters for 99%
// of a healthy call.
export default function StatusPill({ connectionState, speaking }: StatusPillProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { color, dotColor, pulse, text } = describe(connectionState, speaking);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${dotColor} ${pulse && !prefersReducedMotion ? "animate-pulse" : ""}`}
        aria-hidden="true"
      />
      {text}
    </span>
  );
}

function describe(
  connectionState: ConnectionState,
  speaking: boolean,
): { color: string; dotColor: string; pulse: boolean; text: string } {
  if (connectionState === "reconnecting") {
    return { color: "text-[#8A4B08]", dotColor: "bg-amber-500", pulse: true, text: "Reconnecting" };
  }
  if (connectionState === "disconnected") {
    return { color: "text-[#737373]", dotColor: "bg-neutral-400", pulse: false, text: "Disconnected" };
  }
  if (speaking) {
    return { color: "text-[#0F8A46]", dotColor: "bg-[#0F8A46]", pulse: true, text: "Interviewer speaking" };
  }
  return { color: "text-[#A3A3A3]", dotColor: "bg-[#A3A3A3]", pulse: false, text: "Interviewer listening" };
}
