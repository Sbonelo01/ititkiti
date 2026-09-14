import {
  computeBuyerServiceFeeZar,
  roundZar,
  zarToKobo,
} from "@/constants/pricing";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import type { TicketSelection } from "@/server/payments/finalizePurchase";

export async function computeExpectedAmountKobo(
  eventId: string,
  ticketSelections?: TicketSelection[],
  quantity?: number
): Promise<{ amountKobo: number; currency: string } | { error: string; status: number }> {
  const supabase = getSupabaseAdmin();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, price")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { error: "Event not found", status: 404 };
  }

  const hasSelections = Array.isArray(ticketSelections) && ticketSelections.length > 0;
  let subtotal = 0;
  let serviceFee = 0;

  if (hasSelections) {
    const ids = ticketSelections.map((s) => s.ticketTypeId);
    const { data: types, error: typesError } = await supabase
      .from("ticket_types")
      .select("id, price")
      .eq("event_id", eventId)
      .in("id", ids);

    if (typesError || !types?.length) {
      return { error: "Ticket type not found", status: 404 };
    }

    const priceById = new Map(types.map((t) => [t.id, Number(t.price) || 0]));
    for (const sel of ticketSelections) {
      const price = priceById.get(sel.ticketTypeId);
      if (price === undefined) {
        return { error: "Ticket type not found", status: 404 };
      }
      subtotal += price * sel.quantity;
      serviceFee += computeBuyerServiceFeeZar(price) * sel.quantity;
    }
  } else {
    const qty = quantity ?? 0;
    if (qty < 1) {
      return { error: "Missing ticket selections or quantity", status: 400 };
    }
    const unitPrice = Number(event.price) || 0;
    subtotal = unitPrice * qty;
    serviceFee = computeBuyerServiceFeeZar(unitPrice) * qty;
  }

  const totalZar = roundZar(subtotal + serviceFee);
  const amountKobo = zarToKobo(totalZar);

  return { amountKobo, currency: "ZAR" };
}
