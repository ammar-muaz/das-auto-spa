import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyAdmins, notifyUser, getAdminEmails } from "@/lib/serverNotifications";
import {
  emailNewBookingToAdmins,
  emailBookingConfirmation,
  emailPaymentPendingToCustomer,
  emailPendingPaymentToAdmins,
  emailRescheduleToCustomer,
  emailRescheduleToAdmins,
  emailCancellationToCustomer,
  emailCancellationToAdmins,
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
    payment_status: isOnlineBanking ? "Pending Verification" : "Pending",
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

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const { id, newDate, newTimeSlot } = body;

  if (!id || !newDate || !newTimeSlot) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_id, user_id, customer_name, service_name, scheduled_date, time_slot")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ scheduled_date: newDate, time_slot: newTimeSlot })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const oldDate = booking.scheduled_date;
  const oldTimeSlot = booking.time_slot;
  const adminEmails = await getAdminEmails();
  const customerEmail = auth.user.email!;

  await Promise.all([
    notifyUser({
      userId: auth.user.id,
      title: "Booking rescheduled",
      message: `Your ${booking.service_name} booking has been rescheduled to ${newDate} at ${newTimeSlot}.`,
      type: "booking",
      bookingId: booking.booking_id,
    }),
    notifyAdmins({
      title: "Booking rescheduled by customer",
      message: `${booking.customer_name} rescheduled their ${booking.service_name} booking from ${oldDate} ${oldTimeSlot} to ${newDate} at ${newTimeSlot}.`,
      type: "booking",
      bookingId: booking.booking_id,
    }),
    emailRescheduleToCustomer(customerEmail, {
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      oldDate,
      oldTimeSlot,
      newDate,
      newTimeSlot,
      bookingId: booking.booking_id,
    }),
    emailRescheduleToAdmins(adminEmails, {
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      oldDate,
      oldTimeSlot,
      newDate,
      newTimeSlot,
      bookingId: booking.booking_id,
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireUser(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_id, user_id, customer_name, service_name, scheduled_date, time_slot, payment_status")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const needsRefund = ["Pending Verification", "Paid"].includes(booking.payment_status);
  const updatePayload: Record<string, string> = { status: "Cancelled" };
  if (needsRefund) updatePayload.payment_status = "Refund Required";

  const { error } = await supabaseAdmin.from("bookings").update(updatePayload).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const adminEmails = await getAdminEmails();
  const customerEmail = auth.user.email!;

  await Promise.all([
    notifyUser({
      userId: auth.user.id,
      title: "Booking cancelled",
      message: `Your ${booking.service_name} booking on ${booking.scheduled_date} has been cancelled.${needsRefund ? " A refund will be processed shortly." : ""}`,
      type: "booking",
      bookingId: booking.booking_id,
    }),
    notifyAdmins({
      title: `Booking cancelled${needsRefund ? " — Refund Required" : ""}`,
      message: `${booking.customer_name} cancelled their ${booking.service_name} booking on ${booking.scheduled_date} at ${booking.time_slot}.${needsRefund ? " Refund required." : ""}`,
      type: "booking",
      bookingId: booking.booking_id,
    }),
    emailCancellationToCustomer(customerEmail, {
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      scheduledDate: booking.scheduled_date,
      timeSlot: booking.time_slot,
      bookingId: booking.booking_id,
      needsRefund,
    }),
    emailCancellationToAdmins(adminEmails, {
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      scheduledDate: booking.scheduled_date,
      timeSlot: booking.time_slot,
      bookingId: booking.booking_id,
      needsRefund,
    }),
  ]);

  return NextResponse.json({ ok: true, needsRefund });
}
