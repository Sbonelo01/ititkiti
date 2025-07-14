import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for DB writes
);

export async function POST(req: NextRequest) {
  try {
    const { reference, eventId, quantity, user } = await req.json();
    if (!reference || !eventId || !quantity || !user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Verify payment with Paystack
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data.status !== "success") {
      return NextResponse.json({ error: "Payment verification failed", details: verifyData }, { status: 400 });
    }

    // 2. Decrement tickets atomically (using RPC or direct update)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('total_tickets, price')
      .eq('id', eventId)
      .single();
    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.total_tickets < quantity) {
      return NextResponse.json({ error: "Not enough tickets available" }, { status: 400 });
    }
    // Decrement tickets
    const { error: updateError } = await supabase
      .from('events')
      .update({ total_tickets: event.total_tickets - quantity })
      .eq('id', eventId);
    if (updateError) {
      return NextResponse.json({ error: "Failed to decrement tickets" }, { status: 500 });
    }

    // 3. Create ticket records
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      tickets.push({
        event_id: eventId,
        attendee_name: user.name || user.email?.split('@')[0] || 'Attendee',
        email: user.email,
        qr_code_data: `TICKET-${eventId}-${user.userId}-${Date.now()}-${i}`,
        used: false,
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        paystack_reference: reference,
      });
    }
    const { error: ticketError } = await supabase
      .from('tickets')
      .insert(tickets);
    if (ticketError) {
      return NextResponse.json({ error: "Failed to create tickets" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
} 