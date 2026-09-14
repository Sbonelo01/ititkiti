"use client";

import Link from "next/link";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import InvoiceDocument from "@/components/InvoiceDocument";
import InvoiceStatusPill from "@/components/InvoiceStatusPill";
import TikitiWordmark from "@/components/TikitiWordmark";
import {
  ORGANIZER_COPY,
  organizerInvoicePill,
  type OrganizerPayoutProfile,
} from "@/constants/organizerCopy";
import type { EventInvoiceUi } from "@/server/invoices/invoiceEligibility";

export function formatZar(amount: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export type InvoiceMoneySummary = {
  faceValue: number;
  ticketsSold: number;
  buyerFees: number;
};

function payoutRows(profile: OrganizerPayoutProfile) {
  return [
    { label: "Company", value: profile.companyName },
    { label: "Name", value: [profile.name, profile.surname].filter(Boolean).join(" ") },
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.cellphone },
  ];
}

export function InvoiceMoneySummaryBlock({ summary }: { summary: InvoiceMoneySummary }) {
  const copy = ORGANIZER_COPY.invoice;
  return (
    <dl className="space-y-3">
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-[#166534]">{copy.grossLabel}</dt>
        <dd className="text-2xl font-bold text-gray-900 tabular-nums">{formatZar(summary.faceValue)}</dd>
      </div>
      <div className="flex justify-between text-sm">
        <dt className="text-gray-600">{copy.ticketsSoldLabel}</dt>
        <dd className="font-semibold tabular-nums">{summary.ticketsSold}</dd>
      </div>
      <div className="flex justify-between text-sm gap-4">
        <dt>
          <p className="text-gray-500">{copy.buyerFeesLabel}</p>
          <p className="text-xs text-gray-400">{copy.buyerFeesHint}</p>
        </dt>
        <dd className="font-medium tabular-nums text-gray-500">{formatZar(summary.buyerFees)}</dd>
      </div>
      <div className="flex justify-between items-end border-t border-[#22C55E]/20 pt-3">
        <dt>
          <p className="text-sm font-semibold text-gray-900">{copy.youReceiveLabel}</p>
          <p className="text-xs text-[#166534]">{copy.youReceiveHint}</p>
        </dt>
        <dd className="text-xl font-bold text-[#16A34A] tabular-nums">{formatZar(summary.faceValue)}</dd>
      </div>
    </dl>
  );
}

export function OrganizerPayoutFields({ profile }: { profile: OrganizerPayoutProfile }) {
  const rows = payoutRows(profile);
  const empty = rows.every((row) => !row.value);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#166534] mb-2">
        {ORGANIZER_COPY.invoice.payoutTitle}
      </p>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{ORGANIZER_COPY.invoice.payoutHint}</p>
      {empty ? (
        <p className="text-sm text-gray-500">{ORGANIZER_COPY.invoice.emptyProfile}</p>
      ) : (
        <dl className="space-y-1.5 text-sm">
          {rows.map((row) =>
            row.value ? (
              <div key={row.label} className="flex justify-between gap-3">
                <dt className="text-gray-500">{row.label}</dt>
                <dd className="font-medium text-gray-900 text-right">{row.value}</dd>
              </div>
            ) : null
          )}
        </dl>
      )}
    </div>
  );
}

type InvoiceSettlementWorkspaceProps = {
  ui: EventInvoiceUi;
  invoice: OrganizerInvoiceRecord | null;
  summary: InvoiceMoneySummary;
  profile: OrganizerPayoutProfile;
  generating: boolean;
  submitting: boolean;
  error: string | null;
  submittedJustNow?: boolean;
  onGenerate: () => void;
  onSubmit: () => void;
  onBack: () => void;
  showGenerate?: boolean;
};

export default function InvoiceSettlementWorkspace({
  ui,
  invoice,
  summary,
  profile,
  generating,
  submitting,
  error,
  submittedJustNow = false,
  onGenerate,
  onSubmit,
  onBack,
  showGenerate = true,
}: InvoiceSettlementWorkspaceProps) {
  const copy = ORGANIZER_COPY.invoice;
  const pill = organizerInvoicePill(ui);
  const canSubmit = invoice?.status === "draft" && !submitting;
  const readOnly = invoice?.status === "issued" || invoice?.status === "paid";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#F0FDF4]">
      <div className="lg:grid lg:grid-cols-5 lg:min-h-0 lg:flex-1">
        <aside className="lg:col-span-2 p-5 sm:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-[#22C55E]/15 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <TikitiWordmark />
            <InvoiceStatusPill pill={pill} />
          </div>
          <InvoiceMoneySummaryBlock summary={summary} />
          <OrganizerPayoutFields profile={profile} />
          <p className="text-xs text-gray-500 leading-relaxed">{ORGANIZER_COPY.feesExplainer}</p>
          <p className="text-xs text-gray-500">{copy.batchHelper}</p>
          <Link href={copy.timingFaqHref} className="text-xs font-semibold text-[#15803D] hover:underline">
            {copy.timingHelper}
          </Link>
          {submittedJustNow && invoice && (
            <div className="rounded-xl bg-white border border-[#22C55E]/30 p-3">
              <p className="text-sm font-semibold text-[#166534]">{copy.submittedSuccess}</p>
              <p className="text-xs text-gray-500 mt-1 font-mono">{invoice.invoice_number}</p>
            </div>
          )}
          {readOnly && invoice && !submittedJustNow && (
            <p className="text-sm text-[#166534]">{copy.alreadySubmittedHint}</p>
          )}
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2" role="alert">
              {error}
            </p>
          )}
        </aside>

        <section className="lg:col-span-3 min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
          {invoice ? (
            <InvoiceDocument invoice={invoice} showPrintButton={false} />
          ) : (
            <div className="h-full min-h-[12rem] flex items-center justify-center text-center text-sm text-gray-500 px-6">
              Generate an invoice to preview line items here.
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-[#22C55E]/20 bg-white/95 backdrop-blur px-4 py-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          {copy.backCta}
        </button>
        {invoice && (
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            {copy.downloadCta}
          </button>
        )}
        <div className="flex-1" />
        {showGenerate && ui.canGenerate && (
          <button
            type="button"
            disabled={generating}
            onClick={onGenerate}
            className="rounded-xl border border-[#16A34A] text-[#166534] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F0FDF4] disabled:opacity-50"
          >
            {generating ? copy.generatingCta : copy.generateSettlementCta}
          </button>
        )}
        {canSubmit && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              if (!window.confirm(copy.confirmSubmit)) return;
              onSubmit();
            }}
            className="rounded-xl bg-[#16A34A] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#15803D] disabled:opacity-50"
          >
            {submitting ? copy.submittingCta : copy.submitCta}
          </button>
        )}
      </div>
    </div>
  );
}
