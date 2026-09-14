"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DocumentTextIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { generateInvoice } from "@/utils/invoicesApi";
import {
  getEventInvoiceUi,
  type EventInvoiceSnapshot,
} from "@/server/invoices/invoiceEligibility";
import { ORGANIZER_COPY, invoiceStatusLabel } from "@/constants/organizerCopy";

type EventInvoiceActionsProps = {
  eventId: string;
  eventDate: string;
  eventDateLabel: string;
  paidTicketCount: number;
  invoices: EventInvoiceSnapshot[];
};

function kindHint(kind: ReturnType<typeof getEventInvoiceUi>["kind"], eventDateLabel: string): string {
  switch (kind) {
    case "event_in_future":
      return `${ORGANIZER_COPY.invoice.futureEvent} (${eventDateLabel})`;
    case "no_paid_tickets":
      return ORGANIZER_COPY.invoice.noPaidTickets;
    case "already_invoiced":
      return ORGANIZER_COPY.invoice.alreadyInvoiced;
    case "draft_pending_submit":
      return ORGANIZER_COPY.invoice.draftBanner;
    case "ready_to_generate":
      return ORGANIZER_COPY.invoice.readyHint;
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
  invoices,
}: EventInvoiceActionsProps) {
  const router = useRouter();
  const ui = getEventInvoiceUi({ eventDate, paidTicketCount, invoices });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const invoice = await generateInvoice(eventId);
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate invoice");
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Invoice to Tikiti</p>
        {ui.latestActive && (
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
            {invoiceStatusLabel(ui.latestActive.status)}
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">{kindHint(ui.kind, eventDateLabel)}</p>

      {ui.draft && (
        <Link
          href={`/dashboard/invoices/${ui.draft.id}`}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
        >
          <DocumentTextIcon className="h-4 w-4" aria-hidden />
          {ORGANIZER_COPY.invoice.reviewDraftCta}
        </Link>
      )}

      {!ui.draft && ui.latestActive && !ui.canGenerate && (
        <Link
          href={`/dashboard/invoices/${ui.latestActive.id}`}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-white text-green-800 py-2.5 text-sm font-semibold hover:bg-green-50 transition-colors"
        >
          <CheckCircleIcon className="h-4 w-4" aria-hidden />
          {ORGANIZER_COPY.invoice.viewCta} {ui.latestActive.invoice_number}
        </Link>
      )}

      {ui.canGenerate && (
        confirming ? (
          <div className="rounded-lg border border-green-200 bg-white p-3 space-y-2">
            <p className="text-sm font-semibold text-gray-900">{ORGANIZER_COPY.invoice.confirmGenerateTitle}</p>
            <p className="text-xs text-gray-600 leading-relaxed">{ORGANIZER_COPY.invoice.confirmGenerateBody}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleGenerate}
                className="flex-1 rounded-lg bg-green-600 text-white py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {busy ? ORGANIZER_COPY.invoice.generatingCta : ORGANIZER_COPY.invoice.generateCta}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
          >
            <DocumentTextIcon className="h-4 w-4" aria-hidden />
            {ORGANIZER_COPY.invoice.generateCta}
          </button>
        )
      )}

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
