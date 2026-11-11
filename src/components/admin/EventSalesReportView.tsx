"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { roundZar } from "@/constants/pricing";
import { formatEventWhen } from "@/utils/upcomingEvents";
import type {
  EventSalesFigures,
  PublicEventSalesDashboard,
  PublicEventSalesRow,
  SalesMoneyStatus,
  SalesWhen,
  ScheduleStatus,
} from "@/server/admin/eventSalesReport";

type Props = {
  report: PublicEventSalesDashboard | null;
  search: string;
  when: SalesWhen;
  loading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onWhenChange: (value: SalesWhen) => void;
  onSubmit: () => void;
  onRefresh: () => void;
  onPage: (page: number) => void;
};

function formatZarCents(amount: number): string {
  return `R${roundZar(amount).toFixed(2)}`;
}

function scheduleLabel(status: ScheduleStatus): string {
  switch (status) {
    case "upcoming":
      return "Upcoming";
    case "past":
      return "Past";
    case "date_unavailable":
      return "Date unavailable";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

function moneyText(status: SalesMoneyStatus, amount: number | null): string {
  switch (status) {
    case "no_sales":
      return formatZarCents(0);
    case "complete":
      return formatZarCents(amount ?? 0);
    case "incomplete":
      return "Unknown";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

function moneyCaption(status: SalesMoneyStatus): string {
  switch (status) {
    case "no_sales":
      return "No paid sales in this view.";
    case "complete":
      return "From stored payment snapshots. Organisers keep 100% of this face value. The buyer platform fee is not deducted.";
    case "incomplete":
      return "Incomplete. Missing purchase snapshots are not shown as zero and are not estimated from today's ticket prices.";
    default: {
      const unexpected: never = status;
      return unexpected;
    }
  }
}

function MoneyTrio({ figures }: { figures: EventSalesFigures }) {
  const rows = [
    ["Face value", figures.faceValueZar],
    ["Buyer platform fee", figures.platformFeeZar],
    ["Collected from buyers", figures.collectedZar],
  ] as const;
  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {rows.map(([label, amount]) => (
        <div key={label}>
          <dt className="text-xs font-medium text-gray-500">{label}</dt>
          <dd className="text-sm font-semibold tabular-nums text-gray-900">
            {moneyText(figures.moneyStatus, amount)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function VerifiedSubset({ figures }: { figures: EventSalesFigures }) {
  if (figures.moneyStatus !== "incomplete" || figures.verifiedOrders === 0) return null;
  return (
    <p className="mt-2 text-xs text-amber-800">
      Verified snapshot subset, not the full total: face {formatZarCents(figures.verifiedFaceValueZar)},
      buyer fee {formatZarCents(figures.verifiedPlatformFeeZar)}, collected{" "}
      {formatZarCents(figures.verifiedCollectedZar)}. Covers {figures.verifiedTickets} of{" "}
      {figures.paidTickets} paid tickets ({figures.verifiedOrders} orders).
    </p>
  );
}

function EventCard({ event }: { event: PublicEventSalesRow }) {
  const when = event.startsAt ? formatEventWhen(event.startsAt) : "No date stored";
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-bold text-gray-900">{event.title}</h2>
        <div className="flex flex-wrap gap-1">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            Listed
          </span>
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-800">
            {scheduleLabel(event.scheduleStatus)}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-600">{when}</p>
      <p className="mt-1 text-sm text-gray-700">
        <span className="text-gray-500">Organiser: </span>
        {event.organizerLabel}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-gray-500">Paid tickets</dt>
          <dd className="font-semibold tabular-nums">{event.paidTickets}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Orders</dt>
          <dd className="font-semibold tabular-nums">{event.referencedOrders}</dd>
        </div>
      </dl>
      <p className="mt-1 text-xs text-gray-500">
        Orders are distinct payment references. Several tickets can share one order.
      </p>
      {event.unreferencedPaidTickets > 0 && (
        <p className="mt-2 text-xs text-amber-800">
          {event.unreferencedPaidTickets} paid ticket
          {event.unreferencedPaidTickets === 1 ? "" : "s"} have no payment reference. No ZAR amount
          is assigned to them.
        </p>
      )}
      {event.unlinkedReceipts > 0 && (
        <p className="mt-2 text-xs text-amber-800">
          {event.unlinkedReceipts} payment receipt
          {event.unlinkedReceipts === 1 ? "" : "s"} are not linked to a paid ticket reference. They
          are not counted as orders and are not priced.
        </p>
      )}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <MoneyTrio figures={event} />
        <p className="mt-2 text-xs text-gray-500">{moneyCaption(event.moneyStatus)}</p>
        <VerifiedSubset figures={event} />
      </div>
    </article>
  );
}

export default function EventSalesReportView({
  report,
  search,
  when,
  loading,
  error,
  onSearchChange,
  onWhenChange,
  onSubmit,
  onRefresh,
  onPage,
}: Props) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const snapshotLabel = report ? formatSnapshot(report.generatedAt) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24 md:pb-8">
      <div className="bg-gray-900 px-4 py-8 text-white">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/dashboard/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-300 hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <h1 className="text-2xl font-bold">Events and sales</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-300">
            Listed events across organisers, paid tickets, and stored ZAR amounts. This is a
            snapshot from the last load, not a live feed.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-medium text-gray-700">
            Search title
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              placeholder="Event title"
              maxLength={200}
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Time
            <select
              value={when}
              onChange={(event) => onWhenChange(event.target.value as SalesWhen)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm sm:w-40"
            >
              <option value="all">All</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh snapshot"}
          </button>
        </form>

        <p className="mb-4 text-sm text-gray-600" role="status" aria-live="polite">
          {snapshotLabel
            ? `Last updated ${snapshotLabel}. Refresh to load a new snapshot. Figures do not update on their own.`
            : "No snapshot loaded yet."}
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading && !report && <p className="text-sm text-gray-600">Loading the sales snapshot…</p>}

        {report && (
          <>
            <section className="mb-6 rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-800">
                Totals for this filter ({report.totals.listedEvents} listed event
                {report.totals.listedEvents === 1 ? "" : "s"}, all pages)
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-gray-500">Paid tickets</dt>
                  <dd className="text-xl font-bold tabular-nums text-gray-900">{report.totals.paidTickets}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Orders</dt>
                  <dd className="text-xl font-bold tabular-nums text-gray-900">
                    {report.totals.referencedOrders}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Face value</dt>
                  <dd className="text-xl font-bold tabular-nums text-green-800">
                    {moneyText(report.totals.moneyStatus, report.totals.faceValueZar)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Collected</dt>
                  <dd className="text-xl font-bold tabular-nums text-gray-900">
                    {moneyText(report.totals.moneyStatus, report.totals.collectedZar)}
                  </dd>
                </div>
              </dl>
              <div className="mt-3">
                <MoneyTrio figures={report.totals} />
              </div>
              <p className="mt-2 text-xs text-gray-500">{moneyCaption(report.totals.moneyStatus)}</p>
              <VerifiedSubset figures={report.totals} />
              <WarningList report={report} />
            </section>

            {report.events.length === 0 ? (
              <p className="text-sm text-gray-600">No listed events match this filter.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {report.events.map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Page {report.page} of {report.pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={report.page <= 1 || loading}
                  onClick={() => onPage(report.page - 1)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={report.page >= report.pageCount || loading}
                  onClick={() => onPage(report.page + 1)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            <details className="mt-8 rounded-2xl border border-gray-100 bg-white p-4 text-sm text-gray-700">
              <summary className="cursor-pointer font-semibold text-gray-900">
                How these figures are counted
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Every row in events is listed. There is no separate published or draft status.</li>
                <li>Upcoming and past use the event date compared with the snapshot time.</li>
                <li>A paid ticket is a distinct ticket whose payment status is paid.</li>
                <li>
                  An order is one stored payment reference. Tickets that share a reference are one
                  order, including mixed ticket types.
                </li>
                <li>
                  Face value, buyer platform fee, and collected amount are shown only when the
                  payment receipt stores them. Today&apos;s event or ticket-type prices are not used.
                  Organiser invoices are not used.
                </li>
                <li>
                  Unpaid, failed, cancelled, refunded, and blank statuses are excluded. Tikiti has
                  no refund ledger, so those rows are omitted rather than subtracted.
                </li>
                <li>Organiser names come from the account profile. Email addresses are not shown.</li>
              </ul>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

function WarningList({ report }: { report: PublicEventSalesDashboard }) {
  const { warnings, totals } = report;
  const items: string[] = [];
  if (totals.excludedNonPaidTickets > 0) {
    items.push(
      `${totals.excludedNonPaidTickets} tickets in this filter are not paid, so they are excluded from successful sales and are not treated as refunds.`
    );
  }
  if (totals.unreferencedPaidTickets > 0) {
    items.push(
      `${totals.unreferencedPaidTickets} paid tickets have no payment reference, so their sales amount is unknown.`
    );
  }
  if (totals.unlinkedReceipts > 0) {
    items.push(
      `${totals.unlinkedReceipts} payment receipts are not linked to a paid ticket reference.`
    );
  }
  if (warnings.inconsistentReferences > 0) {
    items.push(
      `${warnings.inconsistentReferences} payment references point at more than one event, so they are not assigned to an event order total.`
    );
  }
  if (warnings.omittedPaidTickets > 0) {
    items.push(
      `${warnings.omittedPaidTickets} paid tickets are not on a listed event and are outside these totals.`
    );
  }
  if (warnings.omittedReceipts > 0) {
    items.push(
      `${warnings.omittedReceipts} payment receipts are not on a listed event and are outside these totals.`
    );
  }
  if (
    warnings.skippedEventRows > 0 ||
    warnings.skippedTicketRows > 0 ||
    warnings.skippedReceiptRows > 0 ||
    warnings.conflictingTicketIds > 0
  ) {
    items.push(
      "Some rows were skipped or conflicted, so a ZAR total for this filter would be incomplete."
    );
  }
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-900">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function formatSnapshot(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
