import { supabase } from "./supabase";

interface NotifyParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  bookingId?: string;
}

export async function notifyUser({ userId, title, message, type = "general", bookingId }: NotifyParams) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    booking_id: bookingId,
  });
}

export async function notifyAdmins({ title, message, type = "general", bookingId }: Omit<NotifyParams, "userId">) {
  const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
  if (!admins?.length) return;
  await supabase.from("notifications").insert(
    admins.map((admin: { id: string }) => ({
      user_id: admin.id,
      title,
      message,
      type,
      booking_id: bookingId,
    }))
  );
}
