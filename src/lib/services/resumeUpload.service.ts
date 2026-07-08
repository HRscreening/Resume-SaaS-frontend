import { StorageService } from "@/lib/services/storage.service";
import { generateStoragePath,extractExtension,validateResume } from "@/utils/file.utils";





export class ResumeUploadService {

    private readonly signedUrlExpiry = 60 * 60; // 1 hour in seconds

    constructor(private readonly storage: StorageService) {}

    async uploadResumes(
        files: File[],
        screeningId: string,
        userId: string
    ): Promise<{fileName: string; path: string}[]> {
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


    async generateSignedUrls(paths: string,): Promise<string> {
        return await this.storage.createSignedUrl(paths, this.signedUrlExpiry);
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

            const blob = await entry.async("blob");

            files.push(
                new File([blob], relativePath, {
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
