import {
  computeServiceFeeTotal,
  roundZar,
  zarToKobo,
  type TicketLine,
} from "@/constants/pricing";
import { isEventInFuture } from "@/utils/eventSchedule";

/**
 * Platform event sales for the super-admin snapshot.
 *
 * Ticket counts come from `tickets` rows. An order is one non-empty
 * `paystack_reference` shared by one or more paid tickets.
 *
 * ZAR amounts are read only from a purchase-time snapshot on
 * `payment_receipts.payload`. Catalog `events.price` / `ticket_types.price`
 * and organizer invoice drafts are not collected revenue. Those drafts are
 * priced from current catalog prices, and receipt rows written by
 * `finalize_ticket_purchase` store selections and quantity only.
 * This module does not call the invoice line-item builder. It uses the same
 * buyer-fee function as checkout when a snapshot stores unit prices.
 *
 * There is no refund ledger. Any status other than `paid` is left out of
 * successful sales and is not subtracted from a collected total.
 */

export const ADMIN_EVENT_SALES_PAGE_SIZE = 20;

export type SalesWhen = "all" | "upcoming" | "past";
export type ScheduleStatus = "upcoming" | "past" | "date_unavailable";
export type SalesMoneyStatus = "no_sales" | "complete" | "incomplete";

export type SalesEventInput = {
  id: string;
  title: string;
  date: string | null;
  organizerId: string | null;
};

export type SalesTicketInput = {
  id: string;
  eventId: string;
  paymentStatus: string | null;
  paystackReference: string | null;
};

export type SalesReceiptInput = {
  reference: string;
  eventId: string;
  payload: unknown;
};

export type EventSalesFigures = {
  paidTickets: number;
  referencedOrders: number;
  unreferencedPaidTickets: number;
  unlinkedReceipts: number;
  moneyStatus: SalesMoneyStatus;
  faceValueZar: number | null;
  platformFeeZar: number | null;
  collectedZar: number | null;
  verifiedOrders: number;
  verifiedTickets: number;
  verifiedFaceValueZar: number;
  verifiedPlatformFeeZar: number;
  verifiedCollectedZar: number;
};

export type EventSalesEventRow = EventSalesFigures & {
  eventId: string;
  title: string;
  startsAt: string | null;
  scheduleStatus: ScheduleStatus;
  listingStatus: "listed";
  organizerId: string | null;
};

export type EventSalesDatasetWarnings = {
  skippedEventRows: number;
  skippedTicketRows: number;
  skippedReceiptRows: number;
  conflictingTicketIds: number;
  inconsistentReferences: number;
  omittedPaidTickets: number;
  omittedReceipts: number;
};

export type EventSalesTotals = EventSalesFigures & {
  listedEvents: number;
  excludedNonPaidTickets: number;
};

export type EventSalesBuildResult = {
  generatedAt: string;
  currency: "ZAR";
  filter: { search: string; when: SalesWhen };
  page: number;
  pageSize: number;
  totalEvents: number;
  pageCount: number;
  totals: EventSalesTotals;
  warnings: EventSalesDatasetWarnings;
  events: EventSalesEventRow[];
};

export type PublicEventSalesRow = Omit<EventSalesEventRow, "organizerId"> & {
  organizerLabel: string;
};

export type PublicEventSalesDashboard = Omit<EventSalesBuildResult, "events"> & {
  events: PublicEventSalesRow[];
};

type TicketRecord = {
  id: string;
  eventId: string;
  paymentStatus: string;
  reference: string | null;
};

type ReceiptRecord = {
  reference: string;
  eventId: string;
  payload: unknown;
  dirty: boolean;
};

type StoredOrderMoney = {
  faceValueZar: number;
  platformFeeZar: number;
  collectedZar: number;
  ticketCount: number;
};

type ResolvedOrder = {
  reference: string;
  eventId: string | null;
  money: StoredOrderMoney | null;
  inconsistent: boolean;
};

function emptyFigures(): EventSalesFigures {
  return {
    paidTickets: 0,
    referencedOrders: 0,
    unreferencedPaidTickets: 0,
    unlinkedReceipts: 0,
    moneyStatus: "no_sales",
    faceValueZar: 0,
    platformFeeZar: 0,
    collectedZar: 0,
    verifiedOrders: 0,
    verifiedTickets: 0,
    verifiedFaceValueZar: 0,
    verifiedPlatformFeeZar: 0,
    verifiedCollectedZar: 0,
  };
}

