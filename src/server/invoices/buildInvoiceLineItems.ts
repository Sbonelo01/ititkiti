import { SERVICE_FEE_PER_TICKET } from "@/constants/pricing";
import type { InvoiceLineItems, InvoicePurchaseLine, InvoiceTicketTypeLine } from "@/server/invoices/types";

export type RawInvoiceTicket = {
  id: string;
  ticket_type_id: string | null;
  paystack_reference: string | null;
  created_at: string;
  email: string;
  ticket_types: { id: string; name: string; price: number } | { id: string; name: string; price: number }[] | null;
};

type BuildArgs = {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    price: number;
  };
  tickets: RawInvoiceTicket[];
  serviceFeePerTicket?: number;
};

function ticketUnitPrice(ticket: RawInvoiceTicket, eventFallbackPrice: number): number {
  const tt = ticket.ticket_types;
  if (Array.isArray(tt) && tt.length > 0) {
    return Number(tt[0]?.price) || 0;
  }
  if (tt && typeof tt === "object" && "price" in tt) {
    return Number(tt.price) || 0;
  }
  return Number(eventFallbackPrice) || 0;
}

function ticketTypeName(ticket: RawInvoiceTicket): string {
  const tt = ticket.ticket_types;
  if (Array.isArray(tt) && tt.length > 0 && tt[0]?.name) {
    return tt[0].name;
  }
  if (tt && typeof tt === "object" && "name" in tt && tt.name) {
    return tt.name;
  }
  return "General";
}

export function buildInvoiceLineItems({
  event,
  tickets,
  serviceFeePerTicket = SERVICE_FEE_PER_TICKET,
}: BuildArgs): InvoiceLineItems {
  const feePerTicket = serviceFeePerTicket;

  const byTypeMap = new Map<string, InvoiceTicketTypeLine>();
  const purchaseMap = new Map<string, InvoicePurchaseLine>();

  let ticketRevenue = 0;

  for (const ticket of tickets) {
    const unitPrice = ticketUnitPrice(ticket, event.price);
    const typeKey = ticket.ticket_type_id ?? "default";
    const typeName = ticketTypeName(ticket);

    ticketRevenue += unitPrice;

    const existingType = byTypeMap.get(typeKey);
    if (existingType) {
      existingType.quantity += 1;
      existingType.lineTotal += unitPrice;
    } else {
      byTypeMap.set(typeKey, {
        ticketTypeId: ticket.ticket_type_id,
        name: typeName,
        unitPrice,
        quantity: 1,
        lineTotal: unitPrice,
      });
    }

    const refKey = ticket.paystack_reference ?? `ticket-${ticket.id}`;
    const existingPurchase = purchaseMap.get(refKey);
    if (existingPurchase) {
      existingPurchase.ticketCount += 1;
      existingPurchase.ticketRevenue += unitPrice;
      existingPurchase.serviceFee += feePerTicket;
      existingPurchase.ticketIds.push(ticket.id);
    } else {
      purchaseMap.set(refKey, {
        paystackReference: ticket.paystack_reference,
        purchasedAt: ticket.created_at,
        buyerEmail: ticket.email,
        ticketCount: 1,
        ticketRevenue: unitPrice,
        serviceFee: feePerTicket,
        ticketIds: [ticket.id],
      });
    }
  }

  const ticketCount = tickets.length;
  const serviceFeeTotal = ticketCount * feePerTicket;
  const netAmountDueToOrganizer = ticketRevenue - serviceFeeTotal;

  const byTicketType = [...byTypeMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  const byPurchase = [...purchaseMap.values()].sort(
    (a, b) => new Date(a.purchasedAt).getTime() - new Date(b.purchasedAt).getTime()
  );

  // Integrity check — totals must match line aggregation
  const typeSum = byTicketType.reduce((s, row) => s + row.lineTotal, 0);
  const purchaseSum = byPurchase.reduce((s, row) => s + row.ticketRevenue, 0);
  if (Math.abs(typeSum - ticketRevenue) > 0.001 || Math.abs(purchaseSum - ticketRevenue) > 0.001) {
    throw new Error("Invoice totals failed integrity check");
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
    },
    byTicketType,
    byPurchase,
    serviceFeePerTicket: feePerTicket,
    totals: {
      ticketCount,
      ticketRevenue: roundMoney(ticketRevenue),
      serviceFeeTotal: roundMoney(serviceFeeTotal),
      netAmountDueToOrganizer: roundMoney(netAmountDueToOrganizer),
    },
  };
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
