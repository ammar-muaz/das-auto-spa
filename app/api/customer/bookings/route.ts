import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyAdmins, notifyUser, getAdminEmails } from "@/lib/serverNotifications";
import {
  emailNewBookingToAdmins,
  emailBookingConfirmation,
  emailPaymentPendingToCustomer,
  emailPendingPaymentToAdmins,
} from "@/lib/emailNotifications";

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
  const user = auth.user;

  const bookingId = `CW${Date.now().toString().slice(-8)}`;
  const customerName = user.user_metadata?.full_name || body.customerName || "Customer";
  const isOnlineBanking = body.paymentMethod === "online_banking";

  const payload = {
    booking_id: bookingId,
    user_id: user.id,
    customer_name: customerName,
    service_name: body.serviceName,
    scheduled_date: body.scheduledDate,
    time_slot: body.timeSlot,
    address: body.address,
    car_details: body.carDetails,
    amount: body.amount,
    status: "Confirmed",
    payment_method: body.paymentMethod,
    payment_status: isOnlineBanking ? "Pending Verification" : body.paymentMethod === "cash" ? "Pending" : "Paid",
    payment_receipt_url: body.paymentReceiptUrl || null,
    ai_dirt_level: body.aiDirtLevel || null,
    ai_image_url: body.aiImageUrl || null,
  };

  const { data, error } = await supabaseAdmin.from("bookings").insert(payload).select().single();
  if (error || !data) return NextResponse.json({ error: error?.message || "Failed to create booking" }, { status: 500 });

  const adminEmails = await getAdminEmails();
  const customerEmail = user.email!;

  if (isOnlineBanking) {
    await Promise.all([
      notifyUser({
        userId: user.id,
        title: "Booking received — payment under review",
        message: `Your ${payload.service_name} booking on ${payload.scheduled_date} has been received. We're verifying your payment receipt.`,
        type: "booking",
        bookingId,
      }),
      notifyAdmins({
        title: "New booking — payment verification required",
        message: `${customerName} booked ${payload.service_name} on ${payload.scheduled_date} via online banking. Please verify the payment receipt.`,
        type: "booking",
        bookingId,
      }),
      emailPaymentPendingToCustomer(customerEmail, {
        customerName,
        serviceName: payload.service_name,
        scheduledDate: payload.scheduled_date,
        timeSlot: payload.time_slot,
        bookingId,
        amount: payload.amount,
      }),
      emailPendingPaymentToAdmins(adminEmails, {
        customerName,
        serviceName: payload.service_name,
        scheduledDate: payload.scheduled_date,
        timeSlot: payload.time_slot,
        bookingId,
        amount: payload.amount,
      }),
    ]);
  } else {
    await Promise.all([
      notifyUser({
        userId: user.id,
        title: "Booking confirmed!",
        message: `Your ${payload.service_name} booking on ${payload.scheduled_date} at ${payload.time_slot} has been confirmed.`,
        type: "booking",
        bookingId,
      }),
      notifyAdmins({
        title: "New booking received",
        message: `${customerName} booked ${payload.service_name} on ${payload.scheduled_date} at ${payload.time_slot}.`,
        type: "booking",
        bookingId,
      }),
      emailBookingConfirmation(customerEmail, {
        customerName,
        serviceName: payload.service_name,
        scheduledDate: payload.scheduled_date,
        timeSlot: payload.time_slot,
        address: payload.address,
        bookingId,
        amount: payload.amount,
      }),
      emailNewBookingToAdmins(adminEmails, {
        customerName,
        serviceName: payload.service_name,
        scheduledDate: payload.scheduled_date,
        timeSlot: payload.time_slot,
        bookingId,
        amount: payload.amount,
      }),
    ]);
  }

  return NextResponse.json({ booking: data });
}