export function scheduleStatusForSales(dateIso: string | null, now: Date): ScheduleStatus {
  if (!dateIso || Number.isNaN(Date.parse(dateIso))) {
    return "date_unavailable";
  }
  return isEventInFuture(dateIso, now) ? "upcoming" : "past";
}

function matchesWhen(status: ScheduleStatus, when: SalesWhen): boolean {
  switch (when) {
    case "all":
      return true;
    case "upcoming":
      return status === "upcoming";
    case "past":
      return status === "past";
    default: {
      const unexpected: never = when;
      return unexpected;
    }
  }
}

function normalizeStatus(status: string | null): string {
  return (status ?? "").trim().toLowerCase();
}

function normalizeReference(reference: string | null | undefined): string | null {
  if (typeof reference !== "string") return null;
  const trimmed = reference.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isCentZar(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-6
  );
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function balances(face: number, fee: number, collected: number): boolean {
  return roundZar(face + fee) === collected;
}

function moneyFromExplicit(payload: Record<string, unknown>, paidTickets: number): StoredOrderMoney | null {
  if (payload.currency !== "ZAR") return null;
  const face = payload.face_value_zar;
  const fee = payload.platform_fee_zar;
  const collected = payload.collected_zar;
  const ticketCount = payload.ticket_count;
  if (!isCentZar(face) || !isCentZar(fee) || !isCentZar(collected) || !isPositiveInt(ticketCount)) {
    return null;
  }
  if (ticketCount !== paidTickets || !balances(face, fee, collected)) {
    return null;
  }
  return {
    faceValueZar: face,
    platformFeeZar: fee,
    collectedZar: collected,
    ticketCount,
  };
}

function moneyFromStoredLines(payload: Record<string, unknown>, paidTickets: number): StoredOrderMoney | null {
  if (payload.currency !== "ZAR" || !isNonNegativeInt(payload.amount_kobo)) return null;
  if (!Array.isArray(payload.lines) || payload.lines.length === 0) return null;

  const lines: TicketLine[] = [];
  for (const row of payload.lines) {
    if (!row || typeof row !== "object") return null;
    const unitPrice = (row as { unit_price_zar?: unknown }).unit_price_zar;
    const quantity = (row as { quantity?: unknown }).quantity;
    if (!isCentZar(unitPrice) || !isPositiveInt(quantity)) return null;
    lines.push({ unitPrice, quantity });
  }

  const faceValueZar = roundZar(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0));
  const platformFeeZar = computeServiceFeeTotal(lines);
  const collectedZar = roundZar(faceValueZar + platformFeeZar);
  const ticketCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (ticketCount !== paidTickets || zarToKobo(collectedZar) !== payload.amount_kobo) {
    return null;
  }
  return { faceValueZar, platformFeeZar, collectedZar, ticketCount };
}

function hasExplicitMoney(payload: Record<string, unknown>): boolean {
  return (
    "face_value_zar" in payload ||
    "platform_fee_zar" in payload ||
    "collected_zar" in payload ||
    "ticket_count" in payload
  );
}

function hasLineMoney(payload: Record<string, unknown>): boolean {
  return "amount_kobo" in payload || "lines" in payload;
}

/**
 * Accepts only a ZAR snapshot stored on the receipt. `ticket_selections` and
 * any catalog `price` fields are ignored — they are not the charged amount.
 */
export function readStoredOrderMoney(payload: unknown, paidTickets: number): StoredOrderMoney | null {
  if (paidTickets < 1 || !payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const explicit = hasExplicitMoney(record);
  const lined = hasLineMoney(record);
  if (!explicit && !lined) return null;

  const fromExplicit = explicit ? moneyFromExplicit(record, paidTickets) : null;
  const fromLines = lined ? moneyFromStoredLines(record, paidTickets) : null;
  if (explicit && !fromExplicit) return null;
  if (lined && !fromLines) return null;
  if (fromExplicit && fromLines) {
    const same =
      fromExplicit.faceValueZar === fromLines.faceValueZar &&
      fromExplicit.platformFeeZar === fromLines.platformFeeZar &&
      fromExplicit.collectedZar === fromLines.collectedZar &&
      fromExplicit.ticketCount === fromLines.ticketCount;
    return same ? fromExplicit : null;
  }
  return fromExplicit ?? fromLines;
}

function payloadKey(payload: unknown): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return "__unserializable__";
  }
}

function addMoney(left: number, right: number): number {
  return roundZar(left + right);
}

