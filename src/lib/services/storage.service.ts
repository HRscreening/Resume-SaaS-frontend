import { createClient } from "@/lib/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";

export class StorageService {

    constructor(private readonly supabase: SupabaseClient,
        private readonly bucket: string) { }

    async upload(path: string, file: File,is_upsert: boolean = false) {
        const { error } = await this.supabase.storage
            .from(this.bucket)
            .upload(path, file,
                {
                    upsert: is_upsert,
                    cacheControl: "3600",
                    contentType: file.type,
                }
            );

        if (error) throw error;

        return path;
    }

    async uploadMany(files: { file: File; path: string,fileName:string }[]) {
        await Promise.all(
            files.map(({ file, path }) => this.upload(path, file))
        );
    }

    async delete(paths: string[]) {
        const { error } = await this.supabase.storage
            .from(this.bucket)
            .remove(paths);

        if (error) throw error;
    }

    getPublicUrl(path: string) {
        return this.supabase.storage
            .from(this.bucket)
            .getPublicUrl(path).data.publicUrl;
    }


    async createSignedUrl(path: string, expiresIn: number, download: boolean = false): Promise<string> {

        const { data, error } = await this.supabase.storage
            .from(this.bucket)
            .createSignedUrl(path, expiresIn, {
                download: download,
            });

        if (error) throw error;

        return data.signedUrl;
    }
}