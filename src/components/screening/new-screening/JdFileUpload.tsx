import { useRef, useState } from "react";

interface JdFileUploadProps {
  // Currently selected file, if any.
  file: File | null;
  // Extracted text length drives the "N characters extracted" confirmation.
  extractedText: string;
  // True while text is being pulled out of the file.
  extracting: boolean;
  // Fires with a validated (.pdf/.docx) file ready for extraction.
  onSelect: (file: File) => void;
  // Clears the current file/extracted text.
  onRemove: () => void;
}

const ACCEPTED = [".pdf", ".docx"];

function isAccepted(file: File) {
  return ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext));
}

// JD file picker with three visual states: extracting (spinner), selected
// (green confirmation), and empty (drag-and-drop zone). Drag state is purely
// visual so it lives here rather than in the parent.
export function JdFileUpload({ file, extractedText, extracting, onSelect, onRemove }: JdFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  if (extracting) {
    return (
      <div className="border border-[#D4D4D4] rounded-xl p-6 flex items-center gap-3 bg-[#FAFAF8]">
        <div className="h-5 w-5 rounded-full border-2 border-[#C85A17] border-t-transparent animate-spin shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#0F0F0F]">Extracting text…</p>
          <p className="text-xs text-[#737373] mt-0.5 truncate max-w-xs">{file?.name}</p>
        </div>
      </div>
    );
  }

  if (file && extractedText) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5l2.5 2.5L11 4"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-800 truncate">{file.name}</p>
            <p className="text-xs text-green-700 mt-0.5">{extractedText.length.toLocaleString()} characters extracted</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-green-700 hover:text-red-600 underline shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const f = e.dataTransfer.files[0];
        if (f && isAccepted(f)) onSelect(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }}
      />
      <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4"/><path d="M3 15h14"/></svg>
      </div>
      <p className="text-sm font-medium text-[#0F0F0F] mb-1">
        <span className="hidden md:inline">Drop your JD file here</span>
        <span className="md:hidden">Tap to choose a JD file</span>
      </p>
      <p className="text-xs text-[#737373]">
        <span className="hidden md:inline">or click to browse</span>
        <span className="md:hidden">from your phone's files</span>
      </p>
      <p className="text-xs font-semibold text-[#A0A0A0] mt-2 uppercase tracking-wide">PDF or DOCX · single file</p>
    </div>
  );
}
