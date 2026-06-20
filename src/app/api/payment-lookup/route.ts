import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/utils/rateLimit";
import { extractBearerToken, requireStaffAuth } from "@/server/auth/staffAuth";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import { extractEventIdFromReference } from "@/utils/paystackChargeMetadata";

type PaymentReceiptPayload = {
  quantity?: number;
  ticket_selections?: { quantity?: number }[];
};

/**
 * Authenticated payment lookup by Paystack reference.
 * Allowed: staff/admin, event organizer, or purchaser (email matches receipt).
 */
export async function GET(req: NextRequest) {
  const rateLimited = applyRateLimit(req, {
    keyPrefix: "payment-lookup",
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (rateLimited) return rateLimited;

  const accessToken = extractBearerToken(req.headers.get("authorization"));
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ error: "Missing reference parameter" }, { status: 400 });
    }

    const eventIdFromReference = extractEventIdFromReference(reference);

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
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!receipt) {
      return NextResponse.json({ error: "Payment not found", reference }, { status: 404 });
    }

    const event = receipt.events as unknown as {
      id: string;
      title: string;
      date: string;
      location: string;
      organizer_id: string;
    } | null;

    const staffAuth = await requireStaffAuth(accessToken);
    const isStaff = staffAuth.ok;
    const isOrganizer = event?.organizer_id === user.id;
    const isPurchaser = receipt.email?.toLowerCase() === user.email.toLowerCase();

    if (!isStaff && !isOrganizer && !isPurchaser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const list = relatedTickets || [];
    const first = list[0];
    const totalTickets =
      totalFromPayload && totalFromPayload > 0 ? totalFromPayload : list.length;

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
