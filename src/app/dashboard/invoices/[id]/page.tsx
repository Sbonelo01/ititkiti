"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { getInvoice, submitInvoice } from "@/utils/invoicesApi";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";
import { getEventInvoiceUi } from "@/server/invoices/invoiceEligibility";
import {
  ORGANIZER_COPY,
  payoutProfileFromMetadata,
  type OrganizerPayoutProfile,
} from "@/constants/organizerCopy";
import InvoiceSettlementWorkspace from "@/components/InvoiceSettlementWorkspace";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

function sellerToProfile(seller: Record<string, unknown>, fallback: OrganizerPayoutProfile): OrganizerPayoutProfile {
  return {
    email: typeof seller.email === "string" ? seller.email : fallback.email,
    name: typeof seller.name === "string" ? seller.name : fallback.name,
    surname: typeof seller.surname === "string" ? seller.surname : fallback.surname,
    companyName: typeof seller.companyName === "string" ? seller.companyName : fallback.companyName,
    cellphone: typeof seller.cellphone === "string" ? seller.cellphone : fallback.cellphone,
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [invoice, setInvoice] = useState<OrganizerInvoiceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedJustNow, setSubmittedJustNow] = useState(false);
  const [profile, setProfile] = useState<OrganizerPayoutProfile>({
    email: "",
    name: "",
    surname: "",
    companyName: "",
    cellphone: "",
  });

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/login?redirect=/dashboard/invoices/${id}`);
        return;
      }
      setProfile(payoutProfileFromMetadata(session.user.email, session.user.user_metadata));
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

  const ui = useMemo(() => {
    if (!invoice) {
      return getEventInvoiceUi({ eventDate: "1970-01-01T00:00:00.000Z", paidTicketCount: 0, invoices: [] });
    }
    return getEventInvoiceUi({
      eventDate: invoice.line_items?.event?.date ?? invoice.issued_at,
      paidTicketCount: invoice.ticket_count,
      invoices: [
        {
          id: invoice.id,
          status: invoice.status,
          invoice_number: invoice.invoice_number,
          ticket_count: invoice.ticket_count,
        },
      ],
    });
  }, [invoice]);

  const handleSubmit = async () => {
    if (!invoice) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitInvoice(invoice.id);
      setInvoice(updated);
      setSubmittedJustNow(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] pb-24 md:pb-8 print:bg-white print:pb-0">
      <div className="max-w-6xl mx-auto px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1 text-[#15803D] font-medium text-sm mb-6 print:hidden"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          {ORGANIZER_COPY.invoice.listTitle}
        </Link>
        {loading && <p className="text-gray-600">Loading invoice…</p>}
        {error && !invoice && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 text-sm">{error}</div>
        )}
        {invoice && (
          <div className="rounded-2xl overflow-hidden border border-[#22C55E]/20 shadow-lg min-h-[70vh]">
            <InvoiceSettlementWorkspace
              ui={ui}
              invoice={invoice}
              summary={{
                faceValue: Number(invoice.ticket_revenue) || 0,
                ticketsSold: invoice.ticket_count,
                buyerFees: Number(invoice.service_fee_total) || 0,
              }}
              profile={sellerToProfile(invoice.seller, profile)}
              generating={false}
              submitting={submitting}
              error={error}
              submittedJustNow={submittedJustNow}
              onGenerate={() => undefined}
              onSubmit={handleSubmit}
              onBack={() => router.push("/dashboard/invoices")}
              showGenerate={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
