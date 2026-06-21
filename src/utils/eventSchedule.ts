/** True while the event start is now or still in the future (invoicing not allowed). */
export function isEventInFuture(eventDateIso: string, now: Date = new Date()): boolean {
  const eventStart = new Date(eventDateIso);
  if (Number.isNaN(eventStart.getTime())) {
    return true;
  }
  return now.getTime() <= eventStart.getTime();
}

/** Organizers may invoice Tikiti only after the scheduled event start has passed. */
export function canGenerateInvoiceForEvent(eventDateIso: string, now: Date = new Date()): boolean {
  return !isEventInFuture(eventDateIso, now);
}
