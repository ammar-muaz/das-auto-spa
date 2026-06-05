import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyUser, notifyAdmins, getAdminEmails } from "@/lib/serverNotifications";
import { emailReviewToProvider, emailReviewToAdmins } from "@/lib/emailNotifications";

async function requireUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user: data.user };
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const { bookingId, rating, comment } = body;

  if (!bookingId || !rating) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_id, customer_name, service_name, scheduled_date, assigned_to, assigned_provider_id")
    .eq("id", bookingId)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("reviews").insert({
    booking_id: bookingId,
    user_id: auth.user.id,
    rating,
    comment: comment || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

  await Promise.all([
    notifyAdmins({
      title: "New review received",
      message: `${booking.customer_name} left a ${rating}/5 ${stars} review for ${booking.service_name} on ${booking.scheduled_date}.`,
      type: "review",
      bookingId: booking.booking_id,
    }),
    booking.assigned_provider_id ? notifyUser({
      userId: booking.assigned_provider_id,
      title: "New review on your job!",
      message: `${booking.customer_name} rated your ${booking.service_name} service ${rating}/5 ${stars}.${comment ? ` "${comment}"` : ""}`,
      type: "review",
      bookingId: booking.booking_id,
    }) : Promise.resolve(),
  ]);

  const adminEmails = await getAdminEmails();

  await Promise.all([
    booking.assigned_to ? emailReviewToProvider(booking.assigned_to, {
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      scheduledDate: booking.scheduled_date,
      rating,
      comment: comment || null,
    }) : Promise.resolve(),
    emailReviewToAdmins(adminEmails, {
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      scheduledDate: booking.scheduled_date,
      rating,
      comment: comment || null,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
