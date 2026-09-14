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
