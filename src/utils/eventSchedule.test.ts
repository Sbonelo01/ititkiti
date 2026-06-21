import { describe, expect, it } from "vitest";
import { canGenerateInvoiceForEvent, isEventInFuture } from "@/utils/eventSchedule";

describe("eventSchedule", () => {
  const now = new Date("2026-06-20T20:00:00.000Z");

  it("treats future event start as not invoiceable", () => {
    expect(isEventInFuture("2026-06-21T18:00:00.000Z", now)).toBe(true);
    expect(canGenerateInvoiceForEvent("2026-06-21T18:00:00.000Z", now)).toBe(false);
  });

  it("allows invoicing after event start has passed", () => {
    expect(isEventInFuture("2026-06-20T19:00:00.000Z", now)).toBe(false);
    expect(canGenerateInvoiceForEvent("2026-06-20T19:00:00.000Z", now)).toBe(true);
  });

  it("blocks invoicing at the exact event start instant", () => {
    expect(canGenerateInvoiceForEvent("2026-06-20T20:00:00.000Z", now)).toBe(false);
  });

  it("treats invalid dates as not invoiceable", () => {
    expect(canGenerateInvoiceForEvent("not-a-date", now)).toBe(false);
  });
});
