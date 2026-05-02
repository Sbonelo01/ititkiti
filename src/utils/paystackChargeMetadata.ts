import type { TicketSelection } from "@/server/payments/finalizePurchase";

export function extractEventIdFromReference(reference: string): string | null {
  const parts = reference.split("-");
  if (parts.length >= 2 && parts[0] === "EVT") {
    return parts[1];
  }
  return null;
}

export function normalizePaystackTicketSelections(value: unknown): TicketSelection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const ticketTypeId = typeof item?.ticketTypeId === "string" ? item.ticketTypeId : null;
      const quantity = Number(item?.quantity);
      if (!ticketTypeId || !Number.isFinite(quantity) || quantity < 1) return null;
      return { ticketTypeId, quantity };
    })
    .filter((v): v is TicketSelection => Boolean(v));
}
