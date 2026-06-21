import { BRAND } from "@/constants/branding";

/** Legal entity billed on organizer invoices (invoice is addressed TO Tikiti). */
export const TIKITI_BILL_TO = {
  legalName: "IZIBONELO TECH PTY LTD",
  tradingAs: BRAND.name,
  email: "billing@tikiti.fun",
  vatNumber: process.env.TIKITI_VAT_NUMBER ?? "",
  address: process.env.TIKITI_BILLING_ADDRESS ?? "South Africa",
} as const;

export type InvoiceStatus = "issued" | "paid" | "void";

export const INVOICE_STATUSES: InvoiceStatus[] = ["issued", "paid", "void"];
