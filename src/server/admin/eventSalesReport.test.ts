import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  computeServiceFeeTotal,
  roundZar,
  zarToKobo,
} from "@/constants/pricing";
import {
  ADMIN_EVENT_SALES_PAGE_SIZE,
  buildEventSalesReport,
  type SalesEventInput,
  type SalesReceiptInput,
  type SalesTicketInput,
} from "@/server/admin/eventSalesReport";

const NOW = new Date("2026-11-11T12:00:00.000Z");

function build(args: {
  events?: SalesEventInput[];
  tickets?: SalesTicketInput[];
  receipts?: SalesReceiptInput[];
  search?: string;
  when?: "all" | "upcoming" | "past";
  page?: number;
}) {
  return buildEventSalesReport({
    events: args.events ?? [],
    tickets: args.tickets ?? [],
    receipts: args.receipts ?? [],
    search: args.search ?? "",
    when: args.when ?? "all",
    page: args.page ?? 1,
    now: NOW,
  });
}

const eventA: SalesEventInput = {
  id: "evt-a",
  title: "Durban Jazz",
  date: "2026-12-01T18:00:00.000Z",
  organizerId: "org-a",
};

const eventB: SalesEventInput = {
  id: "evt-b",
  title: "Cape Market",
  date: "2024-01-01T18:00:00.000Z",
  organizerId: "org-b",
};

