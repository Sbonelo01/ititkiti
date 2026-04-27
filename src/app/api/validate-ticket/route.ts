import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { applyRateLimit } from "@/utils/rateLimit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "validate-ticket",
    windowMs: 60_000,
    maxRequests: 90,
  });
  if (rateLimited) return rateLimited;

  // Server-side admin/staff check (supports bearer token + legacy cookie)
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;
  const cookieStore = await cookies();
  const cookieToken =
    cookieStore.get("sb-access-token")?.value ||
    cookieStore.get("sb-access-token.0")?.value;
  const access_token = bearerToken || cookieToken;
  if (!access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabase.auth.getUser(access_token);
  const userRole = user?.user_metadata?.role;
  if (!user || (userRole !== "admin" && userRole !== "staff")) {
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
      return NextResponse.json({ 
        success: false, 
        error: "Ticket not found or invalid",
        status: "not_found"
      }, { status: 404 });
    }

    // Check if ticket is already used
    if (ticket.used) {
      return NextResponse.json({ 
        success: false, 
        error: "Ticket has already been used",
        status: "already_used",
        ticket 
      }, { status: 200 });
    }

    // Mark ticket as used
    const { error: updateError } = await supabase
      .from("tickets")
      .update({ used: true })
      .eq("id", ticket.id);
    
    if (updateError) {
      return NextResponse.json({ 
        success: false, 
        error: "Failed to mark ticket as used",
        status: "error"
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      status: "valid",
      ticket: { ...ticket, used: true }
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
} 