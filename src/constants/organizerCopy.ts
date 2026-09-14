import { BRAND, ORGANIZER_APP } from "@/constants/branding";

/** Organizer-facing copy. Swap strings here when design/copy land — do not scatter literals. */
export const ORGANIZER_COPY = {
  invoice: {
    generateCta: "Generate invoice",
    generatingCta: "Generating invoice…",
    submitCta: "Submit for Tikiti settlement",
    submittingCta: "Submitting…",
    viewCta: "View invoice",
    reviewDraftCta: "Review & submit",
    confirmGenerateTitle: "Invoice paid ticket sales to Tikiti?",
    confirmGenerateBody:
      "We’ll build an invoice from verified paid tickets that aren’t on another invoice. You can review the document before submitting it for settlement.",
    confirmSubmitTitle: "Submit this invoice to Tikiti?",
    confirmSubmitBody:
      "Submitting marks this invoice as ready for Tikiti settlement review. Staff can then mark it paid or void. You can’t edit line items after submit.",
    submittedBanner:
      "This invoice is with Tikiti for settlement review. You’ll receive 100% of ticket face value — buyer-paid fees stay with Tikiti.",
    draftBanner: "Draft — review the figures, then submit when you’re ready for Tikiti to process settlement.",
    futureEvent:
      "Invoicing opens after the event starts. Generate from your dashboard once doors are open.",
    noPaidTickets:
      "No paid tickets to invoice yet. Free or unpaid check-ins don’t appear on settlement invoices.",
    alreadyInvoiced: "Paid ticket sales for this event are already on an invoice.",
    readyHint: "After the event starts, invoice paid sales from this card. Tikiti pays out 100% of face value.",
    listTitle: "Invoices to Tikiti",
    listSubtitle: "Settlement invoices from paid ticket sales — generate after your event starts, then submit for review.",
    emptyTitle: "No invoices yet",
    emptyBody:
      "When your event has started and people have bought tickets, generate an invoice from the event card on your dashboard, review it, then submit it to Tikiti.",
    statusDraft: "Draft",
    statusIssued: "Submitted",
    statusPaid: "Paid",
    statusVoid: "Void",
  },
  onboarding: {
    headline: "You’re live. That was the right call.",
    subhead: (eventTitle: string) =>
      `${eventTitle} is on ${BRAND.name} — paperless tickets, secure Paystack checkout, and door scanning when guests arrive.`,
    shareTitle: "Share your event",
    shareBody: "Send the link so people can buy tickets. Every sale shows up in your dashboard.",
    scannerTitle: `Install ${ORGANIZER_APP.name}`,
    scannerBody: ORGANIZER_APP.description,
    invoiceTitle: "How (and when) to invoice",
    invoiceBody:
      "After your event starts, open the dashboard, generate an invoice from paid ticket sales, review the document, and submit it to Tikiti for settlement. You get 100% of face value.",
    confidenceTitle: "You’re set up to run the door",
    confidenceItems: [
      "Paperless QR tickets — no stubs, no printers",
      "Paystack checkout in ZAR, with buyer-paid fees only",
      "Scan at the door with Tikiti Scanner on your phone",
    ] as const,
    goToDashboard: "Go to dashboard",
    viewEvent: "View public event page",
    emailSent: "We also emailed these next steps to you.",
    emailSkipped: "We’ll email these next steps once transactional email is configured.",
  },
  email: {
    subject: (eventTitle: string) => `You’re live on ${BRAND.name}: ${eventTitle}`,
    preview: "Scanner app, door check-in, and how to invoice after your event starts.",
  },
} as const;

export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return ORGANIZER_COPY.invoice.statusDraft;
    case "issued":
      return ORGANIZER_COPY.invoice.statusIssued;
    case "paid":
      return ORGANIZER_COPY.invoice.statusPaid;
    case "void":
      return ORGANIZER_COPY.invoice.statusVoid;
    default:
      return status;
  }
}
