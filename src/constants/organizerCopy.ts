import type { EventInvoiceUi } from "@/server/invoices/invoiceEligibility";

/** Paste-ready organizer copy (ads-sbonelo). Tweak here — do not invent fee claims or payout SLAs. */
export const ORGANIZER_COPY = {
  wordmark: "tikiti.",
  invoice: {
    cardTitle: "Settlement invoice",
    cardHelper: "Request payout for ticket sales after your event has started.",
    generateCta: "Generate invoice",
    generateSettlementCta: "Generate settlement invoice",
    generatingCta: "Generating invoice…",
    submitCta: "Submit invoice",
    submittingCta: "Submitting…",
    downloadCta: "Download PDF",
    backCta: "Back",
    viewCta: "View invoice",
    grossLabel: "Gross face value",
    ticketsSoldLabel: "Tickets sold",
    buyerFeesLabel: "Buyer platform fees",
    buyerFeesHint: "Paid by buyers (not deducted)",
    youReceiveLabel: "You receive",
    youReceiveHint:
      "You’ll receive 100% of ticket face value. Buyer fees are separate and already collected at checkout.",
    payoutTitle: "Payout & legal details",
    payoutHint:
      "Prefill from your organizer profile. These appear on the invoice. Bank details are not collected here yet.",
    batchHelper:
      "Submit when the amounts look right. We’ll process settlements in batches per invoice (see FAQ for timing).",
    timingHelper: "How invoices work",
    timingFaqHref: "/faq#invoices",
    futureEvent: "Request payout for ticket sales after your event has started.",
    noPaidTickets: "Share your event link. Sales and check-ins will show up here.",
    alreadyInvoiced: "This invoice is read-only. Download a copy any time.",
    leftoverHint: "New paid sales can go on a separate invoice.",
    readyHint:
      "You’ll receive 100% of ticket face value. Buyer fees are separate and already collected at checkout.",
    draftHint: "Invoice draft created. Review and submit when you’re ready.",
    submittedSuccess: "Invoice submitted — we’ll handle settlement from here",
    submittedBanner: "Invoice submitted — we’ll handle settlement from here",
    alreadySubmittedHint: "This invoice is read-only. Download a copy any time.",
    emptyProfile: "Add these on your organizer profile — they print on the invoice.",
    confirmSubmit: "Submit this settlement invoice? You won’t be able to edit it after submitting.",
    confirmSubmitCta: "Submit invoice",
    listTitle: "Settlement invoice",
    listSubtitle: "Request payout for ticket sales after your event has started.",
    emptyTitle: "No invoices yet",
    emptyBody:
      "After your event starts, you can generate a settlement invoice from the dashboard to request payout.",
    statusReady: "Ready",
    statusDraft: "Draft",
    statusSubmitted: "Submitted",
    statusPaid: "Paid",
    statusVoid: "Void",
    statusDraftHelper: "Invoice draft created. Review and submit when you’re ready.",
    statusSubmittedHelper: "Invoice submitted — we’ll handle settlement from here",
    readyChip: "Ready to invoice",
  },
  onboarding: {
    headline: "You’re live",
    step1Title: "You’re live",
    step1Body: "Share your event link so people can buy.",
    shareEventCta: "Share event link",
    copyCta: "Copy",
    copiedCta: "Copied",
    step2Title: "Door day",
    step2Headline: "Your door team, in your pocket",
    step2Body:
      "Free on App Store & Google Play. Sign in with your organizer account and you’re ready at the door.",
    scannerTestHelper:
      "Test a scan before doors — Open Scanner and do a quick check so entry night is smooth.",
    getScannerCta: "Install Tikiti Scanner",
    laterCta: "I’ll do this later",
    step3Title: "Know how payouts work",
    step3Body:
      "You get 100% of ticket face value. Buyers pay the platform fee at checkout. After the event starts, generate a settlement invoice from your dashboard.",
    faceValueCallout: "100% of ticket face value",
    gotItCta: "Got it — go to my event",
    howInvoicesWork: "How invoices work",
    checklistTitle: "Get ready",
    checklistShare: "Share your event link",
    checklistShareHelper: "Copy the link from your event page and send it to your crowd.",
    checklistScanner: "Install Tikiti Scanner",
    checklistScannerHelper:
      "Free on App Store & Google Play. Sign in with your organizer account and you’re ready at the door.",
    checklistSettle: "Request settlement",
    checklistSettleHelper:
      "After the event starts, generate a settlement invoice from your dashboard.",
    checklistLocked: "Unlocks after the event starts",
    checklistDismiss: "Hide checklist",
  },
  toasts: {
    eventCreated: "Event created. You’re ready to sell paperless tickets.",
    linkCopied: "Link copied. Share it with your guests.",
    scannerTipSaved: "Scanner tip saved. Download the app before doors open.",
    invoiceDraftCreated: "Invoice draft created. Review and submit when you’re ready.",
  },
  empty: {
    noEvents: "List your first event — it’s free. Attendees get QR tickets; you scan at the door.",
    noTicketSales: "Share your event link. Sales and check-ins will show up here.",
    scannerNotConnected:
      "Install Tikiti Scanner and sign in with this account to validate tickets at the door.",
    noInvoices:
      "After your event starts, you can generate a settlement invoice from the dashboard to request payout.",
  },
  feesExplainer:
    "Organizers keep 100% of the ticket price. Tikiti’s fee is paid by the buyer at checkout (tiered by ticket price). Listing is free. Payouts are requested with a settlement invoice after the event starts — see FAQ for settlement details.",
  email: {
    subject: "Your event’s live on Tikiti — nice one",
    attendees:
      "Your attendees get secure digital QR tickets on their phones — no printing, less fraud, faster entry. At the door, check them in with the free Tikiti Scanner app (iPhone or Android). Sign in with the same organizer account you use on tikiti.fun.",
    nextStepsTitle: "Quick next steps",
    nextStepShare: "Share your event link so people can buy.",
    nextStepScanner: "Install Tikiti Scanner before doors open.",
    nextStepInvoice:
      "After your event starts, generate a settlement invoice from your dashboard when you’re ready to request payout.",
    greeting: "Hi {organizer_first_name},",
    intro: "You made the right call listing {event_name} on Tikiti.",
    reminder:
      "Reminder: you receive 100% of ticket face value. Buyers pay Tikiti’s fee at checkout — it’s not taken from your ticket price.",
    contact: "Questions? We’re here: info@tikiti.fun · +27 61 069 2364",
    signoffName: "The Tikiti team",
    signoff: "Go well,",
    site: "https://www.tikiti.fun",
  },
} as const;

