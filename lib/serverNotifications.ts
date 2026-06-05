import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface NotifyParams {
  userId: string;
  title: string;
  message: string;
  type?: string;
  bookingId?: string;
}

export async function notifyUser({ userId, title, message, type = "general", bookingId }: NotifyParams) {
  if (!userId) return;
  await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    booking_id: bookingId,
  });
}

export async function notifyAdmins({ title, message, type = "general", bookingId }: Omit<NotifyParams, "userId">) {
  const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("role", "admin");
  if (!admins?.length) return;

  await supabaseAdmin.from("notifications").insert(
    admins.map((admin) => ({
      user_id: admin.id,
      title,
      message,
      type,
      booking_id: bookingId,
    }))
  );
}

export async function getAdminEmails(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("profiles").select("email").eq("role", "admin");
  return (data ?? []).map((a: { email: string }) => a.email).filter(Boolean);
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("profiles").select("email").eq("id", userId).single();
  return data?.email ?? null;
}

export function customerStatusMessage(status: string, booking: {
  service_name?: string | null;
  scheduled_date?: string | null;
}) {
  const service = booking.service_name || "service";
  const date = booking.scheduled_date || "your scheduled date";

  return ({
    Confirmed: { title: "Booking confirmed!", message: `Your ${service} booking on ${date} has been confirmed.` },
    Assigned: { title: "Provider assigned!", message: `A service provider has been assigned to your ${service} on ${date}.` },
    "En Route": { title: "Provider on the way!", message: `Your provider is heading to your location for the ${service} service.` },
    "In Progress": { title: "Detailing in progress!", message: `Your ${service} is now being carried out. Sit tight!` },
    "Completion Pending": { title: "Service done!", message: `Your ${service} has been completed and is awaiting final confirmation. We'll notify you shortly.` },
    Completed: { title: "Service confirmed complete!", message: `Your ${service} has been confirmed as completed. Thank you! Please leave a review.` },
    Cancelled: { title: "Booking cancelled", message: `Your ${service} booking on ${date} has been cancelled.` },
    "Issue/Delayed": { title: "Service update", message: `There's an issue or delay with your ${service} booking. Our team is looking into it.` },
  } as Record<string, { title: string; message: string }>)[status];
}
