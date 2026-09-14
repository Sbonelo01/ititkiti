import { describe, expect, it } from "vitest";
import {
  organizerInvoicePill,
  organizerInvoicePillLabel,
  invoiceStatusLabel,
  interpolateOrganizerCopy,
  ORGANIZER_COPY,
} from "@/constants/organizerCopy";
import { getEventInvoiceUi } from "@/server/invoices/invoiceEligibility";

const NOW = new Date("2026-06-20T20:00:00.000Z");
const PAST = "2026-06-20T18:00:00.000Z";
const FUTURE = "2026-06-21T18:00:00.000Z";

describe("organizer invoice pills", () => {
  it("maps paid → Paid and issued → Submitted", () => {
    expect(invoiceStatusLabel("paid")).toBe("Paid");
    expect(invoiceStatusLabel("issued")).toBe("Submitted");
    expect(invoiceStatusLabel("draft")).toBe("Draft");
    expect(invoiceStatusLabel("void")).toBe("Void");
    expect(organizerInvoicePillLabel("settled")).toBe("Paid");
    expect(ORGANIZER_COPY.invoice.statusPaid).toBe("Paid");
  });

  it("interpolates welcome-email placeholders", () => {
    expect(
      interpolateOrganizerCopy(ORGANIZER_COPY.email.intro, { event_name: "Jazz Night" })
    ).toBe("You made the right call listing Jazz Night on Tikiti.");
    expect(
      interpolateOrganizerCopy(ORGANIZER_COPY.email.greeting, {
        organizer_first_name: "Sbonelo",
      })
    ).toBe("Hi Sbonelo,");
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
