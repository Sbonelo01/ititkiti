"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { getInvoice } from "@/utils/invoicesApi";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import InvoiceDocument from "@/components/InvoiceDocument";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [invoice, setInvoice] = useState<OrganizerInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?redirect=/dashboard/invoices/${id}`);
        return;
      }
      try {
        setInvoice(await getInvoice(id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white pb-24 md:pb-8 print:bg-white print:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1 text-green-700 font-medium text-sm mb-6 print:hidden"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          All invoices
        </Link>
        {loading && <p className="text-gray-600">Loading invoice…</p>}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
        )}
        {invoice && <InvoiceDocument invoice={invoice} />}
      </div>
    </div>
  );
}
