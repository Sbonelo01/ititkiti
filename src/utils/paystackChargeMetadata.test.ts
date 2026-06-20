import { describe, it, expect } from "vitest";
import {
  buildPaystackReference,
  extractEventIdFromReference,
  normalizePaystackTicketSelections,
} from "./paystackChargeMetadata";

const EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("buildPaystackReference", () => {
  it("uses underscore delimiters for uuid segments", () => {
    const ref = buildPaystackReference(EVENT_ID, USER_ID);
    expect(ref.startsWith(`EVT_${EVENT_ID}_${USER_ID}_`)).toBe(true);
  });
});

describe("extractEventIdFromReference", () => {
  it("extracts uuid from new underscore format", () => {
    expect(
      extractEventIdFromReference(`EVT_${EVENT_ID}_${USER_ID}_1704067200000_1234`)
    ).toBe(EVENT_ID);
  });

  it("extracts uuid from legacy hyphen format", () => {
    expect(
      extractEventIdFromReference(`EVT-${EVENT_ID}-${USER_ID}-1704067200000-1234`)
    ).toBe(EVENT_ID);
  });

  it("returns legacy short id segment when not uuid", () => {
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

  it("drops default synthetic ids and invalid quantities", () => {
    expect(
      normalizePaystackTicketSelections([
        { ticketTypeId: "default", quantity: 2 },
        { ticketTypeId: "t1", quantity: 0 },
        { ticketTypeId: "ok", quantity: 2 },
      ])
    ).toEqual([{ ticketTypeId: "ok", quantity: 2 }]);
  });
});
