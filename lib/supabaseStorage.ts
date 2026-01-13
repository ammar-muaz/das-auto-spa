import supabase from "./supabase";

export async function uploadPublicImage(
    bucket: string,
    file: File,
    folder: string
) {
    const extension = file.name.split(".").pop() || "jpg";
    const filePath = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);
    if (error) {
        throw error;
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
}