function figuresFromParts(parts: {
  paidTickets: number;
  referencedOrders: number;
  unreferencedPaidTickets: number;
  unlinkedReceipts: number;
  verified: StoredOrderMoney[];
  blocked: boolean;
}): EventSalesFigures {
  const verifiedOrders = parts.verified.length;
  const verifiedTickets = parts.verified.reduce((sum, money) => sum + money.ticketCount, 0);
  const verifiedFaceValueZar = parts.verified.reduce((sum, money) => addMoney(sum, money.faceValueZar), 0);
  const verifiedPlatformFeeZar = parts.verified.reduce(
    (sum, money) => addMoney(sum, money.platformFeeZar),
    0
  );
  const verifiedCollectedZar = parts.verified.reduce((sum, money) => addMoney(sum, money.collectedZar), 0);
  const counts = {
    paidTickets: parts.paidTickets,
    referencedOrders: parts.referencedOrders,
    unreferencedPaidTickets: parts.unreferencedPaidTickets,
    unlinkedReceipts: parts.unlinkedReceipts,
    verifiedOrders,
    verifiedTickets,
    verifiedFaceValueZar,
    verifiedPlatformFeeZar,
    verifiedCollectedZar,
  };

  if (
    parts.paidTickets === 0 &&
    parts.unlinkedReceipts === 0 &&
    parts.referencedOrders === 0 &&
    !parts.blocked
  ) {
    return { ...emptyFigures(), ...counts, moneyStatus: "no_sales" };
  }

  const fullyPriced =
    !parts.blocked &&
    parts.unlinkedReceipts === 0 &&
    parts.paidTickets > 0 &&
    parts.unreferencedPaidTickets === 0 &&
    verifiedTickets === parts.paidTickets &&
    verifiedOrders === parts.referencedOrders;

  if (fullyPriced) {
    return {
      ...counts,
      moneyStatus: "complete",
      faceValueZar: verifiedFaceValueZar,
      platformFeeZar: verifiedPlatformFeeZar,
      collectedZar: verifiedCollectedZar,
    };
  }

  return {
    ...counts,
    moneyStatus: "incomplete",
    faceValueZar: null,
    platformFeeZar: null,
    collectedZar: null,
  };
}

function compareEvents(a: EventSalesEventRow, b: EventSalesEventRow): number {
  const aTime = a.startsAt ? Date.parse(a.startsAt) : Number.NaN;
  const bTime = b.startsAt ? Date.parse(b.startsAt) : Number.NaN;
  const aOk = !Number.isNaN(aTime);
  const bOk = !Number.isNaN(bTime);
  if (aOk && bOk && aTime !== bTime) return bTime - aTime;
  if (aOk !== bOk) return aOk ? -1 : 1;
  return a.eventId.localeCompare(b.eventId);
}

