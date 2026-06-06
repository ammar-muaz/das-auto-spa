import { NextResponse } from "next/server";
import { emailWelcomeToCustomer } from "@/lib/emailNotifications";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, fullName } = body;

  if (!email || !fullName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await emailWelcomeToCustomer(email, fullName);
  return NextResponse.json({ ok: true });
}
