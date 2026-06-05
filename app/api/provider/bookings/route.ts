import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { customerStatusMessage, notifyAdmins, notifyUser, getAdminEmails, getUserEmail } from "@/lib/serverNotifications";
import {
  emailStatusUpdateToCustomer,
  emailCompletionPendingToAdmins,
  emailIssueReportedToAdmins,
} from "@/lib/emailNotifications";

async function requireProvider(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "serviceProvider") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: userData.user, profile };
}

export async function PATCH(request: Request) {
  const auth = await requireProvider(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const id = body.id as string;
  const status = body.status as string;
  const proofUrl = body.proofUrl as string | undefined;

  if (!id || !status) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select("id, booking_id, user_id, customer_name, service_name, scheduled_date, time_slot, assigned_to, assigned_provider_id")
    .eq("id", id)
    .single();

  if (bookingError || !booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const assignedToEmail = String(booking.assigned_to || "").toLowerCase();
  const profileEmail = String(auth.profile.email || "").toLowerCase();
  const isAssignedProvider = booking.assigned_provider_id === auth.user.id || assignedToEmail === profileEmail;
  if (!isAssignedProvider) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updates: Record<string, unknown> = { status };
  if (proofUrl) updates.proof_of_completion_url = proofUrl;

  const { error } = await supabaseAdmin.from("bookings").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const providerName = auth.profile.full_name || booking.assigned_to || "A provider";

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
      message: `${providerName} has completed the ${booking.service_name} job for ${booking.customer_name} on ${booking.scheduled_date}. Please review and confirm.`,
      type: "status",
      bookingId: booking.booking_id,
    });
    await emailCompletionPendingToAdmins(adminEmails, {
      providerName,
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      scheduledDate: booking.scheduled_date,
      bookingId: booking.booking_id,
    });
  }

  if (status === "Issue/Delayed") {
    await notifyAdmins({
      title: "Issue reported on a job",
      message: `${providerName} reported an issue on the ${booking.service_name} job for ${booking.customer_name} on ${booking.scheduled_date}.`,
      type: "status",
      bookingId: booking.booking_id,
    });
    await emailIssueReportedToAdmins(adminEmails, {
      providerName,
      customerName: booking.customer_name,
      serviceName: booking.service_name,
      scheduledDate: booking.scheduled_date,
      bookingId: booking.booking_id,
    });
  }

  return NextResponse.json({ ok: true });
}
