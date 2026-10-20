import QRCode from "qrcode";
import { ORGANIZER_COPY } from "@/constants/organizerCopy";
import {
  computeBuyerServiceFeeTotalZar,
  roundZar,
} from "@/constants/pricing";
import { resolveBrevoSender } from "@/server/email/sendOrganizerWelcomeEmail";

const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Gmail and other clients strip data-URI images from HTML. Brevo `attachment`
 * entries are real MIME files, so the QR PNGs survive that sanitizer and still
 * open at the door without loading a remote image. My Tickets (`/dashboard`)
 * is linked as well; it only renders QR codes for a signed-in buyer whose
 * email matches the ticket, which guest checkout cannot do.
 */
const QR_PNG_OPTIONS = {
  type: "png" as const,
  errorCorrectionLevel: "H" as const,
  margin: 2,
  width: 512,
  color: { dark: "#1a1a1a", light: "#ffffff" },
};

export type TicketTypeEmbed =
  | { name?: string | null; price?: number | string | null }
  | { name?: string | null; price?: number | string | null }[]
  | null
  | undefined;

export type PurchaseConfirmationTicketInput = {
  typeName: string;
  attendeeName: string;
  unitPriceZar: number;
  qrCodeData: string;
};

export type PurchaseConfirmationAmounts = {
  faceValueZar: number;
  platformFeeZar: number;
  totalPaidZar: number;
};

export function formatPurchaseZar(amount: number): string {
  return `R${roundZar(amount).toFixed(2)}`;
}

/** Event timestamps are stored in UTC. Buyers read them in South African time. */
export function formatEventWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

/**
 * Face value comes from the ticket type, matching invoice line items.
 * Tickets minted without a type use the event price. Fees are applied later
 * with computeBuyerServiceFeeTotalZar — this function does not add a fee.
 */
export function resolveTicketFaceValue(
  ticketTypes: TicketTypeEmbed,
  eventPrice: number
): { typeName: string; unitPriceZar: number } {
  const row = Array.isArray(ticketTypes) ? ticketTypes[0] : ticketTypes;
  if (!row) {
    return { typeName: "General", unitPriceZar: Number(eventPrice) || 0 };
  }
  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "General";
  return { typeName: name, unitPriceZar: Number(row.price) || 0 };
}

