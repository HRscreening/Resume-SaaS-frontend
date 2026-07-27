import { v7 as uuidv7 } from "uuid";


export function extractExtension(filename: string) {
    const index = filename.lastIndexOf(".");
    return index === -1 ? "" : filename.slice(index + 1);
}

export function generateStoragePath(
    filename: string,
    screeningId: string,
    userId: string
) {

    const id = uuidv7().replace(/-/g, "");
    return `${userId}/${screeningId}/${id}.${extractExtension(filename)}`;
}

export function validateResume(file: File) {

    const extension = extractExtension(file.name).toLowerCase();

    const allowedExtensions = ["pdf", "doc", "docx", "zip"];

    // The file EXTENSION is the reliable gate. Browsers frequently report a
    // generic or empty MIME type (application/octet-stream, or "") for
    // perfectly valid PDFs/DOC/DOCX/ZIP depending on the OS, browser, or how
    // the file was selected — so rejecting on MIME alone breaks real uploads.
    if (!allowedExtensions.includes(extension))
        throw new Error(`Unsupported file extension ${extension}`);

    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream", // generic fallback — extension already validated
        "", // some browsers report no MIME type at all
    ];

    if (!allowedTypes.includes(file.type))
        throw new Error(`Unsupported file type ${file.type}`);
}