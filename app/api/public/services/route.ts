import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data: services, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error || !services) {
    return NextResponse.json({ services: [], popularServiceName: null });
  }

  // Count completed/confirmed bookings per service to find most popular
  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select("service_name");

  let popularServiceName: string | null = null;
  if (bookings && bookings.length > 0) {
    const counts: Record<string, number> = {};
    for (const b of bookings) {
      if (b.service_name) {
        counts[b.service_name] = (counts[b.service_name] || 0) + 1;
      }
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) popularServiceName = top[0];
  }

  return NextResponse.json({ services, popularServiceName });
}
