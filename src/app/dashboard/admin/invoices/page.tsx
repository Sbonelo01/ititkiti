"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { listInvoices, updateInvoiceStatusClient } from "@/utils/invoicesApi";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function StaffInvoicesPage() {
  const [invoices, setInvoices] = useState<OrganizerInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const role = session?.user?.user_metadata?.role;
      if (!session || (role !== "admin" && role !== "staff")) {
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

  const handleStatus = async (invoiceId: string, status: "paid" | "void") => {
    if (!confirm(`Mark this invoice as ${status}?`)) return;
    setUpdatingId(invoiceId);
    try {
      const updated = await updateInvoiceStatusClient(invoiceId, status);
      setInvoices((prev) => prev.map((inv) => (inv.id === invoiceId ? updated : inv)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const formatMoney = (n: number) => `R${Number(n).toFixed(2)}`;
  const sellerName = (inv: OrganizerInvoiceRecord) => {
    const s = inv.seller as { companyName?: string; email?: string };
    return s.companyName || s.email || inv.organizer_id.slice(0, 8);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24 md:pb-8">
      <div className="bg-gray-900 text-white px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/dashboard/admin" className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-sm mb-4">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <h1 className="text-2xl font-bold">Organizer invoices</h1>
          <p className="text-gray-400 text-sm mt-1">Track settlement invoices issued to Tikiti</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading && <p className="text-gray-600">Loading…</p>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!loading && invoices.length === 0 && (
          <p className="text-gray-600">No organizer invoices yet.</p>
        )}
        {invoices.length > 0 && (
          <div className="overflow-x-auto bg-white rounded-xl shadow border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="p-3 font-semibold">Invoice</th>
                  <th className="p-3 font-semibold">Organizer</th>
                  <th className="p-3 font-semibold">Event</th>
                  <th className="p-3 font-semibold text-right">Tickets</th>
                  <th className="p-3 font-semibold text-right">Net due</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="p-3">
                      <Link href={`/dashboard/invoices/${inv.id}`} className="font-mono text-green-700 hover:underline">
                        {inv.invoice_number}
                      </Link>
                      <p className="text-xs text-gray-400">{new Date(inv.issued_at).toLocaleDateString("en-ZA")}</p>
                    </td>
                    <td className="p-3">{sellerName(inv)}</td>
                    <td className="p-3 max-w-[12rem] truncate">
                      {(inv.line_items as { event?: { title?: string } }).event?.title ?? "—"}
                    </td>
                    <td className="p-3 text-right tabular-nums">{inv.ticket_count}</td>
                    <td className="p-3 text-right tabular-nums font-semibold">{formatMoney(inv.net_amount_due)}</td>
                    <td className="p-3">
                      <span className="text-xs font-bold uppercase">{inv.status}</span>
                    </td>
                    <td className="p-3 space-x-2 whitespace-nowrap">
                      {inv.status === "issued" && (
                        <>
                          <button
                            type="button"
                            disabled={updatingId === inv.id}
                            onClick={() => handleStatus(inv.id, "paid")}
                            className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
                          >
                            Mark paid
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === inv.id}
                            onClick={() => handleStatus(inv.id, "void")}
                            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            Void
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
