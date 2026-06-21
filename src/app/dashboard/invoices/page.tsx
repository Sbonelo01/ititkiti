"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { listInvoices } from "@/utils/invoicesApi";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import { DocumentTextIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function OrganizerInvoicesPage() {
  const [invoices, setInvoices] = useState<OrganizerInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/dashboard/invoices");
        return;
      }
      const role = session.user.user_metadata?.role;
      if (role !== "organizer") {
        router.push("/dashboard");
        return;
      }
      try {
        setInvoices(await listInvoices());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const formatMoney = (n: number) => `R${Number(n).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24 md:pb-8">
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-green-100 hover:text-white text-sm mb-4">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold">Invoices to Tikiti</h1>
          <p className="text-green-100 mt-1 text-sm sm:text-base">
            Settlement invoices from your ticket sales — generated from paid tickets only.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && <p className="text-gray-600">Loading invoices…</p>}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
        )}
        {!loading && !error && invoices.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center border border-gray-100">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden />
            <p className="text-gray-700 font-medium">No invoices yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Generate an invoice from an event with paid ticket sales on your dashboard.
            </p>
            <Link href="/dashboard" className="inline-block mt-4 text-green-700 font-semibold hover:underline">
              Go to dashboard
            </Link>
          </div>
        )}
        {!loading && invoices.length > 0 && (
          <ul className="space-y-3">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-green-200 hover:shadow-md transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{inv.invoice_number}</p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {(inv.line_items as { event?: { title?: string } }).event?.title ?? "Event"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(inv.issued_at).toLocaleDateString("en-ZA")} · {inv.ticket_count} tickets
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {inv.status}
                      </span>
                      <p className="font-bold text-green-700 mt-2 tabular-nums">{formatMoney(inv.net_amount_due)}</p>
                      <p className="text-xs text-gray-500">net due</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
