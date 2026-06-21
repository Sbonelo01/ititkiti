import { User } from "@supabase/supabase-js";
import { TIKITI_BILL_TO } from "@/constants/billing";
import { SERVICE_FEE_PER_TICKET } from "@/constants/pricing";
import { getSupabaseAdmin } from "@/server/supabaseAdmin";
import {
  buildInvoiceLineItems,
  roundMoney,
  type RawInvoiceTicket,
} from "@/server/invoices/buildInvoiceLineItems";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";

export type GenerateInvoiceResult =
  | { ok: true; invoice: OrganizerInvoiceRecord }
  | { ok: false; status: number; error: string };

function sellerFromUser(user: User) {
  const meta = user.user_metadata ?? {};
  return {
    userId: user.id,
    email: user.email ?? "",
    name: (meta.name as string | undefined) ?? "",
    surname: (meta.surname as string | undefined) ?? "",
    companyName: (meta.company_name as string | undefined) ?? "",
    cellphone: (meta.cellphone as string | undefined) ?? "",
  };
}

export async function generateOrganizerInvoice(
  organizer: User,
  eventId: string
): Promise<GenerateInvoiceResult> {
  const supabase = getSupabaseAdmin();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, date, location, price, organizer_id")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return { ok: false, status: 404, error: "Event not found" };
  }

  if (event.organizer_id !== organizer.id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const { data: invoicesForEvent, error: invoicesError } = await supabase
    .from("organizer_invoices")
    .select("id")
    .eq("event_id", eventId)
    .eq("organizer_id", organizer.id)
    .neq("status", "void");

  if (invoicesError) {
    return { ok: false, status: 500, error: "Failed to check existing invoices" };
  }

  const invoiceIds = (invoicesForEvent ?? []).map((row) => row.id as string);
  let invoicedIds = new Set<string>();

  if (invoiceIds.length > 0) {
    const { data: links, error: linksError } = await supabase
      .from("organizer_invoice_tickets")
      .select("ticket_id")
      .in("invoice_id", invoiceIds);

    if (linksError) {
      return { ok: false, status: 500, error: "Failed to check invoiced tickets" };
    }

    invoicedIds = new Set((links ?? []).map((row) => row.ticket_id as string));
  }

  const { data: tickets, error: ticketsError } = await supabase
    .from("tickets")
    .select(`
      id,
      ticket_type_id,
      paystack_reference,
      created_at,
      email,
      payment_status,
      ticket_types ( id, name, price )
    `)
    .eq("event_id", eventId)
    .eq("payment_status", "paid")
    .order("created_at", { ascending: true });

  if (ticketsError) {
    return { ok: false, status: 500, error: "Failed to load ticket sales" };
  }

  const eligible = (tickets ?? []).filter((t) => !invoicedIds.has(t.id));

  if (eligible.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "No uninvoiced paid tickets for this event. All sales may already be on an invoice.",
    };
  }

  const lineItems = buildInvoiceLineItems({
    event,
    tickets: eligible as RawInvoiceTicket[],
    serviceFeePerTicket: SERVICE_FEE_PER_TICKET,
  });

  const { data: invoiceNumber, error: numberError } = await supabase.rpc(
    "next_organizer_invoice_number"
  );

  if (numberError || !invoiceNumber) {
    return { ok: false, status: 500, error: "Failed to allocate invoice number" };
  }

  const ticketRevenue = lineItems.totals.ticketRevenue;
  const serviceFeeTotal = lineItems.totals.serviceFeeTotal;
  const netAmountDue = lineItems.totals.netAmountDueToOrganizer;

  const { data: invoice, error: insertError } = await supabase
    .from("organizer_invoices")
    .insert({
      invoice_number: invoiceNumber as string,
      organizer_id: organizer.id,
      event_id: eventId,
      status: "issued",
      currency: "ZAR",
      ticket_count: lineItems.totals.ticketCount,
      ticket_revenue: ticketRevenue,
      service_fee_per_ticket: SERVICE_FEE_PER_TICKET,
      service_fee_total: serviceFeeTotal,
      net_amount_due: netAmountDue,
      bill_to: TIKITI_BILL_TO,
      seller: sellerFromUser(organizer),
      line_items: lineItems,
      issued_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (insertError || !invoice) {
    return { ok: false, status: 500, error: "Failed to save invoice" };
  }

  const ticketLinks = eligible.map((t) => ({
    invoice_id: invoice.id,
    ticket_id: t.id,
  }));

  const { error: linkError } = await supabase.from("organizer_invoice_tickets").insert(ticketLinks);

  if (linkError) {
    await supabase.from("organizer_invoices").delete().eq("id", invoice.id);
    return { ok: false, status: 500, error: "Failed to link tickets to invoice" };
  }

  // Post-insert verification against stored totals
  const verifyRevenue = eligible.reduce((sum, t) => {
    const tt = t.ticket_types as { price?: number } | { price?: number }[] | null;
    let price = event.price;
    if (Array.isArray(tt) && tt[0]?.price != null) price = Number(tt[0].price);
    else if (tt && !Array.isArray(tt) && tt.price != null) price = Number(tt.price);
    return sum + price;
  }, 0);

  if (
    roundMoney(verifyRevenue) !== roundMoney(Number(invoice.ticket_revenue)) ||
    lineItems.totals.ticketCount !== invoice.ticket_count
  ) {
    await supabase.from("organizer_invoices").delete().eq("id", invoice.id);
    return { ok: false, status: 500, error: "Invoice verification failed" };
  }

  return { ok: true, invoice: invoice as OrganizerInvoiceRecord };
}

export async function listInvoicesForUser(
  user: User,
  isStaff: boolean
): Promise<OrganizerInvoiceRecord[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("organizer_invoices")
    .select("*")
    .order("issued_at", { ascending: false });

  if (!isStaff) {
    query = query.eq("organizer_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrganizerInvoiceRecord[];
}

export async function getInvoiceById(
  invoiceId: string
): Promise<OrganizerInvoiceRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("organizer_invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrganizerInvoiceRecord | null) ?? null;
}

export type UpdateInvoiceStatusResult =
  | { ok: true; invoice: OrganizerInvoiceRecord }
  | { ok: false; status: number; error: string };

export async function updateInvoiceStatus(
  invoiceId: string,
  status: "paid" | "void"
): Promise<UpdateInvoiceStatusResult> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const patch: Record<string, string> = {
    status,
    updated_at: now,
  };

  if (status === "paid") {
    patch.paid_at = now;
  } else {
    patch.voided_at = now;
  }

  const { data, error } = await supabase
    .from("organizer_invoices")
    .update(patch)
    .eq("id", invoiceId)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, status: 404, error: "Invoice not found" };
  }

  return { ok: true, invoice: data as OrganizerInvoiceRecord };
}
