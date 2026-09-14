import { BRAND, ORGANIZER_APP } from "@/constants/branding";
import type { EventInvoiceUi } from "@/server/invoices/invoiceEligibility";

/** Organizer-facing copy. Swap strings here when ads-sbonelo lands. */
export const ORGANIZER_COPY = {
  wordmark: "tikiti.",
  invoice: {
    cardTitle: "Settlements",
    generateCta: "Generate invoice",
    generatingCta: "Generating invoice…",
    submitCta: "Submit for settlement",
    submittingCta: "Submitting…",
    downloadCta: "Download",
    backCta: "Back",
    viewCta: "View invoice",
    grossLabel: "Gross face value",
    ticketsSoldLabel: "Tickets sold",
    buyerFeesLabel: "Buyer platform fees",
    buyerFeesHint: "Paid by buyers (not deducted)",
    youReceiveLabel: "You receive",
    youReceiveHint: "100% of ticket face value",
    payoutTitle: "Payout & legal details",
    payoutHint:
      "Prefill from your organizer profile. These appear on the invoice. Bank details are not collected here yet.",
    batchHelper: "Settlements are batched per invoice.",
    timingHelper: "How invoices work",
    timingFaqHref: "/faq#invoices",
    notReadyHint: "Invoicing unlocks after the event starts, for paid tickets only.",
    futureEvent: "Not ready — invoicing opens after this event starts.",
    noPaidTickets: "Not ready — no paid tickets to settle yet.",
    alreadyInvoiced: "Already submitted — this event’s paid sales are on an invoice.",
    leftoverHint: "New paid sales can go on a separate invoice.",
    readyHint: "Ready to invoice paid sales. You receive 100% of face value.",
    draftHint: "Preview is ready. Submit when the figures look right.",
    submittedSuccess: "Invoice submitted — we’ll handle settlement from here",
    submittedBanner: "Submitted for settlement. You’ll receive 100% of ticket face value.",
    alreadySubmittedHint: "This invoice is read-only. Download a copy any time.",
    emptyProfile: "Add these on your organizer profile — they print on the invoice.",
    listTitle: "Settlements",
    listSubtitle: "Generate after your event starts, preview the invoice, then submit for settlement.",
    emptyTitle: "No invoices yet",
    emptyBody:
      "When an event has started and tickets are paid, open Settlements on the event card, generate a preview, then submit.",
    statusReady: "Ready",
    statusDraft: "Draft",
    statusSubmitted: "Submitted",
    statusSettled: "Settled",
    statusVoid: "Void",
    readyChip: "Ready to invoice",
  },
  onboarding: {
    headline: "You’re live",
    step1Title: "You’re live",
    step1Body: "Share your event link so people can buy paperless tickets.",
    shareEventCta: "Share event link",
    copyCta: "Copy",
    copiedCta: "Copied",
    step2Title: "Door day",
    step2Headline: "Your door team, in your pocket",
    step2Body: ORGANIZER_APP.description,
    getScannerCta: `Get ${ORGANIZER_APP.name}`,
    laterCta: "I’ll do this later",
    step3Title: "After the event",
    step3Body:
      "When the event has started, request settlement from Settlements on your dashboard. You receive 100% of ticket face value — buyer fees are paid by attendees, never deducted from your payout.",
    faceValueCallout: "100% of ticket face value",
    gotItCta: "Got it — go to my event",
    howInvoicesWork: "How invoices work",
    checklistTitle: "Get ready",
    checklistShare: "Share link",
    checklistScanner: "Download Scanner",
    checklistSettle: "Request settlement",
    checklistLocked: "Unlocks after the event starts",
    checklistDismiss: "Hide checklist",
  },
  email: {
    subject: (eventTitle: string) => `You’re live on ${BRAND.name}: ${eventTitle}`,
    preview: "Share your event link and get Tikiti Scanner for door day.",
  },
} as const;

export type OrganizerInvoicePill = "ready" | "draft" | "submitted" | "settled" | "void" | "not_ready";

export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return ORGANIZER_COPY.invoice.statusDraft;
    case "issued":
      return ORGANIZER_COPY.invoice.statusSubmitted;
    case "paid":
      return ORGANIZER_COPY.invoice.statusSettled;
    case "void":
      return ORGANIZER_COPY.invoice.statusVoid;
    default:
      return status;
  }
}

export function organizerInvoicePill(ui: EventInvoiceUi): OrganizerInvoicePill {
  const status = ui.latestActive?.status;
  if (status === "paid") return "settled";
  if (status === "issued") return "submitted";
  if (status === "draft" || ui.kind === "draft_pending_submit") return "draft";
  if (ui.kind === "ready_to_generate") return "ready";
  if (status === "void") return "void";
  return "not_ready";
}

export function organizerInvoicePillLabel(pill: OrganizerInvoicePill): string {
  switch (pill) {
    case "ready":
      return ORGANIZER_COPY.invoice.statusReady;
    case "draft":
      return ORGANIZER_COPY.invoice.statusDraft;
    case "submitted":
      return ORGANIZER_COPY.invoice.statusSubmitted;
    case "settled":
      return ORGANIZER_COPY.invoice.statusSettled;
    case "void":
      return ORGANIZER_COPY.invoice.statusVoid;
    case "not_ready":
      return "Not ready";
    default: {
      const _exhaustive: never = pill;
      return _exhaustive;
    }
  }
}

export type OrganizerPayoutProfile = {
  email: string;
  name: string;
  surname: string;
  companyName: string;
  cellphone: string;
};

export function payoutProfileFromMetadata(
  email: string | undefined,
  meta: Record<string, unknown> | null | undefined
): OrganizerPayoutProfile {
  return {
    email: email ?? "",
    name: typeof meta?.name === "string" ? meta.name : "",
    surname: typeof meta?.surname === "string" ? meta.surname : "",
    companyName: typeof meta?.company_name === "string" ? meta.company_name : "",
    cellphone: typeof meta?.cellphone === "string" ? meta.cellphone : "",
  };
}

export const INVOICE_FAQ_ITEMS = [
  {
    question: "How do organizer invoices work?",
    answer:
      "After your event starts, open Settlements on the dashboard, generate an invoice from paid tickets, preview the document, then submit for settlement. You receive 100% of ticket face value. Buyer platform fees are paid by attendees and are never deducted from your payout.",
  },
  {
    question: "When can I request settlement?",
    answer:
      "Invoicing unlocks after the scheduled event start, and only for paid tickets. Tikiti batches settlement per invoice. We don’t publish a payout calendar here — submit when you’re ready and we’ll handle settlement from there.",
  },
] as const;
