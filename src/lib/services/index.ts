import { createClient } from "@/lib/supabase/client";
import { StorageService } from "@/lib/services/storage.service";
import { ResumeUploadService } from "@/lib/services/resumeUpload.service";

const supabaseClient = createClient();
const storageService = new StorageService(supabaseClient, "resumes");
export const resumeUploadService = new ResumeUploadService(storageService);