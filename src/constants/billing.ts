import { BRAND } from "@/constants/branding";

/** Previous invoice contact. Display and new invoices use info@tikiti.fun. */
export const RETIRED_TIKITI_BILLING_EMAIL = "billing@tikiti.fun";

/** Legal entity billed on organizer invoices (invoice is addressed TO Tikiti). */
export const TIKITI_BILL_TO = {
  legalName: "IZIBONELO TECH PTY LTD",
  tradingAs: BRAND.name,
  email: "info@tikiti.fun",
  vatNumber: process.env.TIKITI_VAT_NUMBER ?? "",
  address: process.env.TIKITI_BILLING_ADDRESS ?? "South Africa",
} as const;

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "issued", "paid", "void"];

/** Staff settlement actions — never applied to drafts. */
export const STAFF_INVOICE_STATUSES = ["paid", "void"] as const satisfies readonly InvoiceStatus[];

/** Show the current Tikiti contact, including invoices saved with the old billing address. */
export function visibleTikitiBillToEmail(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const value = email.trim();
  if (!value) return null;
  if (value.toLowerCase() === RETIRED_TIKITI_BILLING_EMAIL) return TIKITI_BILL_TO.email;
  return value;
}
