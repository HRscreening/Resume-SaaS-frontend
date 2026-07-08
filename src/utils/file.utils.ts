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
    
    const allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-zip-compressed",
    ];

    if (!allowed.includes(file.type))
        throw new Error(`Unsupported file type ${file.type}`);

    if (!allowedExtensions.includes(extension))
        throw new Error(`Unsupported file extension ${extension}`);
}