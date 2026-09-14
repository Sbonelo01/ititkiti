"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { generateInvoice, getInvoice, submitInvoice } from "@/utils/invoicesApi";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import {
  getEventInvoiceUi,
  type EventInvoiceSnapshot,
} from "@/server/invoices/invoiceEligibility";
import {
  ORGANIZER_COPY,
  organizerInvoicePill,
  type OrganizerPayoutProfile,
} from "@/constants/organizerCopy";
import InvoiceStatusPill from "@/components/InvoiceStatusPill";
import InvoiceSettlementWorkspace, {
  InvoiceMoneySummaryBlock,
  OrganizerPayoutFields,
  type InvoiceMoneySummary,
} from "@/components/InvoiceSettlementWorkspace";

type EventInvoiceActionsProps = {
  eventId: string;
  eventDate: string;
  eventDateLabel: string;
  paidTicketCount: number;
  faceValue: number;
  buyerFees: number;
  invoices: EventInvoiceSnapshot[];
  profile: OrganizerPayoutProfile;
  onChanged?: () => void;
};

function kindReason(kind: ReturnType<typeof getEventInvoiceUi>["kind"]): string {
  const copy = ORGANIZER_COPY.invoice;
  switch (kind) {
    case "event_in_future":
      return copy.futureEvent;
    case "no_paid_tickets":
      return copy.noPaidTickets;
    case "already_invoiced":
      return copy.alreadyInvoiced;
    case "draft_pending_submit":
      return copy.draftHint;
    case "ready_to_generate":
      return copy.readyHint;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export default function EventInvoiceActions({
  eventId,
  eventDate,
  eventDateLabel,
  paidTicketCount,
  faceValue,
  buyerFees,
  invoices,
  profile,
  onChanged,
}: EventInvoiceActionsProps) {
  const copy = ORGANIZER_COPY.invoice;
  const ui = getEventInvoiceUi({ eventDate, paidTicketCount, invoices });
  const pill = organizerInvoicePill(ui);
  const summary: InvoiceMoneySummary = {
    faceValue,
    ticketsSold: paidTicketCount,
    buyerFees,
  };

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [invoice, setInvoice] = useState<OrganizerInvoiceRecord | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedJustNow, setSubmittedJustNow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openExisting = async (id: string) => {
    setError(null);
    setSubmittedJustNow(false);
    setWorkspaceOpen(true);
    try {
      setInvoice(await getInvoice(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoice");
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const created = await generateInvoice(eventId);
      setInvoice(created);
      onChanged?.();
      setWorkspaceOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate invoice");
      setWorkspaceOpen(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!invoice) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitInvoice(invoice.id);
      setInvoice(updated);
      onChanged?.();
      setSubmittedJustNow(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const workspaceUi = getEventInvoiceUi({
    eventDate,
    paidTicketCount,
    invoices: invoice
      ? [
          {
            id: invoice.id,
            status: invoice.status,
            invoice_number: invoice.invoice_number,
            ticket_count: invoice.ticket_count,
          },
          ...invoices.filter((inv) => inv.id !== invoice.id),
        ]
      : invoices,
  });
  const generateDisabled = !ui.canGenerate || generating;
  const previewTarget = ui.draft ?? ui.latestActive;

  return (
    <div className="rounded-2xl border border-[#22C55E]/20 bg-[#F0FDF4] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#166534]">{copy.cardTitle}</p>
        <InvoiceStatusPill pill={pill} />
      </div>

      <InvoiceMoneySummaryBlock summary={summary} />
      <OrganizerPayoutFields profile={profile} />

      <p className="text-xs text-gray-600 leading-relaxed">{kindReason(ui.kind)}</p>
      <p className="text-xs text-gray-500">
        {copy.batchHelper}{" "}
        <Link href={copy.timingFaqHref} className="font-semibold text-[#15803D] hover:underline">
          {copy.timingHelper}
        </Link>
      </p>

      {error && !workspaceOpen && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={generateDisabled}
          onClick={handleGenerate}
          className="w-full rounded-xl border border-[#16A34A] bg-white py-2.5 text-sm font-semibold text-[#166534] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? copy.generatingCta : copy.generateCta}
        </button>
        {previewTarget && previewTarget.status !== "draft" ? (
          <button
            type="button"
            onClick={() => openExisting(previewTarget.id)}
            className="w-full rounded-xl bg-[#16A34A] py-2.5 text-sm font-semibold text-white hover:bg-[#15803D]"
          >
            {copy.viewCta}
          </button>
        ) : (
          <button
            type="button"
            disabled={!ui.draft}
            onClick={() => ui.draft && openExisting(ui.draft.id)}
            className="w-full rounded-xl bg-[#16A34A] py-2.5 text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copy.submitCta}
          </button>
        )}
      </div>

      {mounted &&
        workspaceOpen &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex flex-col bg-black/50 lg:items-center lg:justify-center lg:p-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={copy.cardTitle}
              className="flex min-h-0 flex-1 flex-col bg-white shadow-2xl lg:max-h-[90vh] lg:w-full lg:max-w-6xl lg:rounded-2xl overflow-hidden"
            >
              <p className="sr-only">
                {eventDateLabel}
              </p>
              <InvoiceSettlementWorkspace
                ui={workspaceUi}
                invoice={invoice}
                summary={summary}
                profile={profile}
                generating={generating}
                submitting={submitting}
                error={error}
                submittedJustNow={submittedJustNow}
                onGenerate={handleGenerate}
                onSubmit={handleSubmit}
                onBack={() => setWorkspaceOpen(false)}
              />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
