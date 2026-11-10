import { createClient } from "@/lib/supabase/client";
import { StorageService } from "@/lib/services/storage/storage.service";
import { ResumeUploadService } from "@/lib/services/storage/resumeUpload.service";

const supabaseClient = createClient();
const storageService = new StorageService(supabaseClient, "resumes");
export const jdStorageService = new StorageService(supabaseClient, "Job_Descriptions");
export const resumeUploadService = new ResumeUploadService(storageService);