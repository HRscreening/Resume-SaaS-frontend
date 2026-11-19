import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { resumeUploadService } from "@/lib/services/storage";

type ResumeTabProps = {
  screeningId: string;
  resumePath?: string | null;
  filename?: string | null;
};

export function resumeFileType(filename?: string | null, path?: string | null) {
  for (const value of [filename, path]) {
    const extension = value?.split(/[?#]/)[0].match(/\.(pdf|docx?)$/i)?.[1]?.toLowerCase();
    if (extension) return extension;
  }
  return null;
}

export default function ResumeTab(props: ResumeTabProps) {
  // Remount when the selected file changes: never show the previous candidate's file.
  return <ResumePreview key={JSON.stringify(props)} {...props} />;
}

function ResumePreview({ screeningId, resumePath, filename }: ResumeTabProps) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(resumePath));
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fileType = resumeFileType(filename, resumePath);

  useEffect(() => {
    if (!resumePath) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setSourceUrl(null);
    setPreviewUrl(null);

    async function load() {
      try {
        const url = /^https?:\/\//i.test(resumePath!)
          ? resumePath!
          : await resumeUploadService.generateSignedUrls(resumePath!, screeningId);
        if (controller.signal.aborted) return;
        if (!/^https?:\/\//i.test(url)) throw new Error("Invalid resume URL");
        setSourceUrl(url);
        if (fileType === "pdf") {
          // A typed blob renders inline even when storage sends attachment headers.
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) throw new Error("Resume download failed");
          const blob = await response.blob();
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
          setPreviewUrl(objectUrl);
        } else if (fileType === "doc" || fileType === "docx") {
          // Same Office viewer used by the expanded resume page.
          setPreviewUrl("https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(url));
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("We couldn't load this resume. Try again or open the original file.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [screeningId, resumePath, fileType, attempt]);

  if (!resumePath) {
    return <p className="px-6 py-10 text-center text-sm text-[#737373]">No resume file is available for this candidate.</p>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E8E5DF] px-6 py-3">
        <span className="min-w-0 truncate text-xs text-[#737373]">{filename || "Original resume"}</span>
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[#404040] hover:text-[#C85A17]">
            <ExternalLink size={13} /> Open file
          </a>
        )}
      </div>
      {loading ? (
        <div role="status" className="flex flex-1 items-center justify-center gap-2 py-16 text-sm text-[#737373]">
          <Loader2 size={18} className="animate-spin" /> Loading resume…
        </div>
      ) : error ? (
        <div role="alert" className="px-6 py-10 text-center text-sm text-[#737373]">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-3 rounded-lg border border-[#E8E5DF] px-3 py-1.5 text-[#404040] hover:bg-[#F5F3EE]">Try again</button>
        </div>
      ) : previewUrl ? (
        <iframe
          src={previewUrl}
          title={fileType === "pdf" ? "Resume PDF" : "Resume Word document"}
          className="min-h-0 w-full flex-1 border-0 bg-[#F5F3EE]"
          onError={() => setError("The preview is unavailable. You can still open the original file.")}
        />
      ) : (
        <p className="px-6 py-10 text-center text-sm text-[#737373]">Preview is available for PDF, DOC and DOCX files. Open this file to view it.</p>
      )}
    </div>
  );
}