export function purchaseConfirmationAmounts(unitPricesZar: number[]): PurchaseConfirmationAmounts {
  const prices = unitPricesZar.map((price) => Number(price) || 0);
  const faceValueZar = roundZar(prices.reduce((sum, price) => sum + price, 0));
  const platformFeeZar = computeBuyerServiceFeeTotalZar(prices);
  return {
    faceValueZar,
    platformFeeZar,
    totalPaidZar: roundZar(faceValueZar + platformFeeZar),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function buyerFirstName(fullName?: string): string | undefined {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || undefined;
}

function attachmentName(index: number, names: string[]): string {
  return names[index] || `ticket-${index + 1}.png`;
}

export function buildPurchaseConfirmationEmail(input: {
  eventTitle: string;
  eventWhen: string;
  venue: string;
  reference: string;
  buyerName?: string;
  dashboardUrl: string;
  tickets: { typeName: string; attendeeName: string; unitPriceZar: number }[];
  attachmentNames: string[];
}): { subject: string; html: string; text: string; amounts: PurchaseConfirmationAmounts } {
  const copy = ORGANIZER_COPY.email;
  const count = input.tickets.length;
  const ticketWord = count === 1 ? "ticket" : "tickets";
  const confirmed = count === 1 ? "is confirmed" : "are confirmed";
  const attached =
    count === 1
      ? `Your QR code is attached as ${attachmentName(0, input.attachmentNames)}.`
      : `Your QR codes are attached (${input.attachmentNames.join(", ")}).`;
  const firstName = buyerFirstName(input.buyerName);
  const hello = firstName ? `Hi ${firstName},` : "Hi,";
  const title = oneLine(input.eventTitle);
  const intro = `You're in. Your ${ticketWord} for ${title} ${confirmed}.`;
  const amounts = purchaseConfirmationAmounts(input.tickets.map((ticket) => ticket.unitPriceZar));
  const face = formatPurchaseZar(amounts.faceValueZar);
  const fee = formatPurchaseZar(amounts.platformFeeZar);
  const total = formatPurchaseZar(amounts.totalPaidZar);
  const feeNote = "The platform fee is paid by you. The organizer keeps the full ticket price.";
  const doorNote = `${attached} Show ${count === 1 ? "it" : "the matching code"} at the door.`;
  const dashboardNote = "They also show under My Tickets when you sign in with this email address.";

  const ticketLines = input.tickets.map((ticket, index) => {
    const file = attachmentName(index, input.attachmentNames);
    const label = `${ticket.typeName} — ${ticket.attendeeName} · ${formatPurchaseZar(ticket.unitPriceZar)}`;
    return { label, file };
  });

  const subject = `Your ${ticketWord} for ${title}`;
  const text = [
    hello,
    "",
    intro,
    "",
    input.eventWhen,
    input.venue,
    "",
    "Tickets",
    ...ticketLines.map((line, index) => `${index + 1}. ${line.label} (attached as ${line.file})`),
    "",
    `Ticket price: ${face}`,
    `Platform fee: ${fee}`,
    `Total paid: ${total}`,
    "",
    feeNote,
    "",
    `Payment reference: ${input.reference}`,
    "",
    doorNote,
    dashboardNote,
    input.dashboardUrl,
    "",
    copy.contact,
    "",
    copy.signoff,
    copy.signoffName,
    copy.site,
  ].join("\n");

  const items = ticketLines
    .map(
      (line) =>
        `<li>${escapeHtml(line.label)}<br />Attached as ${escapeHtml(line.file)}</li>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#111;background:#F0FDF4;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #dcfce7;">
    <p style="display:inline-block;background:#16A34A;color:#fff;border-radius:999px;padding:4px 12px;font-size:14px;font-weight:600;letter-spacing:-0.02em;">${escapeHtml(ORGANIZER_COPY.wordmark)}</p>
    <p>${escapeHtml(hello)}</p>
    <p>You're in. Your ${ticketWord} for <strong>${escapeHtml(title)}</strong> ${confirmed}.</p>
    <p><strong>${escapeHtml(input.eventWhen)}</strong><br />${escapeHtml(input.venue)}</p>
    <p><strong>Tickets</strong></p>
    <ol style="padding-left:20px;">${items}</ol>
    <p>Ticket price <strong>${escapeHtml(face)}</strong><br />Platform fee <strong>${escapeHtml(fee)}</strong><br />Total paid <strong>${escapeHtml(total)}</strong></p>
    <p>${escapeHtml(feeNote)}</p>
    <p>Payment reference <strong>${escapeHtml(input.reference)}</strong></p>
    <p>${escapeHtml(doorNote)} <a href="${escapeHtml(input.dashboardUrl)}" style="color:#15803d;font-weight:600;">My Tickets</a> shows them too when you sign in with this email.</p>
    <p>${escapeHtml(copy.contact)}</p>
    <p>${escapeHtml(copy.signoff)}<br />${escapeHtml(copy.signoffName)}<br /><a href="${escapeHtml(copy.site)}" style="color:#15803d;">${escapeHtml(copy.site)}</a></p>
  </div>
</body>
</html>`;

  return { subject, html, text, amounts };
}

export function renderTicketQrPng(qrCodeData: string): Promise<Buffer> {
  return QRCode.toBuffer(qrCodeData, QR_PNG_OPTIONS);
}

export type SendPurchaseConfirmationEmailInput = {
  to: string;
  reference: string;
  buyerName?: string;
  eventTitle: string;
  eventWhen: string;
  venue: string;
  dashboardUrl: string;
  tickets: PurchaseConfirmationTicketInput[];
  /**
   * Correlation only. Brevo's SMTP API has no idempotency-key header;
   * purchase_confirmation_emails is the dedupe.
   */
  idempotencyKey?: string;
};

export type PurchaseConfirmationAttachment = {
  name: string;
  content: string;
};

export type SendPurchaseConfirmationEmailResult =
  | { ok: true; id: string }
  | { ok: false; skipped: true; reason: "not_configured" | "no_recipient" }
  | { ok: false; skipped: false; reason: string; detail?: string };

type FetchLike = typeof fetch;
type RenderQr = (qrCodeData: string) => Promise<Buffer>;

export async function sendPurchaseConfirmationEmail(
  input: SendPurchaseConfirmationEmailInput,
  deps: { fetchImpl?: FetchLike; renderQr?: RenderQr } = {}
): Promise<SendPurchaseConfirmationEmailResult> {
  const to = input.to.trim();
  if (!to) {
    return { ok: false, skipped: true, reason: "no_recipient" };
  }
  if (input.tickets.length === 0) {
    return { ok: false, skipped: false, reason: "no_tickets" };
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  const renderQr = deps.renderQr ?? renderTicketQrPng;
  const attachments: PurchaseConfirmationAttachment[] = [];
  for (let index = 0; index < input.tickets.length; index += 1) {
    const ticket = input.tickets[index];
    const qrCodeData = ticket?.qrCodeData.trim() ?? "";
    if (!qrCodeData) {
      return { ok: false, skipped: false, reason: "qr_failed", detail: "missing_qr" };
    }
    try {
      const png = await renderQr(qrCodeData);
      attachments.push({
        name: `ticket-${index + 1}.png`,
        content: png.toString("base64"),
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : "qr_error";
      return { ok: false, skipped: false, reason: "qr_failed", detail };
    }
  }

  const sender = resolveBrevoSender();
  const payload = buildPurchaseConfirmationEmail({
    ...input,
    attachmentNames: attachments.map((file) => file.name),
  });
  const fetchImpl = deps.fetchImpl ?? fetch;

  try {
    const res = await fetchImpl(BREVO_SMTP_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject: payload.subject,
        htmlContent: payload.html,
        textContent: payload.text,
        attachment: attachments,
      }),
    });

    if (!res.ok) {
      const detail = await readErrorDetail(res);
      return { ok: false, skipped: false, reason: `brevo_http_${res.status}`, detail };
    }

    // A 2xx means Brevo accepted the message. A bad body must not be retried.
    try {
      const body = (await res.json()) as { messageId?: string };
      return { ok: true, id: body.messageId || "sent" };
    } catch {
      return { ok: true, id: "sent" };
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : "network_error";
    return { ok: false, skipped: false, reason: "network_error", detail };
  }
}

async function readErrorDetail(res: Response): Promise<string | undefined> {
  try {
    const text = (await res.text()).trim();
    return text ? text.slice(0, 300) : undefined;
  } catch {
    return undefined;
  }
}
