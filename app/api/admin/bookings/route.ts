import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { customerStatusMessage, notifyAdmins, notifyUser, getAdminEmails, getUserEmail } from "@/lib/serverNotifications";
import {
  emailStatusUpdateToCustomer,
  emailCompletionPendingToAdmins,
  emailIssueReportedToAdmins,
  emailProviderAssignedToCustomer,
  emailJobAssignedToProvider,
  emailPaymentVerifiedToCustomer,
  emailRefundProcessedToCustomer,
} from "@/lib/emailNotifications";

async function requireAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user: userData.user };
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const [bookingsResult, providersResult, leavesResult] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id, booking_id, customer_name, service_name, scheduled_date, time_slot, address, amount, status, payment_status, payment_method, assigned_to, payment_receipt_url")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "serviceProvider"),
    supabaseAdmin
      .from("leave_requests")
      .select("provider_id, date")
      .eq("status", "Approved"),
  ]);

  if (bookingsResult.error) return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 });
  if (providersResult.error) return NextResponse.json({ error: providersResult.error.message }, { status: 500 });
  if (leavesResult.error) return NextResponse.json({ error: leavesResult.error.message }, { status: 500 });

  return NextResponse.json({
    bookings: bookingsResult.data ?? [],
    providers: providersResult.data ?? [],
    leaves: leavesResult.data ?? [],
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const action = body.action as string;

  if (action === "updateStatus") {
    const { id, status, paymentStatus } = body;
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_id, user_id, customer_name, service_name, scheduled_date, time_slot, assigned_to")
      .eq("id", id)
      .single();

    const updates: Record<string, unknown> = { status };
    if (status === "Cancelled" && paymentStatus === "Paid") updates.payment_status = "Refund Required";
    const { error } = await supabaseAdmin.from("bookings").update(updates).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (booking?.user_id) {
      const customerMsg = customerStatusMessage(status, booking);
      if (customerMsg) {
        await notifyUser({ userId: booking.user_id, ...customerMsg, type: "status", bookingId: booking.booking_id });
      }

      const [customerEmail, adminEmails] = await Promise.all([
        getUserEmail(booking.user_id),
        status === "Completion Pending" || status === "Issue/Delayed" ? getAdminEmails() : Promise.resolve([]),
      ]);

      if (customerEmail) {
        await emailStatusUpdateToCustomer(customerEmail, status, {
          customerName: booking.customer_name,
          serviceName: booking.service_name,
          scheduledDate: booking.scheduled_date,
          bookingId: booking.booking_id,
        });
      }

      if (status === "Completion Pending") {
        await notifyAdmins({
          title: "Job completed - awaiting confirmation",
          message: `${booking.assigned_to || "A provider"} has completed the ${booking.service_name} job for ${booking.customer_name} on ${booking.scheduled_date}. Please review and confirm.`,
          type: "status",
          bookingId: booking.booking_id,
        });
        await emailCompletionPendingToAdmins(adminEmails, {
          providerName: booking.assigned_to || "A provider",
          customerName: booking.customer_name,
          serviceName: booking.service_name,
          scheduledDate: booking.scheduled_date,
          bookingId: booking.booking_id,
        });
      }

      if (status === "Issue/Delayed") {
        await notifyAdmins({
          title: "Issue reported on a job",
          message: `${booking.assigned_to || "A provider"} reported an issue on the ${booking.service_name} job for ${booking.customer_name} on ${booking.scheduled_date}.`,
          type: "status",
          bookingId: booking.booking_id,
        });
        await emailIssueReportedToAdmins(adminEmails, {
          providerName: booking.assigned_to || "A provider",
          customerName: booking.customer_name,
          serviceName: booking.service_name,
          scheduledDate: booking.scheduled_date,
          bookingId: booking.booking_id,
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "assignProvider") {
    const id = body.id as string;
    const normalizedEmail = String(body.providerEmail || "").trim().toLowerCase();
    let providerProfileId: string | null = null;
    if (normalizedEmail) {
      const { data, error } = await supabaseAdmin.from("profiles").select("id").eq("email", normalizedEmail).single();
      if (error || !data) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
      providerProfileId = data.id;
    }

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_id, user_id, customer_name, service_name, scheduled_date, time_slot, address")
      .eq("id", id)
      .single();

    const status = normalizedEmail ? "Assigned" : "Pending";
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ assigned_to: normalizedEmail || null, assigned_provider_id: providerProfileId, status })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (booking && normalizedEmail && providerProfileId) {
      const customerEmail = await getUserEmail(booking.user_id);

      await Promise.all([
        notifyUser({
          userId: booking.user_id,
          title: "Provider assigned!",
          message: `A provider has been assigned to your ${booking.service_name} booking on ${booking.scheduled_date} at ${booking.time_slot}.`,
          type: "assignment",
          bookingId: booking.booking_id,
        }),
        notifyUser({
          userId: providerProfileId,
          title: "New job assigned!",
          message: `You've been assigned to ${booking.service_name} for ${booking.customer_name} on ${booking.scheduled_date} at ${booking.time_slot}.`,
          type: "assignment",
          bookingId: booking.booking_id,
        }),
      ]);

      await Promise.all([
        customerEmail ? emailProviderAssignedToCustomer(customerEmail, {
          customerName: booking.customer_name,
          serviceName: booking.service_name,
          scheduledDate: booking.scheduled_date,
          timeSlot: booking.time_slot,
        }) : Promise.resolve(),
        emailJobAssignedToProvider(normalizedEmail, {
          customerName: booking.customer_name,
          serviceName: booking.service_name,
          scheduledDate: booking.scheduled_date,
          timeSlot: booking.time_slot,
          address: booking.address,
          bookingId: booking.booking_id,
        }),
      ]);
    }

    return NextResponse.json({ ok: true, status, assignedTo: normalizedEmail || null });
  }

  if (action === "paymentStatus") {
    const { id, paymentStatus } = body;
    const { error } = await supabaseAdmin.from("bookings").update({ payment_status: paymentStatus }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (paymentStatus === "Refunded") {
      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("booking_id, user_id, customer_name, service_name, scheduled_date")
        .eq("id", id)
        .single();

      if (booking) {
        const customerEmail = await getUserEmail(booking.user_id);
        await Promise.all([
          notifyUser({
            userId: booking.user_id,
            title: "Refund processed",
            message: `Your refund for the ${booking.service_name} booking on ${booking.scheduled_date} has been processed.`,
            type: "booking",
            bookingId: booking.booking_id,
          }),
          customerEmail && emailRefundProcessedToCustomer(customerEmail, {
            customerName: booking.customer_name,
            serviceName: booking.service_name,
            scheduledDate: booking.scheduled_date,
            bookingId: booking.booking_id,
          }),
        ]);
      }
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "verifyPayment") {
    const { id } = body;
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_id, user_id, customer_name, service_name, scheduled_date, time_slot, amount")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin.from("bookings").update({ payment_status: "Paid" }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (booking?.user_id) {
      const customerEmail = await getUserEmail(booking.user_id);
      await notifyUser({
        userId: booking.user_id,
        title: "Payment verified — booking confirmed!",
        message: `Your payment for the ${booking.service_name} booking on ${booking.scheduled_date} has been verified. You're all set!`,
        type: "booking",
        bookingId: booking.booking_id,
      });
      if (customerEmail) {
        await emailPaymentVerifiedToCustomer(customerEmail, {
          customerName: booking.customer_name,
          serviceName: booking.service_name,
          scheduledDate: booking.scheduled_date,
          timeSlot: booking.time_slot,
          bookingId: booking.booking_id,
          amount: booking.amount,
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
