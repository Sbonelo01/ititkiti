import { supabase } from "@/utils/supabaseClient";
import type { OrganizerInvoiceRecord } from "@/server/invoices/types";

async function authHeaders(): Promise<HeadersInit> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export async function generateInvoice(eventId: string): Promise<OrganizerInvoiceRecord> {
  const res = await fetch("/api/invoices/generate", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ eventId }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate invoice");
  }
  return data.invoice as OrganizerInvoiceRecord;
}

export async function listInvoices(): Promise<OrganizerInvoiceRecord[]> {
  const res = await fetch("/api/invoices", {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load invoices");
  }
  return data.invoices as OrganizerInvoiceRecord[];
}

export async function getInvoice(id: string): Promise<OrganizerInvoiceRecord> {
  const res = await fetch(`/api/invoices/${id}`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load invoice");
  }
  return data.invoice as OrganizerInvoiceRecord;
}

export async function updateInvoiceStatusClient(
  id: string,
  status: "paid" | "void"
): Promise<OrganizerInvoiceRecord> {
  const res = await fetch(`/api/invoices/${id}/status`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update invoice");
  }
  return data.invoice as OrganizerInvoiceRecord;
}
