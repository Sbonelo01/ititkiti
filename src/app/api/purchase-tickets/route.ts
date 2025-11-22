import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { reference, eventId, ticketSelections, quantity, user: ticketUser } = await req.json();
    
    // Support both new format (ticketSelections) and old format (quantity) for backward compatibility
    const isNewFormat = ticketSelections && Array.isArray(ticketSelections);
    
    if (!reference || !eventId || !ticketUser) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!isNewFormat && !quantity) {
      return NextResponse.json({ error: "Missing ticket selections or quantity" }, { status: 400 });
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

    // 2. Handle ticket types if using new format
    if (isNewFormat) {
      // Validate and decrement ticket types
      for (const selection of ticketSelections) {
        const { ticketTypeId, quantity: qty } = selection;
        
        // Get ticket type info
        const { data: ticketType, error: ticketTypeError } = await supabase
          .from('ticket_types')
          .select('available_quantity, quantity')
          .eq('id', ticketTypeId)
          .single();
        
        if (ticketTypeError || !ticketType) {
          return NextResponse.json({ error: `Ticket type ${ticketTypeId} not found` }, { status: 404 });
        }
        
        if (ticketType.available_quantity < qty) {
          return NextResponse.json({ 
            error: `Not enough tickets available for ticket type ${ticketTypeId}` 
          }, { status: 400 });
        }
        
        // Decrement available quantity
        const { error: updateError } = await supabase
          .from('ticket_types')
          .update({ available_quantity: ticketType.available_quantity - qty })
          .eq('id', ticketTypeId);
        
        if (updateError) {
          return NextResponse.json({ error: "Failed to update ticket availability" }, { status: 500 });
        }
      }
      
      // Update event total_tickets for backward compatibility
      const totalQuantity = ticketSelections.reduce((sum: number, sel: any) => sum + sel.quantity, 0);
      const { data: event } = await supabase
        .from('events')
        .select('total_tickets')
        .eq('id', eventId)
        .single();
      
      if (event) {
        await supabase
          .from('events')
          .update({ total_tickets: event.total_tickets - totalQuantity })
          .eq('id', eventId);
      }
      
      // 3. Create ticket records with ticket type information
      const tickets = [];
      let ticketIndex = 0;
      for (const selection of ticketSelections) {
        const { ticketTypeId, quantity: qty } = selection;
        for (let i = 0; i < qty; i++) {
          tickets.push({
            event_id: eventId,
            ticket_type_id: ticketTypeId,
            attendee_name: ticketUser.name || ticketUser.email?.split('@')[0] || 'Attendee',
            email: ticketUser.email,
            qr_code_data: `TICKET-${eventId}-${ticketUser.userId}-${Date.now()}-${ticketIndex}`,
            used: false,
            payment_status: 'paid',
            created_at: new Date().toISOString(),
            paystack_reference: reference,
          });
          ticketIndex++;
        }
      }
      
      const { error: ticketError } = await supabase
        .from('tickets')
        .insert(tickets);
      
      if (ticketError) {
        return NextResponse.json({ error: "Failed to create tickets" }, { status: 500 });
      }
    } else {
      // Old format - backward compatibility
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
      
      // Create ticket records (old format - no ticket_type_id)
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        tickets.push({
          event_id: eventId,
          attendee_name: ticketUser.name || ticketUser.email?.split('@')[0] || 'Attendee',
          email: ticketUser.email,
          qr_code_data: `TICKET-${eventId}-${ticketUser.userId}-${Date.now()}-${i}`,
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
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
} 