describe("buildEventSalesReport", () => {
  it("returns a complete zero snapshot when nothing is listed", () => {
    const report = build({});
    expect(report.totals).toMatchObject({
      listedEvents: 0,
      paidTickets: 0,
      referencedOrders: 0,
      moneyStatus: "no_sales",
      faceValueZar: 0,
      platformFeeZar: 0,
      collectedZar: 0,
    });
    expect(report.events).toEqual([]);
    expect(report.currency).toBe("ZAR");
    expect(report.generatedAt).toBe(NOW.toISOString());
  });

  it("keeps a zero-sale event at R0 without using a catalog price", () => {
    const report = build({
      events: [{ ...eventA, title: "Free Park" }],
    });
    expect(report.events[0]).toMatchObject({
      paidTickets: 0,
      referencedOrders: 0,
      moneyStatus: "no_sales",
      faceValueZar: 0,
      platformFeeZar: 0,
      collectedZar: 0,
      scheduleStatus: "upcoming",
      listingStatus: "listed",
    });
  });

  it("splits organisers and does not price a legacy order from today's prices", () => {
    const report = build({
      events: [eventA, eventB],
      tickets: [
        { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-a" },
        { id: "t2", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-a" },
        { id: "t3", eventId: "evt-b", paymentStatus: "paid", paystackReference: null },
      ],
      receipts: [
        {
          reference: "ref-a",
          eventId: "evt-a",
          payload: {
            currency: "ZAR",
            face_value_zar: 200,
            platform_fee_zar: 20,
            collected_zar: 220,
            ticket_count: 2,
            ticket_selections: [{ ticketTypeId: "tt", quantity: 2, price: 9999 }],
          },
        },
        {
          reference: "legacy-receipt",
          eventId: "evt-b",
          payload: {
            currency: "ZAR",
            amount_kobo: 11000,
            lines: [{ unit_price_zar: 100, quantity: 1 }],
            ticket_user: { email: "buyer-secret@example.com" },
          },
        },
      ],
    });

    const jazz = report.events.find((event) => event.eventId === "evt-a");
    const market = report.events.find((event) => event.eventId === "evt-b");
    expect(jazz).toMatchObject({
      organizerId: "org-a",
      paidTickets: 2,
      referencedOrders: 1,
      moneyStatus: "complete",
      faceValueZar: 200,
      platformFeeZar: 20,
      collectedZar: 220,
    });
    expect(market).toMatchObject({
      organizerId: "org-b",
      paidTickets: 1,
      referencedOrders: 0,
      unreferencedPaidTickets: 1,
      unlinkedReceipts: 1,
      moneyStatus: "incomplete",
      faceValueZar: null,
      platformFeeZar: null,
      collectedZar: null,
      verifiedOrders: 0,
    });
    expect(report.totals).toMatchObject({
      listedEvents: 2,
      paidTickets: 3,
      referencedOrders: 1,
      moneyStatus: "incomplete",
      faceValueZar: null,
      verifiedFaceValueZar: 200,
      verifiedCollectedZar: 220,
      verifiedTickets: 2,
    });
    expect(JSON.stringify(report)).not.toContain("buyer-secret@example.com");
    expect(JSON.stringify(report)).not.toContain("9999");
  });

  it("counts one mixed-type order once and prices it from stored unit prices", () => {
    const lines = [
      { unit_price_zar: 40, quantity: 2 },
      { unit_price_zar: 250, quantity: 1 },
    ];
    const face = roundZar(40 * 2 + 250);
    const fee = computeServiceFeeTotal([
      { unitPrice: 40, quantity: 2 },
      { unitPrice: 250, quantity: 1 },
    ]);
    const collected = roundZar(face + fee);
    const report = build({
      events: [eventA],
      tickets: [
        { id: "t1", eventId: "evt-a", paymentStatus: "Paid", paystackReference: " ref-mix " },
        { id: "t2", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-mix" },
        { id: "t3", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-mix" },
      ],
      receipts: [
        {
          reference: "ref-mix",
          eventId: "evt-a",
          payload: { currency: "ZAR", amount_kobo: zarToKobo(collected), lines },
        },
      ],
    });
    expect(fee).toBe(22.5);
    expect(report.events[0]).toMatchObject({
      paidTickets: 3,
      referencedOrders: 1,
      moneyStatus: "complete",
      faceValueZar: 330,
      platformFeeZar: 22.5,
      collectedZar: 352.5,
    });
  });

  it("keeps an explicit stored fee even when it differs from today's fee tiers", () => {
    const report = build({
      events: [eventA],
      tickets: [{ id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-free-fee" }],
      receipts: [
        {
          reference: "ref-free-fee",
          eventId: "evt-a",
          payload: {
            currency: "ZAR",
            face_value_zar: 100,
            platform_fee_zar: 0,
            collected_zar: 100,
            ticket_count: 1,
          },
        },
      ],
    });
    expect(report.events[0]).toMatchObject({
      moneyStatus: "complete",
      faceValueZar: 100,
      platformFeeZar: 0,
      collectedZar: 100,
    });
  });

  it("treats a stored zero snapshot as R0 and not as an unknown amount", () => {
    const report = build({
      events: [eventA],
      tickets: [{ id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-zero" }],
      receipts: [
        {
          reference: "ref-zero",
          eventId: "evt-a",
          payload: {
            currency: "ZAR",
            face_value_zar: 0,
            platform_fee_zar: 0,
            collected_zar: 0,
            ticket_count: 1,
          },
        },
      ],
    });
    expect(report.events[0]).toMatchObject({
      moneyStatus: "complete",
      faceValueZar: 0,
      platformFeeZar: 0,
      collectedZar: 0,
    });
  });

  it("dedupes ticket ids and duplicate receipt rows", () => {
    const payload = {
      currency: "ZAR",
      face_value_zar: 50,
      platform_fee_zar: 10,
      collected_zar: 60,
      ticket_count: 1,
    };
    const report = build({
      events: [eventA],
      tickets: [
        { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-1" },
        { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-1" },
      ],
      receipts: [
        { reference: "ref-1", eventId: "evt-a", payload },
        { reference: "ref-1", eventId: "evt-a", payload },
      ],
    });
    expect(report.events[0]).toMatchObject({
      paidTickets: 1,
      referencedOrders: 1,
      collectedZar: 60,
    });
    expect(report.warnings.conflictingTicketIds).toBe(0);
  });

  it("drops conflicting copies of a ticket instead of picking the paid one", () => {
    const report = build({
      events: [eventA],
      tickets: [
        { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-1" },
        { id: "t1", eventId: "evt-a", paymentStatus: "refunded", paystackReference: "ref-1" },
      ],
    });
    expect(report.totals.paidTickets).toBe(0);
    expect(report.warnings.conflictingTicketIds).toBe(1);
    expect(report.totals.moneyStatus).toBe("incomplete");
    expect(report.totals.faceValueZar).toBeNull();
  });

  it("excludes unpaid, failed, cancelled, and refunded rows from successful sales", () => {
    const report = build({
      events: [eventA],
      tickets: [
        { id: "paid", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-ok" },
        { id: "unpaid", eventId: "evt-a", paymentStatus: "unpaid", paystackReference: "ref-no" },
        { id: "failed", eventId: "evt-a", paymentStatus: "failed", paystackReference: "ref-no-2" },
        { id: "cancelled", eventId: "evt-a", paymentStatus: "cancelled", paystackReference: "ref-no-3" },
        { id: "refunded", eventId: "evt-a", paymentStatus: " refunded ", paystackReference: "ref-ok" },
        { id: "blank", eventId: "evt-a", paymentStatus: null, paystackReference: null },
      ],
      receipts: [
        {
          reference: "ref-ok",
          eventId: "evt-a",
          payload: {
            currency: "ZAR",
            face_value_zar: 80,
            platform_fee_zar: 10,
            collected_zar: 90,
            ticket_count: 2,
          },
        },
      ],
    });
    expect(report.events[0]).toMatchObject({
      paidTickets: 1,
      referencedOrders: 1,
      moneyStatus: "incomplete",
      faceValueZar: null,
      verifiedOrders: 0,
    });
    expect(report.totals.excludedNonPaidTickets).toBe(5);
    expect(report.totals.collectedZar).toBeNull();
  });

  it("does not turn a legacy receipt into an order or a ZAR total", () => {
    const report = build({
      events: [eventA],
      tickets: [
        { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: null },
        { id: "t2", eventId: "evt-a", paymentStatus: "paid", paystackReference: "  " },
      ],
      receipts: [
        {
          reference: "legacy-ref",
          eventId: "evt-a",
          payload: {
            ticket_selections: [{ ticketTypeId: "tt-1", quantity: 2, price: 150 }],
            quantity: 2,
          },
        },
      ],
    });
    expect(report.events[0]).toMatchObject({
      paidTickets: 2,
      referencedOrders: 0,
      unreferencedPaidTickets: 2,
      unlinkedReceipts: 1,
      moneyStatus: "incomplete",
      faceValueZar: null,
      verifiedFaceValueZar: 0,
    });
  });

  it("rejects a snapshot that does not match the paid tickets or the collected total", () => {
    const mismatch = build({
      events: [eventA],
      tickets: [{ id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-bad" }],
      receipts: [
        {
          reference: "ref-bad",
          eventId: "evt-a",
          payload: {
            currency: "ZAR",
            face_value_zar: 100,
            platform_fee_zar: 10,
            collected_zar: 100,
            ticket_count: 1,
          },
        },
      ],
    });
    expect(mismatch.events[0].moneyStatus).toBe("incomplete");
    expect(mismatch.events[0].faceValueZar).toBeNull();

    const wrongCurrency = build({
      events: [eventA],
      tickets: [{ id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-ngn" }],
      receipts: [
        {
          reference: "ref-ngn",
          eventId: "evt-a",
          payload: {
            currency: "NGN",
            amount_kobo: 11000,
            lines: [{ unit_price_zar: 100, quantity: 1 }],
          },
        },
      ],
    });
    expect(wrongCurrency.events[0].collectedZar).toBeNull();
  });

  it("does not assign one payment reference to two events", () => {
    const report = build({
      events: [eventA, eventB],
      tickets: [
        { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "shared" },
        { id: "t2", eventId: "evt-b", paymentStatus: "paid", paystackReference: "shared" },
      ],
      receipts: [
        {
          reference: "shared",
          eventId: "evt-a",
          payload: {
            currency: "ZAR",
            face_value_zar: 40,
            platform_fee_zar: 10,
            collected_zar: 50,
            ticket_count: 2,
          },
        },
      ],
    });
    expect(report.warnings.inconsistentReferences).toBe(1);
    expect(report.events.every((event) => event.referencedOrders === 0)).toBe(true);
    expect(report.totals.paidTickets).toBe(2);
    expect(report.totals.referencedOrders).toBe(0);
    expect(report.totals.faceValueZar).toBeNull();
    expect(report.totals.verifiedOrders).toBe(0);
  });

  it("filters by title and time without changing unrelated totals into the page", () => {
    const events = [eventA, eventB, { ...eventA, id: "evt-c", title: "Undated", date: "soon" }];
    const tickets = [
      { id: "t1", eventId: "evt-a", paymentStatus: "paid", paystackReference: "ref-a" },
      { id: "t2", eventId: "evt-b", paymentStatus: "paid", paystackReference: "ref-b" },
    ];
    const receipts = [
      {
        reference: "ref-a",
        eventId: "evt-a",
        payload: {
          currency: "ZAR",
          face_value_zar: 40,
          platform_fee_zar: 5,
          collected_zar: 45,
          ticket_count: 1,
        },
      },
      {
        reference: "ref-b",
        eventId: "evt-b",
        payload: {
          currency: "ZAR",
          face_value_zar: 80,
          platform_fee_zar: 10,
          collected_zar: 90,
          ticket_count: 1,
        },
      },
    ];
    const upcoming = build({ events, tickets, receipts, when: "upcoming" });
    expect(upcoming.events.map((event) => event.eventId)).toEqual(["evt-a"]);
    expect(upcoming.totals).toMatchObject({
      listedEvents: 1,
      paidTickets: 1,
      collectedZar: 45,
      moneyStatus: "complete",
    });

    const past = build({ events, tickets, receipts, when: "past", search: "market" });
    expect(past.events.map((event) => event.title)).toEqual(["Cape Market"]);
    expect(past.totals.collectedZar).toBe(90);

    const all = build({ events, tickets, receipts, search: "jazz" });
    expect(all.totals.paidTickets).toBe(1);
    expect(all.events[0].scheduleStatus).toBe("upcoming");

    const boundary = build({
      events: [{ ...eventA, date: NOW.toISOString() }],
      when: "upcoming",
    });
    expect(boundary.events[0].scheduleStatus).toBe("upcoming");
  });

  it("pages events without shrinking the filter totals", () => {
    const events: SalesEventInput[] = Array.from({ length: ADMIN_EVENT_SALES_PAGE_SIZE + 1 }, (_, index) => ({
      id: `evt-${index}`,
      title: `Night ${index}`,
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      organizerId: "org-a",
    }));
    const first = build({ events, page: 1 });
    const second = build({ events, page: 2 });
    expect(first.events).toHaveLength(ADMIN_EVENT_SALES_PAGE_SIZE);
    expect(second.events).toHaveLength(1);
    expect(first.totals.listedEvents).toBe(ADMIN_EVENT_SALES_PAGE_SIZE + 1);
    expect(second.totals.listedEvents).toBe(first.totals.listedEvents);
    expect(second.totals.moneyStatus).toBe("no_sales");
    expect(second.pageCount).toBe(2);
  });

  it("leaves paid tickets on an unknown event out of the listed total", () => {
    const report = build({
      events: [eventA],
      tickets: [{ id: "orphan", eventId: "missing", paymentStatus: "paid", paystackReference: "ref-x" }],
    });
    expect(report.totals.paidTickets).toBe(0);
    expect(report.totals.moneyStatus).toBe("no_sales");
    expect(report.warnings.omittedPaidTickets).toBe(1);
  });

  it("does not price sales from the invoice builder", () => {
    const source = readFileSync(path.resolve(process.cwd(), "src/server/admin/eventSalesReport.ts"), "utf8");
    expect(source).not.toContain('from "@/server/invoices/buildInvoiceLineItems"');
    expect(source).toContain("computeServiceFeeTotal");
  });
});
