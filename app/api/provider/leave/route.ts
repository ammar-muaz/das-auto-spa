import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyAdmins, getAdminEmails } from "@/lib/serverNotifications";
import { emailLeaveRequestToAdmins } from "@/lib/emailNotifications";

async function requireProvider(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", userData.user.id)
    .single();

  if (profileError || profile?.role !== "serviceProvider") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user: userData.user, profile };
}

export async function POST(request: Request) {
  const auth = await requireProvider(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const leaveDate = body.date as string;
  const reason = body.reason as string;
  const notes = body.notes as string | null | undefined;
  if (!leaveDate || !reason) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const providerName = auth.profile.full_name || "Provider";
  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .insert({
      provider_id: auth.user.id,
      provider_name: providerName,
      date: leaveDate,
      reason,
      notes: notes || null,
      status: "Pending",
    })
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Failed to submit leave request" }, { status: 500 });

  const adminEmails = await getAdminEmails();

  await Promise.all([
    notifyAdmins({
      title: "New leave request",
      message: `${providerName} has requested ${reason} on ${new Date(leaveDate + "T00:00:00").toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}.`,
      type: "leave",
    }),
    emailLeaveRequestToAdmins(adminEmails, {
      providerName,
      date: leaveDate,
      reason,
      notes: notes || null,
    }),
  ]);

  return NextResponse.json({ request: data });
}
