import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type PaymentReceiptPayload = {
  quantity?: number;
  ticket_selections?: { quantity?: number }[];
};

/**
 * API endpoint to look up payment information by Paystack reference
 * Looks up public.payment_receipts first (authoritative for reference); tickets may omit paystack_reference.
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

    const referenceParts = reference.split("-");
    let eventIdFromReference: string | null = null;
    if (referenceParts.length >= 2 && referenceParts[0] === "EVT") {
      eventIdFromReference = referenceParts[1];
    }

    const { data: receipt, error: receiptError } = await supabase
      .from("payment_receipts")
      .select(`
        id,
        reference,
        event_id,
        email,
        payload,
        created_at,
        events (
          id,
          title,
          date,
          location,
          organizer_id
        )
      `)
      .eq("reference", reference)
      .maybeSingle();

    if (receiptError) {
      return NextResponse.json(
        { error: "Database error", details: receiptError.message },
        { status: 500 }
      );
    }

    if (!receipt) {
      return NextResponse.json(
        {
          error: "Payment not found",
          reference,
          eventIdFromReference,
          note: "Lookups use payment_receipts. If eventId is present in the reference, it's the part after 'EVT-'.",
        },
        { status: 404 }
      );
    }

    const payload = (receipt.payload || {}) as PaymentReceiptPayload;
    let totalFromPayload: number | undefined = payload.quantity;
    if (totalFromPayload == null && Array.isArray(payload.ticket_selections)) {
      totalFromPayload = payload.ticket_selections.reduce(
        (s, row) => s + (Number(row?.quantity) || 0),
        0
      );
    }

    const { data: relatedTickets, error: ticketsError } = await supabase
      .from("tickets")
      .select(`
        id,
        event_id,
        attendee_name,
        email,
        created_at,
        payment_status
      `)
      .eq("event_id", receipt.event_id)
      .eq("email", receipt.email)
      .gte("created_at", receipt.created_at)
      .order("created_at", { ascending: true });

    if (ticketsError) {
      return NextResponse.json(
        { error: "Database error", details: ticketsError.message },
        { status: 500 }
      );
    }

    const list = relatedTickets || [];
    const first = list[0];
    const totalTickets =
      totalFromPayload && totalFromPayload > 0 ? totalFromPayload : list.length;

    const event = receipt.events as unknown as {
      id: string;
      title: string;
      date: string;
      location: string;
      organizer_id: string;
    } | null;

    return NextResponse.json({
      success: true,
      reference,
      eventId: receipt.event_id,
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
      ticket: first
        ? {
            id: first.id,
            attendee_name: first.attendee_name,
            email: first.email,
            created_at: first.created_at,
            payment_status: first.payment_status,
          }
        : null,
      totalTickets,
      source: "payment_receipts",
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
