import { isEventInFuture } from "@/utils/eventSchedule";

export function isUpcomingListing(dateIso: string, now: Date = new Date()): boolean {
  const eventStart = new Date(dateIso);
  if (Number.isNaN(eventStart.getTime())) {
    return false;
  }
  return isEventInFuture(dateIso, now);
}

export function selectUpcomingEvents<T extends { date: string }>(
  events: T[],
  now: Date = new Date()
): T[] {
  return events
    .filter((event) => isUpcomingListing(event.date, now))
    .slice()
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function formatEventWhen(dateIso: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
