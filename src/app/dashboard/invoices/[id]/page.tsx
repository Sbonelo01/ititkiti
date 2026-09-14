"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { getInvoice, submitInvoice } from "@/utils/invoicesApi";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import InvoiceDocument from "@/components/InvoiceDocument";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [invoice, setInvoice] = useState<OrganizerInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

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

  const handleSubmit = async () => {
    if (!invoice) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await submitInvoice(invoice.id);
      setInvoice(updated);
      setConfirmSubmit(false);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

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
        {invoice && (
          <div className="space-y-4">
            {invoice.status === "draft" && (
              <div className="print:hidden rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-700 leading-relaxed">{ORGANIZER_COPY.invoice.draftBanner}</p>
                {confirmSubmit ? (
                  <div className="mt-4 space-y-3">
                    <p className="font-semibold text-gray-900">{ORGANIZER_COPY.invoice.confirmSubmitTitle}</p>
                    <p className="text-sm text-gray-600">{ORGANIZER_COPY.invoice.confirmSubmitBody}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        {submitting ? ORGANIZER_COPY.invoice.submittingCta : ORGANIZER_COPY.invoice.submitCta}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setConfirmSubmit(false)}
                        className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSubmit(true)}
                    className="mt-4 rounded-xl bg-green-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-700"
                  >
                    {ORGANIZER_COPY.invoice.submitCta}
                  </button>
                )}
                {submitError && (
                  <p className="mt-3 text-sm text-red-700" role="alert">
                    {submitError}
                  </p>
                )}
              </div>
            )}
            {invoice.status === "issued" && (
              <p className="print:hidden text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                {ORGANIZER_COPY.invoice.submittedBanner}
              </p>
            )}
            <InvoiceDocument invoice={invoice} />
          </div>
        )}
      </div>
    </div>
  );
}
