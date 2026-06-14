import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("push_token")
    .eq("id", userId)
    .single();

  const token = profile?.push_token as string | null;
  if (!token || !token.startsWith("ExponentPushToken[")) return;

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
      data: data ?? {},
    }),
  }).catch(() => {});
}