export function buildEventSalesReport(args: {
  events: SalesEventInput[];
  tickets: SalesTicketInput[];
  receipts: SalesReceiptInput[];
  search: string;
  when: SalesWhen;
  page: number;
  now: Date;
}): EventSalesBuildResult {
  const warnings: EventSalesDatasetWarnings = {
    skippedEventRows: 0,
    skippedTicketRows: 0,
    skippedReceiptRows: 0,
    conflictingTicketIds: 0,
    inconsistentReferences: 0,
    omittedPaidTickets: 0,
    omittedReceipts: 0,
  };
  const conflictedEvents = new Set<string>();

  const eventMap = new Map<string, SalesEventInput>();
  for (const event of args.events) {
    if (!event || typeof event.id !== "string" || event.id.length === 0) {
      warnings.skippedEventRows += 1;
      continue;
    }
    const existing = eventMap.get(event.id);
    if (!existing) {
      eventMap.set(event.id, event);
      continue;
    }
    if (
      existing.title !== event.title ||
      existing.date !== event.date ||
      existing.organizerId !== event.organizerId
    ) {
      warnings.skippedEventRows += 1;
      conflictedEvents.add(event.id);
    }
  }

  const ticketsById = new Map<string, TicketRecord>();
  const conflictedTicketIds = new Set<string>();
  for (const raw of args.tickets) {
    if (!raw || typeof raw.id !== "string" || raw.id.length === 0 || typeof raw.eventId !== "string" || raw.eventId.length === 0) {
      warnings.skippedTicketRows += 1;
      continue;
    }
    if (conflictedTicketIds.has(raw.id)) continue;
    const next: TicketRecord = {
      id: raw.id,
      eventId: raw.eventId,
      paymentStatus: normalizeStatus(raw.paymentStatus),
      reference: normalizeReference(raw.paystackReference),
    };
    const prev = ticketsById.get(raw.id);
    if (!prev) {
      ticketsById.set(raw.id, next);
      continue;
    }
    if (
      prev.eventId !== next.eventId ||
      prev.paymentStatus !== next.paymentStatus ||
      prev.reference !== next.reference
    ) {
      conflictedTicketIds.add(raw.id);
      conflictedEvents.add(prev.eventId);
      conflictedEvents.add(next.eventId);
      ticketsById.delete(raw.id);
      warnings.conflictingTicketIds += 1;
    }
  }

  const receipts = new Map<string, ReceiptRecord>();
  for (const raw of args.receipts) {
    const reference = normalizeReference(raw?.reference);
    if (!reference || !raw || typeof raw.eventId !== "string" || raw.eventId.length === 0) {
      warnings.skippedReceiptRows += 1;
      continue;
    }
    const prev = receipts.get(reference);
    if (!prev) {
      receipts.set(reference, { reference, eventId: raw.eventId, payload: raw.payload, dirty: false });
      continue;
    }
    if (prev.eventId !== raw.eventId || payloadKey(prev.payload) !== payloadKey(raw.payload)) {
      prev.dirty = true;
    }
  }

  const paid: TicketRecord[] = [];
  for (const ticket of ticketsById.values()) {
    if (ticket.paymentStatus === "paid") {
      paid.push(ticket);
    }
  }

  const paidByReference = new Map<string, TicketRecord[]>();
  const unreferencedByEvent = new Map<string, number>();
  for (const ticket of paid) {
    if (!eventMap.has(ticket.eventId)) {
      warnings.omittedPaidTickets += 1;
    }
    if (!ticket.reference) {
      unreferencedByEvent.set(ticket.eventId, (unreferencedByEvent.get(ticket.eventId) ?? 0) + 1);
      continue;
    }
    const group = paidByReference.get(ticket.reference) ?? [];
    group.push(ticket);
    paidByReference.set(ticket.reference, group);
  }

  const usedReceipts = new Set<string>();
  const orders: ResolvedOrder[] = [];
  for (const [reference, group] of paidByReference) {
    const eventIds = new Set(group.map((ticket) => ticket.eventId));
    const receipt = receipts.get(reference);
    if (receipt) usedReceipts.add(reference);
    if (eventIds.size !== 1) {
      warnings.inconsistentReferences += 1;
      orders.push({ reference, eventId: null, money: null, inconsistent: true });
      continue;
    }
    const eventId = [...eventIds][0];
    if (!eventId) {
      warnings.inconsistentReferences += 1;
      orders.push({ reference, eventId: null, money: null, inconsistent: true });
      continue;
    }
    const money =
      receipt && !receipt.dirty && receipt.eventId === eventId
        ? readStoredOrderMoney(receipt.payload, group.length)
        : null;
    orders.push({ reference, eventId, money, inconsistent: false });
  }

  const unlinkedByEvent = new Map<string, number>();
  for (const receipt of receipts.values()) {
    if (usedReceipts.has(receipt.reference)) continue;
    if (!eventMap.has(receipt.eventId)) {
      warnings.omittedReceipts += 1;
      continue;
    }
    unlinkedByEvent.set(receipt.eventId, (unlinkedByEvent.get(receipt.eventId) ?? 0) + 1);
  }

  const paidByEvent = new Map<string, TicketRecord[]>();
  for (const ticket of paid) {
    if (!eventMap.has(ticket.eventId)) continue;
    const list = paidByEvent.get(ticket.eventId) ?? [];
    list.push(ticket);
    paidByEvent.set(ticket.eventId, list);
  }

  const rows: EventSalesEventRow[] = [];
  for (const event of eventMap.values()) {
    const eventPaid = paidByEvent.get(event.id) ?? [];
    const eventOrders = orders.filter((order) => order.eventId === event.id && !order.inconsistent);
    const verified = eventOrders.flatMap((order) => (order.money ? [order.money] : []));
    const startsAt = typeof event.date === "string" && event.date.length > 0 ? event.date : null;
    const figures = figuresFromParts({
      paidTickets: eventPaid.length,
      referencedOrders: eventOrders.length,
      unreferencedPaidTickets: unreferencedByEvent.get(event.id) ?? 0,
      unlinkedReceipts: unlinkedByEvent.get(event.id) ?? 0,
      verified,
      blocked: conflictedEvents.has(event.id),
    });
    const title = typeof event.title === "string" && event.title.trim().length > 0 ? event.title.trim() : "Untitled event";
    rows.push({
      ...figures,
      eventId: event.id,
      title,
      startsAt,
      scheduleStatus: scheduleStatusForSales(startsAt, args.now),
      listingStatus: "listed",
      organizerId: typeof event.organizerId === "string" && event.organizerId.length > 0 ? event.organizerId : null,
    });
  }

  const search = args.search.trim().toLowerCase();
  const filtered = rows
    .filter((row) => (search.length === 0 ? true : row.title.toLowerCase().includes(search)))
    .filter((row) => matchesWhen(row.scheduleStatus, args.when))
    .sort(compareEvents);

  const filteredIds = new Set(filtered.map((row) => row.eventId));
  let excludedNonPaidTickets = 0;
  for (const ticket of ticketsById.values()) {
    if (ticket.paymentStatus === "paid") continue;
    if (filteredIds.has(ticket.eventId)) excludedNonPaidTickets += 1;
  }

  const forceIncomplete =
    warnings.skippedEventRows > 0 ||
    warnings.skippedTicketRows > 0 ||
    warnings.skippedReceiptRows > 0 ||
    warnings.conflictingTicketIds > 0;

  const totals = rollup(filtered, excludedNonPaidTickets, forceIncomplete);
  const pageSize = ADMIN_EVENT_SALES_PAGE_SIZE;
  const page = Number.isInteger(args.page) && args.page > 0 ? args.page : 1;
  const totalEvents = filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalEvents / pageSize));
  const start = (page - 1) * pageSize;
  const events = start >= totalEvents ? [] : filtered.slice(start, start + pageSize);

  return {
    generatedAt: args.now.toISOString(),
    currency: "ZAR",
    filter: { search: args.search.trim(), when: args.when },
    page,
    pageSize,
    totalEvents,
    pageCount,
    totals,
    warnings,
    events,
  };
}

