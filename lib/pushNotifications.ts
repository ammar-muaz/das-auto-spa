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
  console.log("[push] token for", userId, ":", token ? token.slice(0, 30) + "..." : "null");
  if (!token || !token.startsWith("ExponentPushToken[")) return;

  try {
    const res = await fetch("https://exp.host/api/v2/push/send", {
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
    });
    const json = await res.json();
    console.log("[push]", JSON.stringify(json));
  } catch (e) {
    console.error("[push] fetch error", e);
  }
}
