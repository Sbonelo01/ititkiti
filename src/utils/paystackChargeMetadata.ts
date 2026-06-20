import { SERVICE_FEE_PER_TICKET } from "@/constants/pricing";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import type { TicketSelection } from "@/server/payments/finalizePurchase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function buildPaystackReference(eventId: string, userId: string): string {
  return `EVT_${eventId}_${userId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function extractEventIdFromReference(reference: string): string | null {
  if (!reference) return null;

  const newFormat = reference.match(
    /^EVT_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_/i
  );
  if (newFormat) return newFormat[1];

  const legacyUuid = reference.match(
    /^EVT-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i
  );
  if (legacyUuid) return legacyUuid[1];

  const parts = reference.split("-");
  if (parts.length >= 2 && parts[0] === "EVT") {
    const candidate = parts[1];
    if (UUID_REGEX.test(candidate)) return candidate;
    return candidate;
  }

  return null;
}

export function normalizePaystackTicketSelections(value: unknown): TicketSelection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const ticketTypeId = typeof item?.ticketTypeId === "string" ? item.ticketTypeId : null;
      const quantity = Number(item?.quantity);
      if (!ticketTypeId || ticketTypeId === "default" || !Number.isFinite(quantity) || quantity < 1) {
        return null;
      }
      return { ticketTypeId, quantity };
    })
    .filter((v): v is TicketSelection => Boolean(v));
}

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
  let totalQuantity = 0;

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
      totalQuantity += sel.quantity;
    }
  } else {
    const qty = quantity ?? 0;
    if (qty < 1) {
      return { error: "Missing ticket selections or quantity", status: 400 };
    }
    subtotal = (Number(event.price) || 0) * qty;
    totalQuantity = qty;
  }

  const serviceFee = SERVICE_FEE_PER_TICKET * totalQuantity;
  const totalZar = subtotal + serviceFee;
  const amountKobo = Math.round(totalZar * 100);

  return { amountKobo, currency: "ZAR" };
}
