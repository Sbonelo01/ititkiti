import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API endpoint to look up payment information by Paystack reference
 * This helps identify which event a payment is for
 * 
 * Usage: GET /api/payment-lookup?reference=EVT-xxx-xxx-xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const reference = searchParams.get("reference");

    if (!reference) {
      return NextResponse.json(
        { error: "Missing reference parameter" },
        { status: 400 }
      );
    }

    // Extract eventId from reference format: EVT-{eventId}-{userId}-{timestamp}-{random}
    const referenceParts = reference.split("-");
    let eventIdFromReference: string | null = null;
    
    if (referenceParts.length >= 2 && referenceParts[0] === "EVT") {
      eventIdFromReference = referenceParts[1];
    }

    // Find tickets with this reference
    const { data: tickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        event_id,
        attendee_name,
        email,
        paystack_reference,
        created_at,
        payment_status,
        events (
          id,
          title,
          date,
          location,
          organizer_id
        )
      `)
      .eq("paystack_reference", reference)
      .limit(1);

    if (ticketsError) {
      return NextResponse.json(
        { error: "Database error", details: ticketsError.message },
        { status: 500 }
      );
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json(
        {
          error: "Payment not found",
          reference,
          eventIdFromReference,
          note: "If eventId is present in reference, it's the second part after 'EVT-'",
        },
        { status: 404 }
      );
    }

    const ticket = tickets[0];
    // Supabase returns events as an object when using select with join (single relation)
    // Type assertion needed because TypeScript infers it as array
    const event = ticket.events as unknown as {
      id: string;
      title: string;
      date: string;
      location: string;
      organizer_id: string;
    } | null;

    return NextResponse.json({
      success: true,
      reference,
      eventId: ticket.event_id,
      eventIdFromReference,
      event: event
        ? {
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            organizer_id: event.organizer_id,
          }
        : null,
      ticket: {
        id: ticket.id,
        attendee_name: ticket.attendee_name,
        email: ticket.email,
        created_at: ticket.created_at,
        payment_status: ticket.payment_status,
      },
      // Count total tickets for this payment
      totalTickets: tickets.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

