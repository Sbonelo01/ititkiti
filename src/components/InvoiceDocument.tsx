"use client";

import { BRAND } from "@/constants/branding";
import type { InvoiceLineItems, OrganizerInvoiceRecord } from "@/server/invoices/types";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type BillParty = {
  legalName?: string;
  tradingAs?: string;
  email?: string;
  vatNumber?: string;
  address?: string;
  companyName?: string;
  name?: string;
  surname?: string;
  cellphone?: string;
};

type InvoiceDocumentProps = {
  invoice: OrganizerInvoiceRecord;
  showPrintButton?: boolean;
};

export default function InvoiceDocument({ invoice, showPrintButton = true }: InvoiceDocumentProps) {
  const lineItems = invoice.line_items as InvoiceLineItems;
  const billTo = invoice.bill_to as BillParty;
  const seller = invoice.seller as BillParty;

  const statusColors: Record<string, string> = {
    issued: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    void: "bg-gray-200 text-gray-700",
  };

  return (
    <article className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden print:shadow-none print:border-0">
      <header className="border-b border-gray-200 px-6 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">{BRAND.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Organizer invoice</h1>
          <p className="text-sm text-gray-500 mt-1">Invoice #{invoice.invoice_number}</p>
        </div>
        <div className="text-left sm:text-right space-y-2">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${statusColors[invoice.status] ?? "bg-gray-100"}`}
          >
            {invoice.status}
          </span>
          <p className="text-sm text-gray-600">Issued {formatDate(invoice.issued_at)}</p>
          {showPrintButton && (
            <button
              type="button"
              onClick={() => window.print()}
              className="print:hidden mt-2 text-sm font-semibold text-green-700 hover:underline"
            >
              Print / Save PDF
            </button>
          )}
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-6 px-6 py-5 sm:px-8 border-b border-gray-100 bg-gray-50/50">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">Bill to</p>
          <p className="font-semibold text-gray-900">{billTo.legalName ?? billTo.tradingAs ?? BRAND.name}</p>
          {billTo.tradingAs && billTo.legalName && (
            <p className="text-sm text-gray-600">Trading as {billTo.tradingAs}</p>
          )}
          {billTo.email && <p className="text-sm text-gray-600 mt-1">{billTo.email}</p>}
          {billTo.vatNumber && <p className="text-sm text-gray-600">VAT: {billTo.vatNumber}</p>}
          {billTo.address && <p className="text-sm text-gray-600">{billTo.address}</p>}
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-gray-500 mb-2">From (organizer)</p>
          <p className="font-semibold text-gray-900">
            {seller.companyName ||
              [seller.name, seller.surname].filter(Boolean).join(" ") ||
              "Event organizer"}
          </p>
          {seller.email && <p className="text-sm text-gray-600 mt-1">{seller.email}</p>}
          {seller.cellphone && <p className="text-sm text-gray-600">{seller.cellphone}</p>}
        </div>
      </div>

      <div className="px-6 py-4 sm:px-8 border-b border-gray-100">
        <p className="text-xs font-bold uppercase text-gray-500 mb-1">Event</p>
        <p className="font-semibold text-gray-900">{lineItems.event.title}</p>
        <p className="text-sm text-gray-600">{formatDate(lineItems.event.date)} · {lineItems.event.location}</p>
      </div>

      <div className="px-6 py-5 sm:px-8">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Ticket sales by type</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-4 font-semibold">Ticket type</th>
                <th className="py-2 pr-4 font-semibold text-right">Unit price</th>
                <th className="py-2 pr-4 font-semibold text-right">Qty</th>
                <th className="py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.byTicketType.map((row) => (
                <tr key={row.ticketTypeId ?? row.name} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 text-gray-900">{row.name}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatMoney(row.unitPrice, invoice.currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{row.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">
                    {formatMoney(row.lineTotal, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 pb-5 sm:px-8">
        <h2 className="text-sm font-bold uppercase text-gray-500 mb-3">Purchases (audit trail)</h2>
        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
          <table className="w-full text-xs sm:text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="py-2 px-3 font-semibold">Date</th>
                <th className="py-2 px-3 font-semibold">Paystack ref</th>
                <th className="py-2 px-3 font-semibold">Buyer</th>
                <th className="py-2 px-3 font-semibold text-right">Tickets</th>
                <th className="py-2 px-3 font-semibold text-right">Revenue</th>
                <th className="py-2 px-3 font-semibold text-right">Platform fee</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.byPurchase.map((row) => (
                <tr key={row.paystackReference ?? row.ticketIds.join("-")} className="border-t border-gray-100">
                  <td className="py-2 px-3 whitespace-nowrap">{formatDate(row.purchasedAt)}</td>
                  <td className="py-2 px-3 font-mono text-[11px] max-w-[8rem] truncate" title={row.paystackReference ?? undefined}>
                    {row.paystackReference ?? "—"}
                  </td>
                  <td className="py-2 px-3 max-w-[10rem] truncate">{row.buyerEmail}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{row.ticketCount}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatMoney(row.ticketRevenue, invoice.currency)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatMoney(row.serviceFee, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="px-6 py-5 sm:px-8 bg-gray-50 border-t border-gray-200 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Gross ticket revenue</span>
          <span className="font-semibold tabular-nums">
            {formatMoney(invoice.ticket_revenue, invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">
            Tikiti platform fee ({formatMoney(invoice.service_fee_per_ticket, invoice.currency)} ×{" "}
            {invoice.ticket_count} tickets)
          </span>
          <span className="font-semibold tabular-nums text-red-700">
            − {formatMoney(invoice.service_fee_total, invoice.currency)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-300 text-base">
          <span className="font-bold text-gray-900">Net amount due to organizer</span>
          <span className="font-bold text-green-700 tabular-nums">
            {formatMoney(invoice.net_amount_due, invoice.currency)}
          </span>
        </div>
        <p className="text-xs text-gray-500 pt-2 leading-relaxed">
          This invoice is generated from verified paid tickets in Tikiti. Amounts match recorded sales
          at generation time. Platform fees are retained by Tikiti; net amount is payable to the organizer
          per your agreement.
        </p>
      </footer>
    </article>
  );
}
