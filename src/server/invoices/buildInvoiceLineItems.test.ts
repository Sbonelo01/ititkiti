import { describe, expect, it } from "vitest";
import { buildInvoiceLineItems } from "@/server/invoices/buildInvoiceLineItems";

describe("buildInvoiceLineItems", () => {
  const event = {
    id: "evt-1",
    title: "Test Concert",
    date: "2026-06-01T18:00:00.000Z",
    location: "Johannesburg",
    price: 100,
  };

  it("aggregates ticket types and purchases accurately", () => {
    const lineItems = buildInvoiceLineItems({
      event,
      tickets: [
        {
          id: "t1",
          ticket_type_id: "tt1",
          paystack_reference: "ref-a",
          created_at: "2026-06-02T10:00:00.000Z",
          email: "buyer1@test.com",
          ticket_types: { id: "tt1", name: "General", price: 100 },
        },
        {
          id: "t2",
          ticket_type_id: "tt1",
          paystack_reference: "ref-a",
          created_at: "2026-06-02T10:00:01.000Z",
          email: "buyer1@test.com",
          ticket_types: { id: "tt1", name: "General", price: 100 },
        },
        {
          id: "t3",
          ticket_type_id: "tt2",
          paystack_reference: "ref-b",
          created_at: "2026-06-03T11:00:00.000Z",
          email: "buyer2@test.com",
          ticket_types: { id: "tt2", name: "VIP", price: 250 },
        },
      ],
      serviceFeePerTicket: 10,
    });

    expect(lineItems.totals.ticketCount).toBe(3);
    expect(lineItems.totals.ticketRevenue).toBe(450);
    expect(lineItems.totals.serviceFeeTotal).toBe(30);
    expect(lineItems.totals.netAmountDueToOrganizer).toBe(420);
    expect(lineItems.byTicketType).toHaveLength(2);
    expect(lineItems.byPurchase).toHaveLength(2);
    expect(lineItems.byPurchase[0].ticketCount).toBe(2);
    expect(lineItems.byPurchase[0].ticketRevenue).toBe(200);
  });

  it("uses event fallback price when ticket type is missing", () => {
    const lineItems = buildInvoiceLineItems({
      event,
      tickets: [
        {
          id: "t1",
          ticket_type_id: null,
          paystack_reference: null,
          created_at: "2026-06-02T10:00:00.000Z",
          email: "buyer@test.com",
          ticket_types: null,
        },
      ],
    });

    expect(lineItems.totals.ticketRevenue).toBe(100);
    expect(lineItems.byTicketType[0].name).toBe("General");
  });
});
