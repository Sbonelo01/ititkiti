import { canGenerateInvoiceForEvent } from "@/utils/eventSchedule";

export type EventInvoiceSnapshot = {
  id: string;
  status: string;
  invoice_number: string;
  ticket_count: number;
};

export function isActiveInvoiceStatus(status: string): boolean {
  return status !== "void";
}

export function summarizeEventInvoices(invoices: EventInvoiceSnapshot[]) {
  const active = invoices.filter((inv) => isActiveInvoiceStatus(inv.status));
  const drafts = active.filter((inv) => inv.status === "draft");
  const submitted = active.filter((inv) => inv.status === "issued" || inv.status === "paid");
  const invoicedTicketCount = active.reduce((sum, inv) => sum + Number(inv.ticket_count || 0), 0);
  return { active, drafts, submitted, invoicedTicketCount };
}

export type EventInvoiceUiKind =
  | "event_in_future"
  | "no_paid_tickets"
  | "already_invoiced"
  | "draft_pending_submit"
  | "ready_to_generate";

export type EventInvoiceUi = {
  kind: EventInvoiceUiKind;
  canGenerate: boolean;
  draft: EventInvoiceSnapshot | null;
  latestActive: EventInvoiceSnapshot | null;
  uninvoicedTicketCount: number;
};

export function getEventInvoiceUi(input: {
  eventDate: string;
  paidTicketCount: number;
  invoices: EventInvoiceSnapshot[];
  now?: Date;
}): EventInvoiceUi {
  const { active, drafts, invoicedTicketCount } = summarizeEventInvoices(input.invoices);
  const draft = drafts[0] ?? null;
  const latestActive = active[0] ?? null;
  const uninvoicedTicketCount = Math.max(0, input.paidTicketCount - invoicedTicketCount);
  const eventStarted = canGenerateInvoiceForEvent(input.eventDate, input.now);

  if (!eventStarted) {
    return {
      kind: "event_in_future",
      canGenerate: false,
      draft,
      latestActive,
      uninvoicedTicketCount,
    };
  }

  if (draft) {
    return {
      kind: "draft_pending_submit",
      canGenerate: uninvoicedTicketCount > 0,
      draft,
      latestActive,
      uninvoicedTicketCount,
    };
  }

  if (input.paidTicketCount <= 0) {
    return {
      kind: "no_paid_tickets",
      canGenerate: false,
      draft,
      latestActive,
      uninvoicedTicketCount,
    };
  }

  if (uninvoicedTicketCount <= 0) {
    return {
      kind: "already_invoiced",
      canGenerate: false,
      draft,
      latestActive,
      uninvoicedTicketCount,
    };
  }

  return {
    kind: "ready_to_generate",
    canGenerate: true,
    draft,
    latestActive,
    uninvoicedTicketCount,
  };
}

export type SubmitInvoiceGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export function submitInvoiceGuard(input: {
  invoice: { status: string; organizer_id: string } | null;
  userId: string;
}): SubmitInvoiceGuardResult {
  if (!input.invoice) {
    return { ok: false, status: 404, error: "Invoice not found" };
  }
  if (input.invoice.organizer_id !== input.userId) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (input.invoice.status === "draft") {
    return { ok: true };
  }
  if (input.invoice.status === "issued") {
    return {
      ok: false,
      status: 409,
      error: "This invoice is already submitted for Tikiti settlement review.",
    };
  }
  return {
    ok: false,
    status: 409,
    error: `Cannot submit an invoice with status ${input.invoice.status}`,
  };
}
