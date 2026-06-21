export type InvoiceTicketTypeLine = {
  ticketTypeId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type InvoicePurchaseLine = {
  paystackReference: string | null;
  purchasedAt: string;
  buyerEmail: string;
  ticketCount: number;
  ticketRevenue: number;
  serviceFee: number;
  ticketIds: string[];
};

export type InvoiceLineItems = {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
  byTicketType: InvoiceTicketTypeLine[];
  byPurchase: InvoicePurchaseLine[];
  serviceFeePerTicket: number;
  totals: {
    ticketCount: number;
    ticketRevenue: number;
    serviceFeeTotal: number;
    netAmountDueToOrganizer: number;
  };
};

export type OrganizerInvoiceRecord = {
  id: string;
  invoice_number: string;
  organizer_id: string;
  event_id: string;
  status: string;
  currency: string;
  ticket_count: number;
  ticket_revenue: number;
  service_fee_per_ticket: number;
  service_fee_total: number;
  net_amount_due: number;
  bill_to: Record<string, unknown>;
  seller: Record<string, unknown>;
  line_items: InvoiceLineItems;
  notes: string | null;
  issued_at: string;
  paid_at: string | null;
  voided_at: string | null;
  created_at: string;
  updated_at: string;
};
