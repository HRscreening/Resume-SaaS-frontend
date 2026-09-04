import { StorageService } from "@/lib/services/storage.service";
import { generateStoragePath, extractExtension, validateResume } from "@/utils/file.utils";
import { getResumeFileUrl } from "@/lib/api";





export class ResumeUploadService {

    private readonly signedUrlExpiry = 60 * 60; // 1 hour in seconds

    constructor(private readonly storage: StorageService) { }

    async uploadResumes(
        files: File[],
        screeningId: string,
        userId: string
    ): Promise<{ fileName: string; path: string }[]> {
        const allFiles = await this.collectFiles(files);

        const preparedFiles = allFiles.map((file) => ({
            file,
            fileName: file.name,
            path: generateStoragePath(file.name, screeningId, userId),
        }));

        console.log("Prepared files for upload:", preparedFiles);

        // return [""]
        await this.storage.uploadMany(preparedFiles);

        return preparedFiles.map(({ fileName, path }) => ({ fileName, path }));
    }


    async generateSignedUrls(path: string, screeningId: string): Promise<string> {
        return await getResumeFileUrl(screeningId, path);
    }

    async downloadResume(path: string, fileName: string, screeningId: string): Promise<void> {
        const signedUrl = await getResumeFileUrl(screeningId, path);

        const response = await fetch(signedUrl);

        if (!response.ok) {
            throw new Error("Failed to download resume");
        }

        const blob = await response.blob();

        const url = URL.createObjectURL(blob);

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();

        anchor.remove();
        URL.revokeObjectURL(url);
    }

    private async collectFiles(files: File[]): Promise<File[]> {
        const collectedFiles: File[] = [];

        for (const file of files) {
            // Check if the file is a valid resume format (PDF, DOC, DOCX, or ZIP)
            validateResume(file);
            const extension = file.name.split(".").pop()?.toLowerCase();
            if (file.type === "application/zip" || file.type === "application/x-zip-compressed" || extension === "zip") {
                const extractedFiles = await this.extractZip(file);

                for (const extractedFile of extractedFiles) {
                    validateResume(extractedFile);
                }

                collectedFiles.push(...extractedFiles);
            } else {
                collectedFiles.push(file);
            }
        }

        return collectedFiles;
    }

    private async extractZip(zipFile: File): Promise<File[]> {
        const JSZip = (await import("jszip")).default;

        const zip = await JSZip.loadAsync(zipFile);

        const files: File[] = [];

        for (const [relativePath, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;

            // Skip macOS archive junk: __MACOSX resource forks and dot-files
            // (.DS_Store, ._name). They aren't resumes and would fail
            // validateResume, aborting the whole upload (the button then hangs
            // on "Uploading & scoring…").
            const baseName = relativePath.split("/").pop() ?? "";
            if (
                relativePath.startsWith("__MACOSX/") ||
                relativePath.includes("/__MACOSX/") ||
                baseName.startsWith(".") ||
                baseName === ""
            ) {
                continue;
            }

            const blob = await entry.async("blob");

            files.push(
                new File([blob], baseName, {
                    type: this.getMimeType(relativePath),
                })
            );
        }

        return files;
    }

    private getMimeType(filename: string): string {
        const extension = filename.split(".").pop()?.toLowerCase();

        switch (extension) {
            case "pdf":
                return "application/pdf";
            case "doc":
                return "application/msword";
            case "docx":
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            default:
                return "application/octet-stream";
        }
    }
}
