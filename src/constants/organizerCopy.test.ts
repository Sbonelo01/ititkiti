import { describe, expect, it } from "vitest";
import { organizerInvoicePill, invoiceStatusLabel } from "@/constants/organizerCopy";
import { getEventInvoiceUi } from "@/server/invoices/invoiceEligibility";

const NOW = new Date("2026-06-20T20:00:00.000Z");
const PAST = "2026-06-20T18:00:00.000Z";
const FUTURE = "2026-06-21T18:00:00.000Z";

describe("organizer invoice pills", () => {
  it("maps paid → Settled and issued → Submitted", () => {
    expect(invoiceStatusLabel("paid")).toBe("Settled");
    expect(invoiceStatusLabel("issued")).toBe("Submitted");
    expect(invoiceStatusLabel("draft")).toBe("Draft");
  });

  it("shows Ready when the event can be invoiced", () => {
    const ui = getEventInvoiceUi({
      eventDate: PAST,
      paidTicketCount: 4,
      invoices: [],
      now: NOW,
    });
    expect(organizerInvoicePill(ui)).toBe("ready");
  });

  it("shows not_ready before the event starts", () => {
    const ui = getEventInvoiceUi({
      eventDate: FUTURE,
      paidTicketCount: 4,
      invoices: [],
      now: NOW,
    });
    expect(organizerInvoicePill(ui)).toBe("not_ready");
  });
});
