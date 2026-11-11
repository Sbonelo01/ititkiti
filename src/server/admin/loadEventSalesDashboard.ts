import "server-only";

import type { User } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  buildEventSalesReport,
  type PublicEventSalesDashboard,
  type PublicEventSalesRow,
  type SalesEventInput,
  type SalesReceiptInput,
  type SalesTicketInput,
  type SalesTicketTypeInput,
  type SalesWhen,
} from "@/server/admin/eventSalesReport";

/**
 * Reads events, tickets, and payment receipts with the service role and
 * pages past PostgREST's default 1000-row cap. Caller must already have
 * passed `requireSuperAdminAuth`. Receipt payloads stay on the server;
 * the response has no buyer email, QR data, or raw payload.
 *
 * Purchase rows do not currently store face value, buyer fee, or the
 * Paystack amount. Until a receipt payload carries one of the snapshot
 * shapes `readStoredOrderMoney` accepts, ZAR totals stay incomplete
 * instead of being rebuilt from today's ticket prices.
 */

export const ADMIN_SALES_DB_PAGE_SIZE = 1000;
const MAX_PAGES = 1000;

export class EventSalesLoadError extends Error {
  constructor() {
    super("Failed to load event sales");
    this.name = "EventSalesLoadError";
  }
}

export type { PublicEventSalesDashboard, PublicEventSalesRow };

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export function organizerLabelFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): string {
  const company = typeof metadata?.company_name === "string" ? metadata.company_name.trim() : "";
  if (company.length > 0) return company;
  const name = typeof metadata?.name === "string" ? metadata.name.trim() : "";
  const surname = typeof metadata?.surname === "string" ? metadata.surname.trim() : "";
  const person = [name, surname].filter((part) => part.length > 0).join(" ");
  if (person.length > 0) return person;
  return "Name not on file";
}

export async function selectAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const to = from + ADMIN_SALES_DB_PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      throw new EventSalesLoadError();
    }
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < ADMIN_SALES_DB_PAGE_SIZE) {
      return rows;
    }
    from += ADMIN_SALES_DB_PAGE_SIZE;
  }
  throw new EventSalesLoadError();
}

function asEvent(value: unknown): SalesEventInput {
  if (!value || typeof value !== "object") {
    return { id: "", title: "", date: null, organizerId: null };
  }
  const row = value as Record<string, unknown>;
  return {
    id: typeof row.id === "string" ? row.id : "",
    title: typeof row.title === "string" ? row.title : "",
    date: typeof row.date === "string" ? row.date : null,
    organizerId: typeof row.organizer_id === "string" ? row.organizer_id : null,
  };
}

function asTicket(value: unknown): SalesTicketInput {
  if (!value || typeof value !== "object") {
    return { id: "", eventId: "", paymentStatus: null, paystackReference: null };
  }
  const row = value as Record<string, unknown>;
  return {
    id: typeof row.id === "string" ? row.id : "",
    eventId: typeof row.event_id === "string" ? row.event_id : "",
    paymentStatus: typeof row.payment_status === "string" ? row.payment_status : null,
    paystackReference: typeof row.paystack_reference === "string" ? row.paystack_reference : null,
  };
}

function asReceipt(value: unknown): SalesReceiptInput {
  if (!value || typeof value !== "object") {
    return { reference: "", eventId: "", payload: null };
  }
  const row = value as Record<string, unknown>;
  return {
    reference: typeof row.reference === "string" ? row.reference : "",
    eventId: typeof row.event_id === "string" ? row.event_id : "",
    payload: row.payload,
  };
}

function finiteListPrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function nonNegativeInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function asTicketType(value: unknown): SalesTicketTypeInput {
  if (!value || typeof value !== "object") {
    return { id: "", eventId: "", name: "", listPriceZar: null, quantity: null, availableQuantity: null };
  }
  const row = value as Record<string, unknown>;
  return {
    id: typeof row.id === "string" ? row.id : "",
    eventId: typeof row.event_id === "string" ? row.event_id : "",
    name: typeof row.name === "string" ? row.name : "",
    listPriceZar: finiteListPrice(row.price),
    quantity: nonNegativeInt(row.quantity),
    availableQuantity: nonNegativeInt(row.available_quantity),
  };
}

async function organizerLabel(
  organizerId: string | null,
  cache: Map<string, string>
): Promise<string> {
  if (!organizerId) return "Name not on file";
  const cached = cache.get(organizerId);
  if (cached) return cached;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.getUserById(organizerId);
    const user = data?.user as User | undefined;
    const label = error || !user ? "Name not on file" : organizerLabelFromMetadata(user.user_metadata);
    cache.set(organizerId, label);
    return label;
  } catch {
    cache.set(organizerId, "Name not on file");
    return "Name not on file";
  }
}

export async function loadEventSalesDashboard(query: {
  search: string;
  when: SalesWhen;
  page: number;
  now?: Date;
}): Promise<PublicEventSalesDashboard> {
  const supabase = getSupabaseAdmin();
  const now = query.now ?? new Date();

  const [eventRows, ticketRows, receiptRows, ticketTypeRows] = await Promise.all([
    selectAllRows<unknown>((from, to) =>
      supabase
        .from("events")
        .select("id, title, date, organizer_id")
        .order("id", { ascending: true })
        .range(from, to)
    ),
    selectAllRows<unknown>((from, to) =>
      supabase
        .from("tickets")
        .select("id, event_id, payment_status, paystack_reference")
        .order("id", { ascending: true })
        .range(from, to)
    ),
    selectAllRows<unknown>((from, to) =>
      supabase
        .from("payment_receipts")
        .select("reference, event_id, payload")
        .order("reference", { ascending: true })
        .range(from, to)
    ),
    selectAllRows<unknown>((from, to) =>
      supabase
        .from("ticket_types")
        .select("id, event_id, name, price, quantity, available_quantity")
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);

  const report = buildEventSalesReport({
    events: eventRows.map(asEvent),
    tickets: ticketRows.map(asTicket),
    receipts: receiptRows.map(asReceipt),
    ticketTypes: ticketTypeRows.map(asTicketType),
    search: query.search,
    when: query.when,
    page: query.page,
    now,
  });

  const labels = new Map<string, string>();
  const events: PublicEventSalesRow[] = [];
  for (const event of report.events) {
    const { organizerId, ...rest } = event;
    events.push({
      ...rest,
      organizerLabel: await organizerLabel(organizerId, labels),
    });
  }

  return { ...report, events };
}
