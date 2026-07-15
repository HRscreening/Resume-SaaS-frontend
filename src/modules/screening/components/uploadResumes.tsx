import { useState, useRef } from 'react'
import { resumeUploadService } from '@/lib/services'
import { queryClient } from '@/lib/queryClient'
import {toast} from "sonner"
import { useAddApplicationsMutation } from '@/modules/screening/hooks/application.hook'

interface UploadResumesProps {
    screening_id: string;
    user_id: string;
    setShowUploadMore: (show: boolean) => void;
}

const UploadResumes = ({screening_id,user_id,setShowUploadMore}:UploadResumesProps) => {
    const [draftFiles, setDraftFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadNonce, setUploadNonce] = useState(0);
    const [uploadMoreFiles, setUploadMoreFiles] = useState<File[]>([]);
    const [uploadMoreDragActive, setUploadMoreDragActive] = useState(false);
    const uploadMoreFileInputRef = useRef<HTMLInputElement>(null);
      const [dragActive, setDragActive] = useState(false);


      const {mutateAsync:UploadResumes,isSuccess:isUploadDone,isPending:isUploading} = useAddApplicationsMutation()

    function pickResumeFiles(
        picked: FileList | File[] | null,
        current: File[],
        setter: (files: File[]) => void,
    ): void {
        if (!picked || picked.length === 0) return;
        const arr = Array.from(picked);
        const zips = arr.filter((f) => f.name.toLowerCase().endsWith(".zip"));
        const docs = arr.filter((f) => {
            const n = f.name.toLowerCase();
            return n.endsWith(".pdf") || n.endsWith(".docx");
        });
        if (zips.length > 0 && docs.length > 0) {
            setUploadError("Drop either a single ZIP or one-or-more PDF/DOCX files — not both.");
            return;
        }
        if (zips.length > 1) {
            setUploadError("Only one ZIP archive at a time.");
            return;
        }
        if (zips.length === 1) {
            setUploadError(null);
            setter([zips[0]]);
            return;
        }
        if (docs.length === 0) {
            setUploadError("Unsupported file type. Use ZIP, PDF, or DOCX.");
            return;
        }
        setUploadError(null);
        const seen = new Set(current.map((f) => `${f.name}_${f.size}`));
        const merged = [...current];
        for (const f of docs) {
            const key = `${f.name}_${f.size}`;
            if (!seen.has(key)) {
                merged.push(f);
                seen.add(key);
            }
        }
        setter(merged);
    }

    function acceptUploadMoreFiles(picked: FileList | File[] | null): void {
        pickResumeFiles(picked, uploadMoreFiles, setUploadMoreFiles);
    }



    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(false);
        pickResumeFiles(e.dataTransfer.files, draftFiles, setDraftFiles);
    }

    async function handleUploadAndStart() {

        const result = await resumeUploadService.uploadResumes(draftFiles, screening_id, user_id)

        console.log("Uploaded files:", result);

        return;

    }

    async function handleUploadMore() {

        if (uploadMoreFiles.length === 0 || !screening_id) return;


        if (!user_id) { setUploadError("User not authenticated"); return; }

        setUploading(true);
        const result = await resumeUploadService.uploadResumes(uploadMoreFiles, screening_id, user_id)
        console.log("Uploaded files:", result);


        const res = await UploadResumes({ resumes: result, screening_id: screening_id })
        // console.log(`Response on uploading ${res}`)

        toast.success(res.message || "Resumes uploaded successfully");
        
        setShowUploadMore(false);
        return;


    }
    return (
        <div>
            <div className="bg-white rounded-2xl border border-[#E8E5DF] p-6">
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-[#0F0F0F]">Add resumes</h2>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F0EDE8] border border-[#D4D4D4] text-xs font-semibold text-[#404040] tracking-wide">.ZIP · .PDF · .DOCX</span>
                        </div>
                        <p className="text-xs text-[#737373] mt-1">Upload a ZIP archive or one-or-more PDF/DOCX files. New resumes are scored and re-ranked against all existing candidates.</p>
                    </div>
                    <button onClick={() => { setShowUploadMore(false); setUploadMoreFiles([]); setUploadError(null); }}
                        className="h-7 w-7 rounded-lg hover:bg-[#F5F3EE] flex items-center justify-center text-[#737373] shrink-0 ml-4">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                    </button>
                </div>
                {uploadError && (
                    <div className="mt-3 mb-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{uploadError}</div>
                )}
                <input ref={uploadMoreFileInputRef} type="file" accept=".zip,.pdf,.docx" multiple className="hidden"
                    onChange={(e) => { acceptUploadMoreFiles(e.target.files); e.target.value = ""; }} />
                <div className="mt-4">
                    {uploadMoreFiles.length > 0 ? (
                        <div className="border border-[#D4D4D4] rounded-2xl p-4 bg-[#FAFAF8]">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold text-[#404040] uppercase tracking-wide">
                                    {uploadMoreFiles.length === 1 && uploadMoreFiles[0].name.toLowerCase().endsWith(".zip")
                                        ? "ZIP archive selected"
                                        : `${uploadMoreFiles.length} file${uploadMoreFiles.length === 1 ? "" : "s"} selected`}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => uploadMoreFileInputRef.current?.click()}
                                    className="text-xs font-medium text-[#C85A17] hover:underline"
                                >
                                    Add more
                                </button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {uploadMoreFiles.map((f, idx) => {
                                    const lower = f.name.toLowerCase();
                                    const kind = lower.endsWith(".zip") ? "ZIP" : lower.endsWith(".pdf") ? "PDF" : "Word";
                                    const sizeStr = f.size > 1024 * 1024
                                        ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
                                        : `${(f.size / 1024).toFixed(0)} KB`;
                                    return (
                                        <div key={`${f.name}_${f.size}_${idx}`} className="flex items-center gap-3 bg-white border border-[#E8E5DF] rounded-xl px-3 py-2">
                                            <div className="h-8 w-8 rounded-lg bg-[#FBF1E7] flex items-center justify-center shrink-0">
                                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#C85A17" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 18h12M4 2h8l4 4v12" /><path d="M12 2v5h5" />
                                                </svg>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#0F0F0F] truncate">{f.name}</p>
                                                <p className="text-xs text-[#737373]">{sizeStr} · {kind}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setUploadMoreFiles((prev) => prev.filter((_, i) => i !== idx))}
                                                className="h-7 w-7 rounded-lg text-[#A0A0A0] hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0 transition-colors"
                                                aria-label={`Remove ${f.name}`}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop dropzone. */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setUploadMoreDragActive(true); }}
                                onDragLeave={() => setUploadMoreDragActive(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setUploadMoreDragActive(false);
                                    acceptUploadMoreFiles(e.dataTransfer.files);
                                }}
                                onClick={() => uploadMoreFileInputRef.current?.click()}
                                className={`hidden md:block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploadMoreDragActive ? "border-[#C85A17] bg-[#C85A1708]" : "border-[#D4D4D4] hover:border-[#A0A0A0] hover:bg-[#F5F3EE]"
                                    }`}
                            >
                                <div className="h-10 w-10 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center mx-auto mb-3">
                                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4" /><path d="M3 15h14" /></svg>
                                </div>
                                <p className="text-sm font-medium text-[#0F0F0F] mb-1">Drop files here</p>
                                <p className="text-xs text-[#737373]">or click to browse</p>
                                <p className="text-xs font-semibold text-[#A0A0A0] mt-2 uppercase tracking-wide">ZIP archive · or one-or-more PDF/DOCX</p>
                            </div>

                            {/* Mobile tap-to-pick. Same uploadMoreFileInputRef. */}
                            <div className="md:hidden">
                                <button
                                    type="button"
                                    onClick={() => uploadMoreFileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed border-[#D4D4D4] bg-white hover:bg-[#F5F3EE] active:bg-[#EAE7DF] transition-colors"
                                >
                                    <div className="h-9 w-9 rounded-full bg-[#F5F3EE] border border-[#D4D4D4] flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#737373" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v10M6 7l4-4 4 4" /><path d="M3 15h14" /></svg>
                                    </div>
                                    <span className="text-sm font-semibold text-[#0F0F0F]">Add a resume</span>
                                    <span className="text-xs text-[#737373]">PDF or DOCX</span>
                                </button>
                                <p className="mt-2 text-xs text-[#737373] text-center">
                                    Bulk upload (ZIP, many files) works best on a desktop browser.
                                </p>
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={handleUploadMore}
                    disabled={uploadMoreFiles.length === 0 || uploading || isUploading}
                    className="mt-4 w-full h-10 bg-[#0F0F0F] text-white text-sm font-medium rounded-xl hover:bg-[#1C1C1C] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {uploading || isUploading && <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    {uploading || isUploading ? "Uploading………" : "Add Resumes"}
                </button>
            </div>


        </div>
    )
}

export default UploadResumes
