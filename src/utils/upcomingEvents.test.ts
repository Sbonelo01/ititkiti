import { describe, expect, it } from "vitest";
import { isUpcomingListing, selectUpcomingEvents } from "@/utils/upcomingEvents";

const NOW = new Date("2026-11-11T12:00:00.000Z");

describe("selectUpcomingEvents", () => {
  it("keeps future listings and drops past or invalid dates", () => {
    const events = [
      { id: "past", date: "2026-10-09T10:00:00.000Z" },
      { id: "later", date: "2026-11-20T13:00:00.000Z" },
      { id: "sooner", date: "2026-11-20T07:20:00.000Z" },
      { id: "bad", date: "not-a-date" },
    ];

    expect(isUpcomingListing("not-a-date", NOW)).toBe(false);
    expect(isUpcomingListing(events[0].date, NOW)).toBe(false);
    expect(selectUpcomingEvents(events, NOW).map((event) => event.id)).toEqual([
      "sooner",
      "later",
    ]);
  });

  it("does not mutate the source list", () => {
    const events = [
      { id: "b", date: "2026-12-02T10:00:00.000Z" },
      { id: "a", date: "2026-12-01T10:00:00.000Z" },
    ];
    const original = events.map((event) => event.id);
    selectUpcomingEvents(events, NOW);
    expect(events.map((event) => event.id)).toEqual(original);
  });
});
