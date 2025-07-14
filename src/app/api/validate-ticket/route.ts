import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Server-side admin check
  const cookieStore = await cookies();
  const access_token = cookieStore.get("sb-access-token")?.value;
  if (!access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser(access_token);
  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { qr_code_data } = await req.json();
    if (!qr_code_data) {
      return NextResponse.json({ error: "Missing QR code data" }, { status: 400 });
    }
    const { data: ticket, error } = await supabase
      .from("tickets")
      .select("id, attendee_name, email, used, event_id, created_at")
      .eq("qr_code_data", qr_code_data)
      .eq("payment_status", "paid")
      .single();
    if (error || !ticket) {
      return NextResponse.json({ error: "Ticket not found or invalid" }, { status: 404 });
    }
    // Optionally, mark ticket as used here
    // await supabase.from("tickets").update({ used: true }).eq("id", ticket.id);
    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
} 