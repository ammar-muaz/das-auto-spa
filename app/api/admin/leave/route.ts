import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserEmail } from "@/lib/serverNotifications";
import { emailLeaveStatusToProvider } from "@/lib/emailNotifications";

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

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .select("*")
    .order("date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const body = await request.json();
  const id = body.id as string;
  const status = body.status as "Approved" | "Rejected";
  const adminNotes = body.adminNotes as string | undefined;

  if (!id || !["Approved", "Rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === "Rejected") updates.admin_notes = adminNotes || null;

  const { data, error } = await supabaseAdmin
    .from("leave_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.provider_id) {
    const providerEmail = await getUserEmail(data.provider_id);

    await supabaseAdmin.from("notifications").insert({
      user_id: data.provider_id,
      title: status === "Approved" ? "Leave request approved" : "Leave request rejected",
      message:
        status === "Approved"
          ? `Your ${data.reason} request for ${data.date} has been approved.`
          : `Your ${data.reason} request for ${data.date} has been rejected.${adminNotes ? ` Reason: ${adminNotes}` : ""}`,
      type: "leave",
    });

    if (providerEmail) {
      await emailLeaveStatusToProvider(providerEmail, {
        providerName: data.provider_name || "Provider",
        date: data.date,
        reason: data.reason,
        status,
        adminNotes: adminNotes || null,
      });
    }
  }

  return NextResponse.json({ request: data });
}
