import { useQuery } from "@tanstack/react-query";
import { getInterviewRecording, type InterviewRecording } from "@/lib/interviewScorecardApi";

interface InterviewRecordingSectionProps {
  screeningId: string;
  sessionId: string;
}

// Signed links expire, so they are fetched when the section opens rather
// than carried on the scorecard list, and refetched after a few minutes.
const LINK_STALE_MS = 5 * 60 * 1000;

export function statusLine(recording: InterviewRecording): string | null {
  if (recording.status === "none") return "This interview was not recorded.";
  if (recording.status === "failed") return "The recording could not be made.";
  if (recording.part_urls.length === 0) return "The recording is still being processed.";
  if (recording.status === "processing") return "Part of the recording is still being processed.";
  return null;
}

export function InterviewRecordingSection({ screeningId, sessionId }: InterviewRecordingSectionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["interview-recording", screeningId, sessionId],
    queryFn: () => getInterviewRecording(screeningId, sessionId),
    staleTime: LINK_STALE_MS,
  });

  if (isLoading) {
    return <p className="text-sm text-[#737373]">Loading…</p>;
  }
  if (error != null || !data) {
    return <p className="text-sm text-[#737373]">Could not load the recording.</p>;
  }

  const note = statusLine(data);
  const multi = data.part_urls.length > 1;
  return (
    <div className="space-y-3">
      {note && <p className="text-sm text-[#737373]">{note}</p>}
      {multi && (
        <p className="text-xs text-[#737373]">
          The candidate reconnected, so the recording is in {data.part_urls.length} parts.
        </p>
      )}
      {data.part_urls.map((url, i) => (
        <div key={url}>
          {multi && <p className="text-xs font-medium text-[#404040] mb-1">Part {i + 1}</p>}
          <audio controls preload="none" src={url} className="w-full" />
        </div>
      ))}
    </div>
  );
}
