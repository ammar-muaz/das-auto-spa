import { supabase } from "./supabase";

export async function uploadPublicImage(bucket: string, file: File, folder: string): Promise<string> {
  const extension = file.name.split(".").pop() || "jpg";
  const filePath = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(filePath, file);
  if (error) {
    const status = typeof (error as { status?: number }).status === "number"
      ? ` (status ${(error as { status?: number }).status})`
      : "";
    const message = (error as { message?: string }).message || "Storage upload failed";
    throw new Error(`${message}${status}`);
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}