function rollup(
  events: EventSalesEventRow[],
  excludedNonPaidTickets: number,
  forceIncomplete: boolean
): EventSalesTotals {
  const totals = events.reduce<EventSalesFigures>((sum, event) => {
    return {
      paidTickets: sum.paidTickets + event.paidTickets,
      referencedOrders: sum.referencedOrders + event.referencedOrders,
      unreferencedPaidTickets: sum.unreferencedPaidTickets + event.unreferencedPaidTickets,
      unlinkedReceipts: sum.unlinkedReceipts + event.unlinkedReceipts,
      moneyStatus: "no_sales",
      faceValueZar: 0,
      platformFeeZar: 0,
      collectedZar: 0,
      verifiedOrders: sum.verifiedOrders + event.verifiedOrders,
      verifiedTickets: sum.verifiedTickets + event.verifiedTickets,
      verifiedFaceValueZar: addMoney(sum.verifiedFaceValueZar, event.verifiedFaceValueZar),
      verifiedPlatformFeeZar: addMoney(sum.verifiedPlatformFeeZar, event.verifiedPlatformFeeZar),
      verifiedCollectedZar: addMoney(sum.verifiedCollectedZar, event.verifiedCollectedZar),
    };
  }, emptyFigures());

  const anyIncomplete = forceIncomplete || events.some((event) => event.moneyStatus === "incomplete");
  const anySales = events.some((event) => event.moneyStatus !== "no_sales");
  let moneyStatus: SalesMoneyStatus = "no_sales";
  if (anyIncomplete) {
    moneyStatus = "incomplete";
  } else if (anySales) {
    moneyStatus = "complete";
  }

  const faceKnown = moneyStatus === "complete" || moneyStatus === "no_sales";
  return {
    ...totals,
    listedEvents: events.length,
    excludedNonPaidTickets,
    moneyStatus,
    faceValueZar: faceKnown
      ? events.reduce((sum, event) => addMoney(sum, event.faceValueZar ?? 0), 0)
      : null,
    platformFeeZar: faceKnown
      ? events.reduce((sum, event) => addMoney(sum, event.platformFeeZar ?? 0), 0)
      : null,
    collectedZar: faceKnown
      ? events.reduce((sum, event) => addMoney(sum, event.collectedZar ?? 0), 0)
      : null,
  };
}
