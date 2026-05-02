import { describe, it, expect } from "vitest";
import {
  extractEventIdFromReference,
  normalizePaystackTicketSelections,
} from "./paystackChargeMetadata";

describe("extractEventIdFromReference", () => {
  it("returns the segment after EVT-", () => {
    expect(extractEventIdFromReference("EVT-abc-def-123")).toBe("abc");
  });

  it("returns null when prefix is not EVT", () => {
    expect(extractEventIdFromReference("OTHER-abc")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractEventIdFromReference("")).toBeNull();
  });
});

describe("normalizePaystackTicketSelections", () => {
  it("returns empty array for non-array input", () => {
    expect(normalizePaystackTicketSelections(null)).toEqual([]);
    expect(normalizePaystackTicketSelections({})).toEqual([]);
  });

  it("keeps valid rows", () => {
    expect(
      normalizePaystackTicketSelections([
        { ticketTypeId: "t1", quantity: 2 },
        { ticketTypeId: "t2", quantity: 1 },
      ])
    ).toEqual([
      { ticketTypeId: "t1", quantity: 2 },
      { ticketTypeId: "t2", quantity: 1 },
    ]);
  });

  it("drops invalid quantities and missing ids", () => {
    expect(
      normalizePaystackTicketSelections([
        { ticketTypeId: "t1", quantity: 0 },
        { ticketTypeId: "", quantity: 1 },
        { ticketTypeId: "ok", quantity: 2 },
      ])
    ).toEqual([{ ticketTypeId: "ok", quantity: 2 }]);
  });
});