export function interpolateOrganizerCopy(
  template: string,
  vars: { event_name?: string; organizer_first_name?: string }
): string {
  return template
    .replaceAll("{event_name}", vars.event_name ?? "")
    .replaceAll("{organizer_first_name}", vars.organizer_first_name ?? "");
}

export function organizerFirstName(fullName?: string): string | undefined {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || undefined;
}

export type OrganizerInvoicePill = "ready" | "draft" | "submitted" | "settled" | "void" | "not_ready";

export function invoiceStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return ORGANIZER_COPY.invoice.statusDraft;
    case "issued":
      return ORGANIZER_COPY.invoice.statusSubmitted;
    case "paid":
      return ORGANIZER_COPY.invoice.statusPaid;
    case "void":
      return ORGANIZER_COPY.invoice.statusVoid;
    default:
      return status;
  }
}

export function invoiceStatusHelper(status: string): string | null {
  switch (status) {
    case "draft":
      return ORGANIZER_COPY.invoice.statusDraftHelper;
    case "issued":
      return ORGANIZER_COPY.invoice.statusSubmittedHelper;
    default:
      return null;
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
      return ORGANIZER_COPY.invoice.statusPaid;
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
    question: "How do organizer payouts work?",
    answer: ORGANIZER_COPY.feesExplainer,
  },
  {
    question: "When can I request a settlement invoice?",
    answer: ORGANIZER_COPY.invoice.batchHelper,
  },
] as const;
