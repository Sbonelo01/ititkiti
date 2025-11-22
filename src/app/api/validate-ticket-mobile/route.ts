import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { qr_code_data, api_key } = await req.json();
    
    if (!qr_code_data) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing QR code data",
        status: "error"
      }, { status: 400 });
    }

    // Optional: Add API key authentication for mobile apps
    // You can set this in your environment variables
    const MOBILE_API_KEY = process.env.MOBILE_API_KEY;
    if (MOBILE_API_KEY && api_key !== MOBILE_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid API key",
        status: "unauthorized"
      }, { status: 401 });
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
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error", 
      status: "error",
      details: error 
    }, { status: 500 });
  }
}


