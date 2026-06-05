import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [bookingsResult, providersResult, leavesResult] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id, booking_id, customer_name, service_name, scheduled_date, time_slot, car_details, amount, status, payment_status, assigned_to")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "serviceProvider"),
    supabaseAdmin
      .from("leave_requests")
      .select("provider_id, date, status")
      .eq("status", "Approved"),
  ]);

  if (bookingsResult.error) {
    return NextResponse.json({ error: bookingsResult.error.message }, { status: 500 });
  }
  if (providersResult.error) {
    return NextResponse.json({ error: providersResult.error.message }, { status: 500 });
  }
  if (leavesResult.error) {
    return NextResponse.json({ error: leavesResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    bookings: bookingsResult.data ?? [],
    providers: providersResult.data ?? [],
    leaves: leavesResult.data ?? [],
  });
}
