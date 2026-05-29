import { useEffect, useRef, useState } from "react";
import { generateJDStream } from "@/lib/api";
import { useTypewriter } from "@/hooks/useTypewriter";

interface JdAiBuilderProps {
  // Required before generating — sent as `job_title`.
  jobTitle: string;
  // The working JD. Bound to the editable textarea and used as `current_Jd`
  // on reprompts; generation writes its result back through onJdTextChange.
  jdText: string;
  onJdTextChange: (value: string) => void;
  // Surfaces generation errors through the parent's error banner.
  onError: (message: string | null) => void;
}

// "Build with AI" JD mode: a prompt input drives an AI-generated job
// description into an editable textarea. After the first generation the user
// can reprompt a limited number of times (attemptsLeft), passing the current
// JD back so the AI refines rather than starts over.
export function JdAiBuilder({ jobTitle, jdText, onJdTextChange, onError }: JdAiBuilderProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Set once the first stream completes. Tracked separately from attemptsLeft
  // so the "reprompt" UI still works even if the X-Attempts-Left header isn't
  // exposed to the browser.
  const [hasGenerated, setHasGenerated] = useState(false);
  // Server-reported reprompts remaining; null when unknown.
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  const outOfAttempts = attemptsLeft !== null && attemptsLeft <= 0;
  const canGenerate =
    Boolean(jobTitle.trim()) && Boolean(prompt.trim()) && !generating && !outOfAttempts;

  // Reveals streamed text at a steady typewriter pace rather than in the big
  // bursts the backend sends, so it reads like a chat response being typed out.
  // `generating` stays true until the reveal fully drains (onDone).
  const typewriter = useTypewriter({
    onReveal: onJdTextChange,
    onDone: () => setGenerating(false),
  });

  // While revealing, keep the textarea pinned to the latest text so it reads
  // top-to-bottom like a chat response. Stops once generation ends so the user
  // can scroll back up freely.
  useEffect(() => {
    if (!generating) return;
    const el = textareaRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [jdText, generating]);

  async function handleGenerate() {
    if (!canGenerate) return;
    onError(null);
    setGenerating(true);
    // Capture the JD to refine before we clear the textarea for the new stream.
    const currentJd = jdText;
    typewriter.reset();
    onJdTextChange("");
    try {
      const { attemptsLeft: remaining } = await generateJDStream(
        {
          job_title: jobTitle.trim(),
          user_input: prompt.trim(),
          current_Jd: currentJd,
        },
        // Buffer each burst; the typewriter reveals it at a steady pace.
        (fullText) => typewriter.push(fullText),
      );
      setHasGenerated(true);
      if (remaining !== null) setAttemptsLeft(remaining);
      // Let the typewriter finish revealing whatever is still buffered, then it
      // flips `generating` off via onDone.
      typewriter.finish();
    } catch (err) {
      // Restore the previous JD so a failed reprompt doesn't wipe the user's work.
      typewriter.cancel();
      onJdTextChange(currentJd);
      onError(err instanceof Error ? err.message : "Failed to generate job description");
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Generated JD — editable */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={12}
          value={jdText}
          onChange={(e) => onJdTextChange(e.target.value)}
          readOnly={generating}
          placeholder="Your AI-generated job description will appear here. You can edit it freely before continuing."
          className="w-full px-3.5 py-3 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow resize-none read-only:cursor-default"
        />
        {generating && !jdText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#F5F3EE]/80">
            <div className="h-5 w-5 rounded-full border-2 border-[#C85A17] border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-[#737373]">Writing your job description…</p>
          </div>
        )}
      </div>

      {hasGenerated && (
        <div className="flex items-center justify-between text-xs text-[#A0A0A0]">
          <span>{jdText.length.toLocaleString()} characters</span>
          {attemptsLeft !== null && (
            <span className={outOfAttempts ? "text-red-500 font-medium" : ""}>
              {outOfAttempts
                ? "No reprompts left"
                : `${attemptsLeft} reprompt${attemptsLeft === 1 ? "" : "s"} left`}
            </span>
          )}
        </div>
      )}

      {/* Prompt input + generate */}
      <div>
        <label htmlFor="jd-ai-prompt" className="block text-xs font-medium text-[#404040] mb-1.5">
          {hasGenerated ? "Refine the job description" : "Tell the AI what to build"}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            id="jd-ai-prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
            disabled={generating || outOfAttempts}
            placeholder={
              hasGenerated
                ? "e.g. add a section on team leadership"
                : "e.g. 2 yrs experience, scalable systems, strong communication"
            }
            className="flex-1 h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="h-11 px-4 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            {generating ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0l1.6 4.4L14 6l-4.4 1.6L8 12l-1.6-4.4L2 6l4.4-1.6L8 0z" />
                <path d="M13 10l.7 1.8L15.5 12.5l-1.8.7L13 15l-.7-1.8L10.5 12.5l1.8-.7L13 10z" />
              </svg>
            )}
            {generating ? "Generating…" : hasGenerated ? "Regenerate" : "Generate"}
          </button>
        </div>
        {!jobTitle.trim() && (
          <p className="mt-1.5 text-xs text-[#a70c0c]">Enter a job title above to start generating.</p>
        )}
      </div>
    </div>
  );
}
