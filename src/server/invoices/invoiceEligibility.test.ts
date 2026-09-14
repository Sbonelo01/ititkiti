import { describe, expect, it } from "vitest";
import { getEventInvoiceUi, submitInvoiceGuard } from "./invoiceEligibility";

const NOW = new Date("2026-06-20T20:00:00.000Z");
const PAST = "2026-06-20T18:00:00.000Z";
const FUTURE = "2026-06-21T18:00:00.000Z";

describe("getEventInvoiceUi", () => {
  it("blocks invoicing before the event starts even with paid tickets", () => {
    const ui = getEventInvoiceUi({
      eventDate: FUTURE,
      paidTicketCount: 12,
      invoices: [],
      now: NOW,
    });
    expect(ui.kind).toBe("event_in_future");
    expect(ui.canGenerate).toBe(false);
  });

  it("shows empty state when the event has started but nothing is paid", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 0,
      invoices: [],
      now: NOW,
    });
    expect(ui.kind).toBe("no_paid_tickets");
    expect(ui.canGenerate).toBe(false);
  });

  it("is ready to generate after start with uninvoiced paid tickets", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 4,
      invoices: [],
      now: NOW,
    });
    expect(ui.kind).toBe("ready_to_generate");
    expect(ui.canGenerate).toBe(true);
    expect(ui.uninvoicedTicketCount).toBe(4);
  });

  it("treats non-void invoices as already invoiced when ticket counts match", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 4,
      invoices: [
        { id: "inv-1", status: "issued", invoice_number: "TKT-1", ticket_count: 4 },
      ],
      now: NOW,
    });
    expect(ui.kind).toBe("already_invoiced");
    expect(ui.canGenerate).toBe(false);
  });

  it("ignores void invoices when deciding if sales can be invoiced again", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 2,
      invoices: [
        { id: "inv-void", status: "void", invoice_number: "TKT-0", ticket_count: 2 },
      ],
      now: NOW,
    });
    expect(ui.kind).toBe("ready_to_generate");
    expect(ui.canGenerate).toBe(true);
  });

  it("surfaces a draft so organizers can submit without generating again", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 3,
      invoices: [
        { id: "inv-d", status: "draft", invoice_number: "TKT-2", ticket_count: 3 },
      ],
      now: NOW,
    });
    expect(ui.kind).toBe("draft_pending_submit");
    expect(ui.canGenerate).toBe(false);
    expect(ui.draft?.id).toBe("inv-d");
  });

  it("allows generating leftover sales while a draft still needs submit", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 5,
      invoices: [
        { id: "inv-d", status: "draft", invoice_number: "TKT-2", ticket_count: 3 },
      ],
      now: NOW,
    });
    expect(ui.kind).toBe("draft_pending_submit");
    expect(ui.canGenerate).toBe(true);
    expect(ui.uninvoicedTicketCount).toBe(2);
  });
});

describe("submitInvoiceGuard", () => {
  it("allows the owning organizer to submit a draft", () => {
    expect(
      submitInvoiceGuard({
        invoice: { status: "draft", organizer_id: "org-1" },
        userId: "org-1",
      })
    ).toEqual({ ok: true });
  });

  it("rejects submit by a different user", () => {
    expect(
      submitInvoiceGuard({
        invoice: { status: "draft", organizer_id: "org-1" },
        userId: "org-2",
      })
    ).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });

  it("rejects a second submit of an already issued invoice", () => {
    const result = submitInvoiceGuard({
      invoice: { status: "issued", organizer_id: "org-1" },
      userId: "org-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("rejects paid and void invoices", () => {
    expect(
      submitInvoiceGuard({
        invoice: { status: "paid", organizer_id: "org-1" },
        userId: "org-1",
      }).ok
    ).toBe(false);
    expect(
      submitInvoiceGuard({
        invoice: { status: "void", organizer_id: "org-1" },
        userId: "org-1",
      }).ok
    ).toBe(false);
  });
});
