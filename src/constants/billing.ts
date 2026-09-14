import { BRAND } from "@/constants/branding";

/** Legal entity billed on organizer invoices (invoice is addressed TO Tikiti). */
export const TIKITI_BILL_TO = {
  legalName: "IZIBONELO TECH PTY LTD",
  tradingAs: BRAND.name,
  email: "billing@tikiti.fun",
  vatNumber: process.env.TIKITI_VAT_NUMBER ?? "",
  address: process.env.TIKITI_BILLING_ADDRESS ?? "South Africa",
} as const;

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "void"];

/** Staff settlement actions — never applied to drafts. */
export const STAFF_INVOICE_STATUSES = ["paid", "void"] as const satisfies readonly InvoiceStatus[];
