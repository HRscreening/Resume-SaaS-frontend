import { JdFileUpload } from "./JdFileUpload";
import { JdAiBuilder } from "./JdAiBuilder";

type JdInputMode = "paste" | "upload" | "ai";

const MODE_OPTIONS: { value: JdInputMode; label: string }[] = [
  { value: "paste", label: "Paste" },
  { value: "upload", label: "Upload file" },
  { value: "ai", label: "Build with AI" },
];

interface JdInputStepProps {
  title: string;
  onTitleChange: (value: string) => void;
  jdText: string;
  onJdTextChange: (value: string) => void;
  mode: JdInputMode;
  onModeChange: (mode: JdInputMode) => void;
  jdFile: File | null;
  extracting: boolean;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
  analyzing: boolean;
  onAnalyze: () => void;
}

// Step 1 of the new-job wizard: collect a job title and the JD itself, either
// pasted or uploaded as a file. Emits onAnalyze once both are present.
export function JdInputStep({
  title,
  onTitleChange,
  jdText,
  onJdTextChange,
  mode,
  onModeChange,
  jdFile,
  extracting,
  onFileSelect,
  onRemoveFile,
  analyzing,
  onAnalyze,
}: JdInputStepProps) {
  const canAnalyze = Boolean(title.trim()) && Boolean(jdText.trim()) && !analyzing && !extracting;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E5DF] p-5 sm:p-6 md:p-8">
      <h2 className="text-lg font-semibold text-[#0F0F0F] mb-1">Job description</h2>
      <p className="text-sm text-[#737373] mb-6">We'll auto-generate a 3-category scoring rubric from your JD.</p>
      <div className="space-y-5">
        {/* Job title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[#0F0F0F] mb-1.5">
            Job title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Senior Backend Engineer — April 2026"
            className="w-full h-11 px-3.5 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow"
          />
        </div>

        {/* JD input — paste or upload */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="block text-sm font-medium text-[#0F0F0F]">
              Job description <span className="text-red-500">{
                
                mode !== "ai" && "*" 

                }</span>
            </label>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F0EDE8] border border-[#D4D4D4]">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onModeChange(opt.value)}
                  className={`h-6 px-3 rounded-md text-xs font-medium transition-colors ${
                    mode === opt.value ? "bg-white text-[#0F0F0F] shadow-sm" : "text-[#737373] hover:text-[#404040]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "paste" && (
            <>
              <textarea
                id="jd"
                rows={10}
                value={jdText}
                onChange={(e) => onJdTextChange(e.target.value)}
                placeholder="Paste your full job description here..."
                className="w-full px-3.5 py-3 rounded-xl border border-[#D4D4D4] bg-[#F5F3EE] text-[#0F0F0F] text-sm placeholder:text-[#A0A0A0] focus:outline-none focus:ring-2 focus:ring-[#C85A17] transition-shadow resize-none"
              />
              <p className="mt-1 text-xs text-[#A0A0A0]">{jdText.length} characters</p>
            </>
          )}

          {mode === "upload" && (
            <JdFileUpload
              file={jdFile}
              extractedText={jdText}
              extracting={extracting}
              onSelect={onFileSelect}
              onRemove={onRemoveFile}
            />
          )}

          {mode === "ai" && (
            <JdAiBuilder
              jobTitle={title}
              jdText={jdText}
              onJdTextChange={onJdTextChange}
            />
          )}
        </div>

        <button
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="w-full h-11 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {analyzing && <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
          {analyzing ? "Analyzing job description..." : "Generate scoring rubric →"}
        </button>
      </div>
    </div>
  );
}
